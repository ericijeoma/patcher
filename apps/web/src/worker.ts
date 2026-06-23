// Web Worker message types
export interface WorkerMessage {
  type: string
  data?: any
  traceId?: string
}

export interface AnalysisRequest {
  fileBuffer: ArrayBuffer
  fileName: string
  fileType: string
  traceId: string
}

export interface AnalysisProgress {
  progress: number
  status: string
  traceId: string
}

export interface AnalysisResult {
  success: boolean
  result?: any
  error?: string
  traceId: string
}

// Optional: Better typing for outgoing messages
export interface WorkerResponse {
  type: 'wasm_ready' | 'wasm_error' | 'progress' | 'analysis_complete' | 'analysis_error' | 'error'
  data: AnalysisProgress | AnalysisResult | { message?: string; error?: string }
  traceId?: string
}

// Initialize WASM module
let wasmModule: any = null
let wasmInitialized = false

async function initializeWASM() {
  if (wasmInitialized) return

  try {
    // Load WASM module
    const wasmResponse = await fetch('/engine.wasm')
    const wasmBytes = await wasmResponse.arrayBuffer()

    // Initialize WebAssembly module
    wasmModule = await WebAssembly.instantiate(wasmBytes, {
      env: {
        // Add any required imports here
        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
        // Add other imports as needed by your WASM module
      }
    })

    wasmInitialized = true
    postMessage({
      type: 'wasm_ready',
      data: { message: 'WASM module initialized successfully' }
    } satisfies WorkerResponse)

  } catch (error) {
    postMessage({
      type: 'wasm_error',
      data: { error: `Failed to initialize WASM: ${error instanceof Error ? error.message : String(error)}` }
    } satisfies WorkerResponse)
    throw error
  }
}

// Main worker message handler
self.onmessage = async function(e: MessageEvent<WorkerMessage>) {
  const message = e.data

  try {
    switch (message.type) {
      case 'initialize':
        await initializeWASM()
        break

      case 'analyze_file':
        await handleFileAnalysis(message.data as AnalysisRequest)
        break

      default:
        postMessage({
          type: 'error',
          data: { error: `Unknown message type: ${message.type}` },
          traceId: message.traceId
        } satisfies WorkerResponse)
    }
  } catch (error) {
    postMessage({
      type: 'error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      traceId: message.traceId
    } satisfies WorkerResponse)
  }
}

async function handleFileAnalysis(request: AnalysisRequest) {
  try {
    // Send progress updates - removed the faulty 'as AnalysisProgress' casts
    postMessage({
      type: 'progress',
      data: {
        progress: 10,
        status: 'Initializing analysis...',
        traceId: request.traceId
      }
    })

    // Initialize WASM if not already done
    if (!wasmInitialized) {
      await initializeWASM()
    }

    postMessage({
      type: 'progress',
      data: {
        progress: 20,
        status: 'Loading file into WASM memory...',
        traceId: request.traceId
      }
    })

    // ⚠️ Note: analyzeFileWithWASM is not defined in this file yet!
    // You will need to implement the actual WASM memory bridging here.
    // For now, I am stubbing it so TypeScript doesn't throw a ReferenceError.
    const analysisResult = await analyzeFileWithWASM(
      request.fileBuffer,
      request.fileName,
      request.fileType
    )

    postMessage({
      type: 'progress',
      data: {
        progress: 80,
        status: 'Generating analysis report...',
        traceId: request.traceId
      }
    })

    // ⚠️ Note: processAnalysisResult is also not defined yet!
    const processedResult = processAnalysisResult(analysisResult)

    postMessage({
      type: 'progress',
      data: {
        progress: 100,
        status: 'Analysis complete!',
        traceId: request.traceId
      }
    })

    // Send final result
    postMessage({
      type: 'analysis_complete',
      data: {
        success: true,
        result: processedResult,
        traceId: request.traceId
      }
    })

  } catch (error) {
    postMessage({
      type: 'analysis_error',
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        traceId: request.traceId
      }
    })
  }
}

function processAnalysisResult(rawResult: any) {
  // Process the raw WASM analysis result into a structured format
  return {
    riskScore: rawResult.risk_score || 0,
    verdict: rawResult.verdict || 'unknown',
    detectionNames: rawResult.detection_names || [],
    fileInfo: rawResult.file_info || {},
    strings: rawResult.strings || [],
    behavior: rawResult.behavior || {},
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      analysisVersion: '1.0.0'
    }
  }
}

// Mock WASM analysis function (replace with actual WASM calls)
async function analyzeFileWithWASM(fileBuffer: ArrayBuffer, fileName: string, fileType: string) {
  // This is a mock implementation - replace with actual WASM function calls
  console.log(`Analyzing ${fileName} (${fileType}) with WASM...`)

  // Simulate analysis based on file type
  if (fileName.includes('malware') || fileName.includes('virus')) {
    return {
      risk_score: 85,
      verdict: 'malicious',
      detection_names: ['Trojan.Generic', 'Backdoor.Agent'],
      file_info: {
        type: fileType,
        size: fileBuffer.byteLength,
        sections: ['.text', '.data', '.rdata']
      },
      strings: ['malicious_string_1', 'suspicious_api_call', 'http://evil.com'],
      behavior: {
        registry_modifications: ['HKCU\\Run\\malware'],
        network_connections: ['8.8.8.8:443']
      }
    }
  } else if (fileName.includes('clean') || fileName.includes('safe')) {
    return {
      risk_score: 5,
      verdict: 'clean',
      detection_names: [],
      file_info: {
        type: fileType,
        size: fileBuffer.byteLength
      },
      strings: ['normal_string', 'harmless_content'],
      behavior: {}
    }
  } else {
    return {
      risk_score: 45,
      verdict: 'suspicious',
      detection_names: ['Suspicious.Pattern'],
      file_info: {
        type: fileType,
        size: fileBuffer.byteLength
      },
      strings: ['suspicious_content', 'unusual_pattern'],
      behavior: {
        unusual_characteristics: ['Obfuscated code', 'Unusual section names']
      }
    }
  }
}

