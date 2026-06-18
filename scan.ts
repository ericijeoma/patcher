// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import 'dotenv/config';

import { analyze_binary_buffer } from './pkg/patcher.js'; 
import { TelemetrySanitizer } from './apps/web/src/utils/sanitizer.ts'; 

// 1. Separate the Base URL from the specific routes
const BASE_URL = "https://patcher.ericijeoma7767.workers.dev";
const TRIAGE_ROUTE = `${BASE_URL}/v1/analyze/triage`;
const DIAGNOSTICS_ROUTE = `${BASE_URL}/v1/diagnostics/engine-error`;


function withPanicCapture<T>(fn: () => T): { result?: T; panicMessage?: string } {
  let captured: string | undefined;
  const originalError = console.error;
  
  console.error = (...args: unknown[]) => {
    captured = args.map(String).join(' ');
    originalError(...args);
  };
  
  try {
    return { result: fn() };
  } catch {
    return { panicMessage: captured ?? 'Unknown WASM panic' };
  } finally {
    console.error = originalError;
  }
}

async function runEndToEndScan(targetFileName) {
  console.log(`\n=== Starting Hexis Production End-to-End Scan ===`);

  // 2. Generate the trace ID at the start of the scan lifecycle
  const traceId = crypto.randomUUID(); 

  const apiKey = process.env.HEXIS_API_KEY;
  if (!apiKey) {
    console.error(`\n❌ AUTHENTICATION REQUIRED`);
    console.error(`Provide your API Key via the environment:`);
    console.error(`PowerShell: $env:HEXIS_API_KEY="hxs_..." ; pnpm dlx tsx scan.ts ${targetFileName}\n`);
    process.exit(1);
  }

  const targetPath = path.resolve(process.cwd(), targetFileName);
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Target file not found: ${targetPath}`);
    process.exit(1);
  }

  console.log(`[1/4] Reading local binary: ${targetFileName}`);
  const fileBytes = fs.readFileSync(targetPath);
  const sizeMB = (fileBytes.length / 1024 / 1024).toFixed(2);
  console.log(`      File size: ${sizeMB} MB (binary data remains local ✓)`);

  const fileHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

  try {
    console.log(`[2/4] Executing local WASM static extraction...`);
    const uint8Array = new Uint8Array(fileBytes); 
    
    // 3. Move the panic capture INSIDE the scan, replacing the raw execution
    const { result: rawTelemetryString, panicMessage } = withPanicCapture(() =>
      analyze_binary_buffer(uint8Array)
    );

    // If Rust panics, send the pigeon to Sentry and kill the process
    if (panicMessage) {
      console.error(`\n❌ Engine Panicked. Sending secure diagnostic report...`);
      
      await fetch(DIAGNOSTICS_ROUTE, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Hexis-Trace-Id': traceId 
        },
        body: JSON.stringify({
          stage: 'wasm_analysis', 
          panic_message: panicMessage,
          engine_version: 'v1.0.0', 
          os: process.platform,
        }),
      });
      
      process.exit(1);
    }

    // If it didn't panic, continue normally
    const rawTelemetryJson = JSON.parse(rawTelemetryString);
    if (rawTelemetryJson.error) throw new Error(`WASM Engine Error: ${rawTelemetryJson.error}`);

    rawTelemetryJson.file_hash_sha256 = fileHash;

    console.log(`[3/4] Passing structural metadata through protection boundary...`);
    const safeTelemetry = TelemetrySanitizer.sanitize(rawTelemetryJson);
    console.log(`      ✅ Boundary validation passed. Structured payload is clean.`);

    console.log(`[4/4] Sending sanitized telemetry to cloud boundary for AI Triage...`);
    const response = await fetch(TRIAGE_ROUTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Filename': path.basename(targetFileName),
        'X-Hexis-Trace-Id': traceId // 4. Attach the trace ID to successful runs so Sentry can link them!
      },
      body: JSON.stringify(safeTelemetry)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Worker rejected request: ${response.status} - ${errorText}`);
    }

    const triageResult = await response.json();
    const cacheHeader = response.headers.get('X-Cache') || 'UNKNOWN';
    
    console.log(`\n══════════════════ DEVSTRAL TRIAGE REPORT [Cache: ${cacheHeader}] ══════════════════`);
    console.dir(triageResult, { depth: null, colors: true });
    console.log(`═════════════════════════════════════════════════════════════════════════════════\n`);
    
    if (triageResult.share_url) {
      console.log(`\n🔗 View Interactive Web Report: \x1b[36m${triageResult.share_url}\x1b[0m\n`);
    }

  } catch (error) {
    console.error(`\n❌ PIPELINE FAILURE:`, error.message);
    process.exitCode = 1;
  }
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.log("Usage: pnpm dlx tsx scan.ts <path-to-vulnerable-file>");
  process.exit(1);
}

runEndToEndScan(targetFile);
