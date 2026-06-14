#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const DEFAULT_WORKER_URL = 'http://localhost:8787';
const WASM_CACHE_DIR  = join(__dirname, '.wasm-cache');
const WASM_CACHE_PATH = join(WASM_CACHE_DIR, 'engine.wasm');

const [, , binaryPath, workerUrl = DEFAULT_WORKER_URL] = process.argv;

if (!binaryPath) {
  console.error('Usage: HEXIS_API_KEY=hxs_live_xxx node client/analyze.js <path-to-binary> [worker-url]');
  process.exit(1);
}

const resolvedBinaryPath = resolve(binaryPath);
if (!existsSync(resolvedBinaryPath)) {
  console.error(`Error: File not found: ${resolvedBinaryPath}`);
  process.exit(1);
}

// Read API key from environment variable
const apiKey = process.env.HEXIS_API_KEY;
if (!apiKey) {
  console.error('[error] HEXIS_API_KEY environment variable is not set.');
  console.error('        Get your key at https://hexis.dev/dashboard/keys');
  process.exit(1);
}

function loadCachedWasmBytes() {
  if (existsSync(WASM_CACHE_PATH)) {
    console.log('[cache] Using cached WASM engine');
    return readFileSync(WASM_CACHE_PATH);
  }
  return null;
}

function saveWasmToCache(buffer) {
  if (!existsSync(WASM_CACHE_DIR)) {
    mkdirSync(WASM_CACHE_DIR, { recursive: true });
  }
  writeFileSync(WASM_CACHE_PATH, Buffer.from(buffer));
  console.log(`[cache] Engine saved to ${WASM_CACHE_PATH}`);
}

async function main() {
  console.log(`[1/4] Reading binary: ${resolvedBinaryPath}`);
  const binaryBuffer = readFileSync(resolvedBinaryPath);
  const sizeMB = (binaryBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`      ${sizeMB} MB — will not be uploaded`);

  console.log('[2/4] Loading WASM engine...');
  let wasmBytes = loadCachedWasmBytes();

  if (!wasmBytes) {
    console.log(`      Cache miss — downloading from ${workerUrl}/v1/engine`);
    const res = await fetch(`${workerUrl}/v1/engine`);
    if (!res.ok) {
      throw new Error(`Failed to fetch WASM engine: HTTP ${res.status}`);
    }
    const arrayBuf = await res.arrayBuffer();
    saveWasmToCache(arrayBuf);
    wasmBytes = Buffer.from(arrayBuf);
  }

  console.log('[3/4] Running analysis locally...');
  const bindingsPath = join(PROJECT_ROOT, 'pkg-web', 'patcher.js');
  if (!existsSync(bindingsPath)) {
    throw new Error(`JS bindings not found at ${bindingsPath}`);
  }

  const { default: init, analyze_binary_buffer } = await import(`file://${bindingsPath}`);

  await init({ module_or_path: wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength) });

  const uint8Array = new Uint8Array(binaryBuffer.buffer, binaryBuffer.byteOffset, binaryBuffer.byteLength);
  const telemetryJson = analyze_binary_buffer(uint8Array);

  const parsed = JSON.parse(telemetryJson);
  if (parsed.error) throw new Error(`Analysis failed: ${parsed.error}`);

  const telemetryKB = (telemetryJson.length / 1024).toFixed(1);
  console.log(`      Done. Telemetry: ${telemetryKB} KB (binary stayed local ✓)`);

console.log(`[4/4] Requesting AI triage from ${workerUrl}/v1/analyze/triage`);
const triageRes = await fetch(`${workerUrl}/v1/analyze/triage`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-Filename': path.basename(resolvedBinaryPath),
  },
  body: telemetryJson,
});

  if (!triageRes.ok) {
    const body = await triageRes.text();
    throw new Error(`Triage failed: HTTP ${triageRes.status}\n${body}`);
  }

  const result = await triageRes.json();
  console.log('\n══════════════════ ANALYSIS RESULT ══════════════════');
  console.log(JSON.stringify(result, null, 2));
  console.log('═════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(`\n[fatal] ${err.message}`);
  process.exitCode = 1;
});
