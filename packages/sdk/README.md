# @hexis/sdk

The official Hexis SDK for Node.js applications.

## Installation

```bash
pnpm add @hexis/sdk
```

## Usage

```javascript
import { Hexis } from '@hexis/sdk'

const hexis = new Hexis({ apiKey: 'hxs_live_...' })
const result = await hexis.scan('./dist/myapp.exe')

console.log(result.status)        // 'critical'
console.log(result.finding.rootCause)
console.log(result.reportUrl)     // shareable link
```

## API

### `Hexis` class

#### Constructor

```typescript
new Hexis(options: {
  apiKey: string;
  baseUrl?: string; // Default: 'https://worker.hexis.dev'
})
```

#### `scan(filePath, options?)`

Scans a binary file and returns a risk analysis report.

**Parameters:**
- `filePath`: Path to the binary file to scan
- `options.name`: Optional custom filename for the scan

**Returns:** `Promise<ScanResult>`

**Example:**
```javascript
const result = await hexis.scan('./build/app.exe', {
  name: 'production-build.exe'
});
```

### `ScanResult` interface

```typescript
interface ScanResult {
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
```

## Privacy Guarantee

Your binary never leaves your machine. Only 1KB of telemetry is sent to Hexis servers for AI triage. The WASM engine runs entirely locally on your machine.
