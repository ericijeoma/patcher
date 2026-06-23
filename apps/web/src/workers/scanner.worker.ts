import init, { analyze_binary_buffer } from '../pkg-web/patcher.js'
import { TelemetrySanitizer } from '../utils/sanitizer'

type InitMessage = { type: 'INIT' }
type ScanMessage = {
  type: 'SCAN'
  payload: {
    fileBuffer: ArrayBuffer
    fileName: string
    traceId: string
    apiKey: string
  }
}

type IncomingMessage = InitMessage | ScanMessage

type WorkerResponse =
  | { type: 'READY' }
  | { type: 'ERROR'; message: string; traceId?: string }
  | { type: 'PROGRESS'; status: string; progress: number; traceId?: string }
  | { type: 'RESULT'; telemetry: any; traceId: string }

const BASE_URL = 'https://patcher.ericijeoma7767.workers.dev'
const TRIAGE_ROUTE = `${BASE_URL}/v1/analyze/triage`
const DIAGNOSTICS_ROUTE = `${BASE_URL}/v1/diagnostics/engine-error`

let wasmInitialized = false

function log(...args: unknown[]) {
  console.log('[WORKER]', ...args)
}

function postProgress(status: string, progress: number, traceId: string) {
  self.postMessage({
    type: 'PROGRESS',
    status,
    progress,
    traceId,
  } satisfies WorkerResponse)
}

async function initializeWASM() {
  if (wasmInitialized) {
    log('WASM already initialized')
    return
  }

  log('Initializing WASM module...')
  await init()
  wasmInitialized = true
  log('WASM initialized successfully')

  self.postMessage({
    type: 'READY',
  } satisfies WorkerResponse)
}

async function sha256(buffer: ArrayBuffer) {
  log('Computing SHA-256 for buffer bytes:', buffer.byteLength)

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  log('SHA-256 computed:', hex)
  return hex
}

function normalizeVerdict(riskLevel?: string) {
  const level = String(riskLevel || '').toLowerCase()
  if (level === 'high') return 'malicious'
  if (level === 'medium') return 'suspicious'
  if (level === 'low') return 'clean'
  return 'unknown'
}

function normalizeRiskScore(riskLevel?: string) {
  const level = String(riskLevel || '').toLowerCase()
  if (level === 'high') return 90
  if (level === 'medium') return 55
  if (level === 'low') return 10
  return 0
}

function normalizeDetectionNames(triageResult: any) {
  const detections: string[] = []

  if (triageResult?.root_cause_mechanism) {
    detections.push(triageResult.root_cause_mechanism)
  }

  if (Array.isArray(triageResult?.remediation_patches)) {
    for (const patch of triageResult.remediation_patches) {
      if (patch?.issue) detections.push(patch.issue)
    }
  }

  return Array.from(new Set(detections))
}

function inferFormat(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.exe')) return 'PE'
  if (lower.endsWith('.dll')) return 'PE'
  if (lower.endsWith('.sys')) return 'PE'
  if (lower.endsWith('.elf')) return 'ELF'
  if (lower.endsWith('.so')) return 'ELF'
  if (lower.endsWith('.pdf')) return 'PDF'
  if (lower.endsWith('.zip')) return 'ZIP'
  return 'UNKNOWN'
}

function makeHexAddress(value: number) {
  return `0x${value.toString(16).toUpperCase()}`
}

function normalizeTelemetryShape(rawTelemetryJson: any, fileName: string, fileHash: string) {
  // The browser WASM currently returns an array of anomalies.
  // Convert that into the full telemetry shape expected by TelemetrySanitizer.
  if (Array.isArray(rawTelemetryJson)) {
    const anomalies = rawTelemetryJson

    return {
      file_hash_sha256: fileHash,
      architecture: 'UNKNOWN',
      format: inferFormat(fileName),
      virtual_base_address: '0x0',
      total_instructions_decoded: anomalies.length,
      basic_blocks_mapped: 0,
      vulnerabilities_found: anomalies.length,
      structural_mitigations: [] as string[],
      audited_symbols: [] as string[],
      assembly_slices: anomalies.map((item: any, index: number) => ({
        address: typeof item?.offset === 'string' ? item.offset : makeHexAddress(index * 0x10),
        instructions: [
          typeof item?.desc === 'string'
            ? item.desc
            : typeof item?.type === 'string'
              ? item.type
              : 'anomaly',
        ],
        anomaly_type: typeof item?.type === 'string' ? item.type : 'Anomaly',
        confidence: 1,
      })),
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        engine_version: 'browser-worker',
      },
    }
  }

  // If the engine ever returns a proper object, preserve it and fill any missing required fields.
  return {
    file_hash_sha256: fileHash,
    architecture: rawTelemetryJson.architecture ?? 'UNKNOWN',
    format: rawTelemetryJson.format ?? inferFormat(fileName),
    virtual_base_address: rawTelemetryJson.virtual_base_address ?? '0x0',
    total_instructions_decoded: rawTelemetryJson.total_instructions_decoded ?? 0,
    basic_blocks_mapped: rawTelemetryJson.basic_blocks_mapped ?? 0,
    vulnerabilities_found: rawTelemetryJson.vulnerabilities_found ?? 0,
    structural_mitigations: rawTelemetryJson.structural_mitigations ?? [],
    audited_symbols: rawTelemetryJson.audited_symbols ?? [],
    assembly_slices: rawTelemetryJson.assembly_slices ?? [],
    metadata: rawTelemetryJson.metadata ?? {
      analysis_timestamp: new Date().toISOString(),
      engine_version: 'browser-worker',
    },
  }
}

async function handleFileAnalysis(request: ScanMessage['payload']) {
  try {
    log('SCAN received:', {
      fileName: request.fileName,
      traceId: request.traceId,
      fileBytes: request.fileBuffer.byteLength,
      apiKeyPresent: Boolean(request.apiKey),
    })

    postProgress('Initializing analysis...', 10, request.traceId)

    if (!wasmInitialized) {
      log('WASM not initialized yet; initializing now...')
      await initializeWASM()
    }

    postProgress('Loading file into WASM memory...', 20, request.traceId)

    const uint8Array = new Uint8Array(request.fileBuffer)
    log('Created Uint8Array:', {
      length: uint8Array.length,
      firstBytes: Array.from(uint8Array.slice(0, 16)),
    })

    postProgress('Executing Rust WASM extraction...', 35, request.traceId)

    let rawTelemetryString: string
    try {
      log('Calling analyze_binary_buffer(...)')
      rawTelemetryString = analyze_binary_buffer(uint8Array)
      log('WASM returned raw telemetry string:', rawTelemetryString)
    } catch (error) {
      log('analyze_binary_buffer threw:', error)

      await fetch(DIAGNOSTICS_ROUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hexis-Trace-Id': request.traceId,
        },
        body: JSON.stringify({
          stage: 'browser_wasm_analysis',
          panic_message: error instanceof Error ? error.message : String(error),
          engine_version: 'v1.0.0',
          os: navigator.userAgent,
        }),
      })

      throw error
    }

    postProgress('Processing telemetry...', 50, request.traceId)

    let rawTelemetryJson: any
    try {
      rawTelemetryJson = JSON.parse(rawTelemetryString)
      log('Parsed raw telemetry JSON:', rawTelemetryJson)
    } catch (error) {
      log('Failed to parse raw telemetry JSON:', error)
      throw new Error(
        `WASM returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (rawTelemetryJson?.error) {
      log('WASM returned error field:', rawTelemetryJson.error)
      throw new Error(`WASM Engine Error: ${rawTelemetryJson.error}`)
    }

    const fileHash = await sha256(request.fileBuffer)

    const normalizedTelemetry = normalizeTelemetryShape(
      rawTelemetryJson,
      request.fileName,
      fileHash
    )

    log('Normalized telemetry before sanitize:', normalizedTelemetry)

    let safeTelemetry: any
    try {
      safeTelemetry = TelemetrySanitizer.sanitize(normalizedTelemetry)
      log('Telemetry after sanitize:', safeTelemetry)
    } catch (error) {
      log('TelemetrySanitizer.sanitize threw:', error)
      throw error
    }

    if (!safeTelemetry.file_hash_sha256) {
      log('Sanitizer removed file_hash_sha256')
      throw new Error('SANITIZER REMOVED file_hash_sha256')
    }

    postProgress('Sending telemetry to triage engine...', 70, request.traceId)

    log('Sending request to triage endpoint:', TRIAGE_ROUTE)
    const response = await fetch(TRIAGE_ROUTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
        'X-Filename': request.fileName,
        'X-Hexis-Trace-Id': request.traceId,
      },
      body: JSON.stringify(safeTelemetry),
    })

    log('Triage response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      xCache: response.headers.get('x-cache'),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('Triage error body:', errorText)
      throw new Error(`Worker rejected request: ${response.status} - ${errorText}`)
    }

    const triageResult = await response.json()
    log('Triage JSON result:', triageResult)

    postProgress('Analysis complete!', 100, request.traceId)

    const telemetry = {
      result: {
        verdict: normalizeVerdict(triageResult?.risk_level),
        riskScore: normalizeRiskScore(triageResult?.risk_level),
        detectionNames: normalizeDetectionNames(triageResult),
        triage: triageResult,
        rawTelemetry: safeTelemetry,
      },
    }

    log('Posting RESULT payload:', telemetry)

    self.postMessage({
      type: 'RESULT',
      telemetry,
      traceId: request.traceId,
    } satisfies WorkerResponse)
  } catch (error) {
    log('handleFileAnalysis failed:', error)

    self.postMessage({
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Analysis failed',
      traceId: request.traceId,
    } satisfies WorkerResponse)
  }
}

self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
  const message = e.data
  log('Incoming message:', message)

  try {
    switch (message.type) {
      case 'INIT':
        await initializeWASM()
        break

      case 'SCAN':
        await handleFileAnalysis(message.payload)
        break

      default:
        log('Unknown message type:', (message as any).type)
        self.postMessage({
          type: 'ERROR',
          message: `Unknown message type: ${(message as any).type}`,
        } satisfies WorkerResponse)
    }
  } catch (error) {
    log('Worker top-level error:', error)
    self.postMessage({
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown worker error',
      traceId: (message as any).payload?.traceId,
    } satisfies WorkerResponse)
  }
}
