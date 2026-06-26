// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID, createHash } from 'node:crypto';
import 'dotenv/config';
import { analyze_binary_buffer, set_license_key } from './pkg/patcher.js';
import { TelemetrySanitizer } from './apps/web/src/utils/sanitizer.ts';

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
  try { return { result: fn() }; } 
  catch { return { panicMessage: captured ?? 'Unknown WASM panic' }; } 
  finally { console.error = originalError; }
}

// Recursively find all .exe files in a target directory
function findBinaries(dir: string, extension: string = '.exe'): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  const stat = fs.statSync(dir);
  if (stat.isFile() && dir.endsWith(extension)) return [dir];

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const fileStat = fs.statSync(filePath);
    if (fileStat && fileStat.isDirectory()) {
      results = results.concat(findBinaries(filePath, extension));
    } else if (filePath.endsWith(extension)) {
      results.push(filePath);
    }
  });
  return results;
}

// The exact same Smart Assessment Logic we built for the Frontend
function getSmartRiskAssessment(payload: any, failOnThreshold: string) {
  const triage = payload?.triage || {};
  const rawTelemetry = payload?.rawTelemetry || {};
  const rawScore = payload?.riskScore || 0;
  const verdict = (triage.risk_level || payload?.verdict || "unknown").toLowerCase();
  const vulnerabilities = rawTelemetry.vulnerabilities_found || 0;

  let badgeText = "CLEAN";
  let badgeIcon = "🟢";
  let severityWeight = 0;

  if (["critical", "high", "malicious"].includes(verdict)) {
    badgeText = verdict.toUpperCase();
    badgeIcon = "🔴";
    severityWeight = 3;
  } else if (vulnerabilities > 0 || ["suspicious", "medium"].includes(verdict)) {
    badgeText = vulnerabilities > 0 ? "SUSPICIOUS" : verdict.toUpperCase();
    badgeIcon = "🟡";
    severityWeight = 2;
  } else if (verdict === "unknown" && vulnerabilities === 0) {
    badgeText = "UNKNOWN";
    badgeIcon = "⚪";
    severityWeight = 1;
  }

  // Threshold gating logic
  const thresholdMap: Record<string, number> = { 'critical': 3, 'high': 3, 'suspicious': 2, 'medium': 2, 'all': 1, 'none': 0 };
  const userThreshold = thresholdMap[failOnThreshold.toLowerCase()] || 3; 

  return {
    badgeText,
    badgeIcon,
    displayScore: rawScore > 0 ? rawScore : (severityWeight === 3 ? 90 : (severityWeight === 2 ? 50 : 0)),
    vulnerabilities,
    shareUrl: triage.shareUrl || triage.share_url || "",
    isFailure: severityWeight >= userThreshold
  };
}

async function runCiPipeline() {
  console.log(`\n🛡️ === Hexis CI/CD Zero-Trust Pipeline Initiated === 🛡️\n`);

  // 1. Parse GitHub Actions Inputs
  const targetPath = process.env.INPUT_PATH || process.argv[2] || './build';
  const failOnThreshold = process.env.INPUT_FAIL_ON || 'high';
  const apiKey = process.env.HEXIS_API_KEY || process.env.INPUT_API_KEY;
  const licenseKey = process.env.HEXIS_LICENSE_KEY || process.env.HEXIS_API_KEY;

  if (!apiKey) {
    console.error(`❌ FATAL: Missing HEXIS_API_KEY environment variable.`);
    process.exit(1);
  }

  // Set the license key for WASM engine validation
  if (licenseKey) {
    try {
      set_license_key(licenseKey);
      console.log(`      ✅ License key set for local engine`);
    } catch (e) {
      console.error(`\n❌ LICENSE VALIDATION FAILED: ${e}`);
      process.exit(1);
    }
  } else {
    console.error(`\n❌ LICENSE KEY REQUIRED`);
    console.error(`Provide your License Key via HEXIS_LICENSE_KEY environment variable`);
    process.exit(1);
  }

  const binaries = findBinaries(path.resolve(process.cwd(), targetPath));
  if (binaries.length === 0) {
    console.log(`✅ No compiled binaries found in ${targetPath}. Skipping scan.`);
    process.exit(0);
  }

  console.log(`🔎 Found ${binaries.length} binaries to scan. Target threshold: [FAIL ON ${failOnThreshold.toUpperCase()}]\n`);

  // Initialize GitHub Step Summary Markdown
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, `# Hexis Binary Scan Results 🛡️\n\n`);
    fs.appendFileSync(summaryPath, `| File | Status | Risk Score | Issues | Report |\n`);
    fs.appendFileSync(summaryPath, `|---|---|---|---|---|\n`);
  }

  let pipelineFailed = false;

  // Process all files sequentially
  for (const filePath of binaries) {
    const fileName = path.basename(filePath);
    const traceId = randomUUID();
    console.log(`⏳ Scanning ${fileName}... (Trace: ${traceId.substring(0,8)})`);

    const fileBytes = fs.readFileSync(filePath);
    const fileHash = createHash('sha256').update(fileBytes).digest('hex');
    const uint8Array = new Uint8Array(fileBytes);

    try {
      // Execute WASM
      const { result: rawTelemetryString, panicMessage } = withPanicCapture(() => analyze_binary_buffer(uint8Array));

      if (panicMessage) {
        console.error(`❌ Engine Panicked on ${fileName}`);
        pipelineFailed = true;
        if (summaryPath) fs.appendFileSync(summaryPath, `| \`${fileName}\` | ⚠️ ENGINE ERROR | N/A | N/A | Engine Panic |\n`);
        continue;
      }

      const rawTelemetryJson = JSON.parse(rawTelemetryString);
      rawTelemetryJson.file_hash_sha256 = fileHash;
      const safeTelemetry = TelemetrySanitizer.sanitize(rawTelemetryJson);

      // Send to API
      const response = await fetch(TRIAGE_ROUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Filename': fileName,
          'X-Hexis-Trace-Id': traceId
        },
        body: JSON.stringify(safeTelemetry)
      });

      if (!response.ok) throw new Error(`API Rejected: ${response.status}`);
      
      const payload = await response.json();
      const assessment = getSmartRiskAssessment(payload.result, failOnThreshold);

      // Write to console
      console.log(`   └─ Verdict: ${assessment.badgeIcon} ${assessment.badgeText} (${assessment.displayScore}/100) - ${assessment.vulnerabilities} Issues found.`);
      if (assessment.isFailure) {
        console.log(`   └─ 🚨 THRESHOLD CROSSED. Mark for pipeline failure.`);
        pipelineFailed = true;
      }

      // Write to GitHub Markdown Summary
      if (summaryPath) {
        const reportLink = assessment.shareUrl ? `[View Triage](${assessment.shareUrl})` : "N/A";
        fs.appendFileSync(summaryPath, `| \`${fileName}\` | ${assessment.badgeIcon} **${assessment.badgeText}** | ${assessment.displayScore}/100 | ${assessment.vulnerabilities} | ${reportLink} |\n`);
      }

    } catch (error) {
      console.error(`❌ Network/Processing Failure on ${fileName}: ${error.message}`);
      pipelineFailed = true;
    }
  }

  console.log(`\n═════════════════════════════════════════════════════════════════`);
  if (pipelineFailed) {
    console.error(`❌ PIPELINE BLOCKED: Hexis detected vulnerabilities crossing the accepted threshold.`);
    process.exit(1); // THIS physically fails the GitHub Action build step!
  } else {
    console.log(`✅ PIPELINE PASSED: All binaries are within accepted security thresholds.`);
    process.exit(0);
  }
}

runCiPipeline();
