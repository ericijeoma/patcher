# Hexis Native Python SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Rust](https://img.shields.io/badge/rust-1.70+-orange.svg)](https://www.rust-lang.org/)

**Hexis Native** is a Python SDK that provides access to the Hexis zero-trust binary security platform's Rust analysis engine. It enables developers to perform static analysis on binaries directly from Python, with full cryptographic paywall enforcement.

## Features

- ✅ **Zero-Trust Architecture**: All analysis happens locally on your machine
- ✅ **Cryptographic Paywall**: Ed25519-signed license keys prevent unauthorized usage
- ✅ **High-Performance**: Rust-based analysis engine with WASM compilation
- ✅ **Cross-Platform**: Works on Windows, Linux, and macOS
- ✅ **Easy Integration**: Simple Python API for binary analysis

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Rust toolchain (for development)

### Install from PyPI

```bash
pip install hexis-native
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/ericijeoma/patcher.git
cd patcher

# Build and install
cd python
pip install -e .
```

## Quick Start

```python
import hexis_native

# Set your license key (required)
hexis_native.set_license_key("hxs_lic_...")

# Validate your license
if hexis_native.validate_license():
    print("✅ License is valid!")

# Analyze a binary file
result = hexis_native.analyze_file("path/to/binary.exe")
print(result)

# Or analyze raw bytes
with open("binary.exe", "rb") as f:
    buffer = f.read()
result = hexis_native.analyze_binary(buffer)
```

## API Reference

### `set_license_key(key: str) -> None`

Set the license key for the Hexis engine.

**Arguments:**
- `key`: The HEXIS_LICENSE_KEY (format: `hxs_lic_...`)

**Example:**
```python
hexis_native.set_license_key("hxs_lic_abc123...")
```

---

### `validate_license() -> bool`

Validate the current license key.

**Returns:**
- `True` if the license key is valid, `False` otherwise.

**Example:**
```python
if hexis_native.validate_license():
    print("License is valid")
else:
    print("Invalid license")
```

---

### `analyze_binary(buffer: bytes) -> str`

Analyze a binary buffer and return analysis results.

**Arguments:**
- `buffer`: Raw binary bytes to analyze

**Returns:**
- JSON string with analysis results

**Raises:**
- `RuntimeError`: If license is not set or invalid

**Example:**
```python
with open("binary.exe", "rb") as f:
    buffer = f.read()
result = hexis_native.analyze_binary(buffer)
```

---

### `analyze_file(file_path: str) -> str`

Analyze a binary file and return analysis results.

**Arguments:**
- `file_path`: Path to the binary file to analyze

**Returns:**
- JSON string with analysis results

**Raises:**
- `RuntimeError`: If license is not set or invalid
- `IOError`: If file cannot be read

**Example:**
```python
result = hexis_native.analyze_file("path/to/binary.exe")
```

---

### `analyze(path_or_buffer, license_key: str = None) -> str`

Convenience function to analyze a binary file or buffer.

**Arguments:**
- `path_or_buffer`: Either a file path (str) or raw bytes (bytes)
- `license_key`: Optional license key (overrides global setting)

**Returns:**
- JSON string with analysis results

**Raises:**
- `RuntimeError`: If license is invalid or analysis fails
- `IOError`: If file cannot be read
- `TypeError`: If path_or_buffer is not str or bytes

**Example:**
```python
# Analyze a file
result = hexis_native.analyze("path/to/binary.exe")

# Analyze with explicit license key
result = hexis_native.analyze("path/to/binary.exe", license_key="hxs_lic_...")
```

## Output Format

The analysis functions return a JSON string with the following structure:

```json
{
  "file_hash_sha256": "string",
  "architecture": "x64|x86|arm64|arm",
  "format": "PE|ELF|MachO",
  "virtual_base_address": "0x...",
  "total_instructions_decoded": 12345,
  "basic_blocks_mapped": 678,
  "vulnerabilities_found": 5,
  "structural_mitigations": ["ASLR", "DEP", ...],
  "audited_symbols": ["main", ...],
  "assembly_slices": [
    {
      "address": "0x...",
      "instructions": ["instruction 1", ...],
      "anomaly_type": "string",
      "confidence": 0.0-1.0
    }
  ],
  "risk_level": "critical|high|medium|low|safe"
}
```

## CI/CD Integration

Use Hexis in your CI/CD pipeline to automatically scan binaries:

```python
import os
import sys
import hexis_native

# Get license key from environment
license_key = os.getenv("HEXIS_LICENSE_KEY")
if not license_key:
    print("❌ HEXIS_LICENSE_KEY not set")
    sys.exit(1)

hexis_native.set_license_key(license_key)

# Scan all binaries in build directory
import glob
for binary in glob.glob("build/**/*.exe", recursive=True):
    result = hexis_native.analyze_file(binary)
    data = json.loads(result)

    if data.get("risk_level") in ["critical", "high"]:
        print(f"🚨 {binary}: {data['risk_level']} risk detected")
        sys.exit(1)

print("✅ All binaries passed security scan")
```

## License Management

### Generating Keys

To generate Ed25519 key pairs and license tokens:

```bash
# Generate new key pair
npx tsx scripts/generate-license.ts --generate-keys

# Create a license token for a customer
npx tsx scripts/generate-license.ts --customer-id "my_customer" --output token.txt
```

### Environment Variables

Set the license key as an environment variable:

```bash
# Linux/macOS
export HEXIS_LICENSE_KEY="hxs_lic_..."

# Windows (PowerShell)
$env:HEXIS_LICENSE_KEY="hxs_lic_..."

# Windows (CMD)
set HEXIS_LICENSE_KEY=hxs_lic_...
```

## Development

### Building from Source

```bash
# Install maturin (Rust-Python build tool)
pip install maturin

# Build the package
cd python
maturin develop
```

### Running Tests

```bash
# Run Python tests
python -m pytest tests/

# Run Rust tests
cd ..
cargo test
```

### Project Structure

```
python/
├── hexis_native/
│   ├── __init__.py      # Main Python module
│   └── __init__.pyi     # Type stubs
├── pyproject.toml       # Build configuration
└── README.md            # This file
```

## Security

- ✅ All analysis happens locally - binaries never leave your machine
- ✅ Ed25519 cryptographic signatures prevent license forgery
- ✅ Zero-trust architecture - no cloud dependency for analysis
- ✅ Telemetry only sends metadata, never raw binaries

## Support

- **Documentation**: [https://github.com/ericijeoma/patcher](https://github.com/ericijeoma/patcher)
- **Issues**: [GitHub Issues](https://github.com/ericijeoma/patcher/issues)
- **License**: MIT

## Version History

- **0.1.0** (2024-01-01): Initial release

---

© 2024 Hexis Security Platform. All rights reserved.
