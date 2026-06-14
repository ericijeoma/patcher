// src/index.ts
import { join } from "path";
import { homedir } from "os";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
var Hexis = class {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://worker.hexis.dev";
    this.wasmCache = join(homedir(), ".hexis", "engine.wasm");
  }
  async ensureWasmCache() {
    if (existsSync(this.wasmCache)) {
      try {
        const wasmBuffer = await readFile(this.wasmCache);
        return new Uint8Array(wasmBuffer);
      } catch (err) {
        console.warn("Failed to read cached WASM, will download:", err);
      }
    }
    const response = await fetch(`${this.baseUrl}/v1/engine`);
    if (!response.ok) {
      throw new Error(`Failed to download WASM engine: ${response.status}`);
    }
    const wasmBytes = await response.arrayBuffer();
    const uint8Array = new Uint8Array(wasmBytes);
    try {
      await mkdir(join(homedir(), ".hexis"), { recursive: true });
      await writeFile(this.wasmCache, Buffer.from(uint8Array));
    } catch (err) {
      console.warn("Failed to cache WASM:", err);
    }
    return uint8Array;
  }
  async scan(filePath, options) {
    const startTime = Date.now();
    const fileBuffer = await readFile(filePath);
    const filename = options?.name ?? filePath.split("/").pop() ?? "unknown";
    const wasmBytes = await this.ensureWasmCache();
    const { analyze_binary_buffer } = await import(
      /* @vite-ignore */
      `${this.baseUrl}/v1/engine.js`
    );
    const analyzeBuffer = analyze_binary_buffer;
    const uint8Array = new Uint8Array(fileBuffer);
    const telemetryJson = analyzeBuffer(uint8Array);
    const telemetry = JSON.parse(telemetryJson);
    const triageResponse = await fetch(`${this.baseUrl}/v1/analyze/triage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Filename": filename
      },
      body: telemetryJson
    });
    if (!triageResponse.ok) {
      const errorData = await triageResponse.json();
      throw new Error(errorData.error || "Triage failed");
    }
    const resultData = await triageResponse.json();
    const scanTime = Date.now() - startTime;
    return {
      scanId: resultData.id,
      filename,
      status: resultData.choices[0].message.content.status,
      finding: {
        rootCause: resultData.choices[0].message.content.root_cause_mechanism,
        compliance: {
          cwe: resultData.choices[0].message.content.compliance?.cwe || "N/A",
          nist: resultData.choices[0].message.content.compliance?.nist || "N/A",
          owasp: resultData.choices[0].message.content.compliance?.owasp || "N/A"
        }
      },
      mitigation: {
        immediate: resultData.choices[0].message.content.mitigation_strategy.immediate || [],
        codeLevel: resultData.choices[0].message.content.mitigation_strategy.code_level || [],
        longTerm: resultData.choices[0].message.content.mitigation_strategy.long_term || []
      },
      reportUrl: resultData.report_url || "",
      usage: {
        tokens: resultData.usage?.completion_tokens || 0
      },
      scanTime
    };
  }
};
export {
  Hexis
};
