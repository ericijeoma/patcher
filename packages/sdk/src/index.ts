import { join } from 'path';
import { homedir } from 'os';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Re-export telemetry types
export * from './telemetry';
export { HEX_ADDRESS_REGEX, SHA256_REGEX } from './telemetry';

export interface ScanResult {
  scanId: string;
  filename: string;
  status: 'critical' | 'high' | 'medium' | 'low';
  finding: {
    rootCause: string;
    compliance: {
      cwe: string;
      nist: string;
      owasp: string;
    };
  };
  mitigation: {
    immediate: string[];
    codeLevel: string[];
    longTerm: string[];
  };
  reportUrl: string;
  usage: {
    tokens: number;
  };
  scanTime: number; // milliseconds
}

export interface HexisOptions {
  apiKey: string;
  licenseKey?: string;
  baseUrl?: string;
}

export class Hexis {
  private apiKey: string;
  private licenseKey: string;
  private baseUrl: string;
  private wasmCache: string;

  constructor(options: HexisOptions) {
    this.apiKey = options.apiKey;
    this.licenseKey = options.licenseKey || options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://worker.hexis.dev';
    this.wasmCache = join(homedir(), '.hexis', 'engine.wasm');
  }

  private async ensureWasmCache(): Promise<Uint8Array> {
    // Check if cached WASM exists
    if (existsSync(this.wasmCache)) {
      try {
        const wasmBuffer = await readFile(this.wasmCache);
        return new Uint8Array(wasmBuffer);
      } catch (err) {
        console.warn('Failed to read cached WASM, will download:', err);
      }
    }

    // Download WASM from server
    const response = await fetch(`${this.baseUrl}/v1/engine`);
    if (!response.ok) {
      throw new Error(`Failed to download WASM engine: ${response.status}`);
    }

    const wasmBytes = await response.arrayBuffer();
    const uint8Array = new Uint8Array(wasmBytes);

    // Cache the WASM for future use
    try {
      await mkdir(join(homedir(), '.hexis'), { recursive: true });
      await writeFile(this.wasmCache, Buffer.from(uint8Array));
    } catch (err) {
      console.warn('Failed to cache WASM:', err);
    }

    return uint8Array;
  }

  /**
   * Set or update the license key for WASM engine validation
   */
  setLicenseKey(licenseKey: string): void {
    this.licenseKey = licenseKey;
  }

  /**
   * Get the current license key
   */
  getLicenseKey(): string {
    return this.licenseKey;
  }

  async scan(filePath: string, options?: { name?: string; licenseKey?: string }): Promise<ScanResult> {
    const startTime = Date.now();

    // Use provided license key or fallback to constructor option
    const effectiveLicenseKey = options?.licenseKey || this.licenseKey;

    // 1. Resolve and read file
    const fileBuffer = await readFile(filePath);
    const filename = options?.name ?? filePath.split('/').pop() ?? 'unknown';

    // 2. Load WASM
    const wasmBytes = await this.ensureWasmCache();

    // 3. Import and initialize WASM module
    const { analyze_binary_buffer, set_license_key } = await import(
      /* @vite-ignore */ `${this.baseUrl}/v1/engine.js`
    );

    // Set the license key for WASM engine validation
    if (effectiveLicenseKey) {
      set_license_key(effectiveLicenseKey);
    }

    // Initialize WASM (this would be the actual WASM initialization)
    // For now, we'll simulate this since we can't actually import WASM in Node.js
    const analyzeBuffer = analyze_binary_buffer;

    // 4. Run analysis locally
    const uint8Array = new Uint8Array(fileBuffer);
    const telemetryJson = analyzeBuffer(uint8Array);
    const telemetry = JSON.parse(telemetryJson);

    // 5. POST telemetry to Hexis Worker
    const triageResponse = await fetch(`${this.baseUrl}/v1/analyze/triage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Filename': filename,
      },
      body: telemetryJson,
    });

    if (!triageResponse.ok) {
      const errorData = await triageResponse.json();
      throw new Error(errorData.error || 'Triage failed');
    }

    const resultData = await triageResponse.json();
    const scanTime = Date.now() - startTime;

    // 6. Return normalized result
    return {
      scanId: resultData.id,
      filename,
      status: resultData.choices[0].message.content.status,
      finding: {
        rootCause: resultData.choices[0].message.content.root_cause_mechanism,
        compliance: {
          cwe: resultData.choices[0].message.content.compliance?.cwe || 'N/A',
          nist: resultData.choices[0].message.content.compliance?.nist || 'N/A',
          owasp: resultData.choices[0].message.content.compliance?.owasp || 'N/A',
        },
      },
      mitigation: {
        immediate: resultData.choices[0].message.content.mitigation_strategy.immediate || [],
        codeLevel: resultData.choices[0].message.content.mitigation_strategy.code_level || [],
        longTerm: resultData.choices[0].message.content.mitigation_strategy.long_term || [],
      },
      reportUrl: resultData.report_url || '',
      usage: {
        tokens: resultData.usage?.completion_tokens || 0,
      },
      scanTime,
    };
  }
}
