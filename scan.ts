// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import 'dotenv/config';

import { analyze_binary_buffer } from './pkg/patcher.js'; 
import { TelemetrySanitizer } from './apps/web/src/utils/sanitizer.ts'; 

const WORKER_URL = "https://patcher.ericijeoma7767.workers.dev/v1/analyze/triage";

async function runEndToEndScan(targetFileName) {
  console.log(`\n=== Starting Hexis Production End-to-End Scan ===`);

  // 1. Enforce strict environment variables for security
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
    const rawTelemetryString = analyze_binary_buffer(uint8Array);
    
    const rawTelemetryJson = JSON.parse(rawTelemetryString);
    if (rawTelemetryJson.error) throw new Error(`WASM Engine Error: ${rawTelemetryJson.error}`);

    rawTelemetryJson.file_hash_sha256 = fileHash;

    console.log(`[3/4] Passing structural metadata through protection boundary...`);
    const safeTelemetry = TelemetrySanitizer.sanitize(rawTelemetryJson);
    console.log(`      ✅ Boundary validation passed. Structured payload is clean.`);

    console.log(`[4/4] Sending sanitized telemetry to cloud boundary for AI Triage...`);
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Standard, production-grade Bearer Auth
        'X-Filename': path.basename(targetFileName) 
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
    
    // The worker now returns the structured report directly, so we just log it!
    console.dir(triageResult, { depth: null, colors: true });
    
    console.log(`═════════════════════════════════════════════════════════════════════════════════\n`);
    // 🚀 NEW: Highlight the Phase 5 Shareable Link so it is clickable in the terminal
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
