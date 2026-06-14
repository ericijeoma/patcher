"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Hexis: () => Hexis
});
module.exports = __toCommonJS(index_exports);
var import_path = require("path");
var import_os = require("os");
var import_promises = require("fs/promises");
var import_fs = require("fs");
var Hexis = class {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://worker.hexis.dev";
    this.wasmCache = (0, import_path.join)((0, import_os.homedir)(), ".hexis", "engine.wasm");
  }
  async ensureWasmCache() {
    if ((0, import_fs.existsSync)(this.wasmCache)) {
      try {
        const wasmBuffer = await (0, import_promises.readFile)(this.wasmCache);
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
      await (0, import_promises.mkdir)((0, import_path.join)((0, import_os.homedir)(), ".hexis"), { recursive: true });
      await (0, import_promises.writeFile)(this.wasmCache, Buffer.from(uint8Array));
    } catch (err) {
      console.warn("Failed to cache WASM:", err);
    }
    return uint8Array;
  }
  async scan(filePath, options) {
    const startTime = Date.now();
    const fileBuffer = await (0, import_promises.readFile)(filePath);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Hexis
});
