#!/usr/bin/env python3
"""
Hexis Python SDK Usage Examples

This file demonstrates how to use the Hexis native Rust engine from Python
with the cryptographic paywall enforcement.

Prerequisites:
    1. Install the package: pip install hexis-native
    2. Generate a license key: npx tsx scripts/generate-license.ts --generate-keys
    3. Create a license token: npx tsx scripts/generate-license.ts --customer-id "my_customer" --output token.txt
    4. Set the license key as environment variable: export HEXIS_LICENSE_KEY="hxs_lic_..."
"""

import os
import json
import sys
import warnings
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

license_key = os.getenv("HEXIS_LICENSE_KEY")

# Import the Hexis native module
try:
    import hexis_native
    # Suppress the mock warning if using development version
    warnings.filterwarnings('ignore', message='Hexis native module not available')
except ImportError as e:
    print(f"❌ Failed to import hexis_native: {e}")
    print("\n💡 To install: pip install hexis-native")
    print("   Or build from source: cd python && maturin develop")
    sys.exit(1)

def example_basic_analysis():
    """Example: Basic binary analysis with license validation"""
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Binary Analysis")
    print("="*70)

    # Get license key from environment
    license_key = os.getenv("HEXIS_LICENSE_KEY")
    if not license_key:
        print("❌ HEXIS_LICENSE_KEY environment variable not set!")
        print("   Set it with: export HEXIS_LICENSE_KEY='hxs_lic_...'")
        return

    # Set the license key
    hexis_native.set_license_key(license_key)
    print(f"✅ License key set")

    # Validate the license
    is_valid = hexis_native.validate_license()
    print(f"✅ License validation: {'PASSED' if is_valid else 'FAILED'}")
    if not is_valid:
        print("   ❌ Invalid license key!")
        return

    # Example: Analyze a binary file
    # Note: Replace with actual binary path
    test_files = [
        "CWE15.exe",  # Local test file
    ]

    for file_path in test_files:
        if Path(file_path).exists():
            print(f"\n🔍 Analyzing: {file_path}")
            try:
                result = hexis_native.analyze_file(file_path)
                data = json.loads(result)

                if "error" in data:
                    print(f"   ❌ Error: {data['error']}")
                else:
                    print(f"   ✅ Architecture: {data.get('architecture', 'N/A')}")
                    print(f"   ✅ Format: {data.get('format', 'N/A')}")
                    print(f"   ✅ Instructions decoded: {data.get('total_instructions_decoded', 0)}")
                    print(f"   ✅ Vulnerabilities found: {data.get('vulnerabilities_found', 0)}")
                    print(f"   ✅ Risk level: {data.get('risk_level', 'unknown')}")
            except Exception as e:
                print(f"   ❌ Analysis failed: {e}")
        else:
            print(f"\n⚠️  Test file not found: {file_path} (skipping)")

def example_buffer_analysis():
    """Example: Analyze binary from memory buffer"""
    print("\n" + "="*70)
    print("EXAMPLE 2: Buffer Analysis (In-Memory)")
    print("="*70)

    license_key = os.getenv("HEXIS_LICENSE_KEY")
    if not license_key:
        print("❌ HEXIS_LICENSE_KEY environment variable not set!")
        return

    hexis_native.set_license_key(license_key)

    # Read a file into memory
    test_file = "CWE15.exe"
    if not Path(test_file).exists():
        print(f"⚠️  Test file not found: {test_file} (skipping)")
        return

    with open(test_file, "rb") as f:
        buffer = f.read()

    print(f"📊 File size: {len(buffer)} bytes")

    # Analyze the buffer directly
    try:
        result = hexis_native.analyze_binary(buffer)
        data = json.loads(result)

        if "error" not in data:
            print(f"✅ Analysis successful")
            print(f"   Architecture: {data.get('architecture')}")
            print(f"   Format: {data.get('format')}")
    except Exception as e:
        print(f"❌ Analysis failed: {e}")

def example_convenience_api():
    """Example: Using the convenience analyze() function"""
    print("\n" + "="*70)
    print("EXAMPLE 3: Convenience API")
    print("="*70)

    license_key = os.getenv("HEXIS_LICENSE_KEY")
    if not license_key:
        print("❌ HEXIS_LICENSE_KEY environment variable not set!")
        return

    # Use the convenience function with explicit license key
    test_file = "CWE15.exe"
    if not Path(test_file).exists():
        print(f"⚠️  Test file not found: {test_file} (skipping)")
        return

    try:
        # Pass license key directly
        result = hexis_native.analyze(test_file, license_key=license_key)
        data = json.loads(result)

        if "error" not in data:
            print(f"✅ Convenience API analysis successful")
            print(f"   File: {test_file}")
            print(f"   Vulnerabilities: {data.get('vulnerabilities_found', 0)}")
    except Exception as e:
        print(f"❌ Analysis failed: {e}")

def example_error_handling():
    """Example: Error handling for missing license"""
    print("\n" + "="*70)
    print("EXAMPLE 4: Error Handling")
    print("="*70)
    hexis_native.clear_license_key()  

    # Try to analyze without setting license key
    try:
        result = hexis_native.analyze_file("CWE15.exe")
        print(f"❌ Should have failed but got: {result}")
    except RuntimeError as e:
        print(f"✅ Correctly caught error: {e}")
    except Exception as e:
        print(f"✅ Caught error: {type(e).__name__}: {e}")

def example_ci_cd_integration():
    """Example: CI/CD integration pattern"""
    print("\n" + "="*70)
    print("EXAMPLE 5: CI/CD Integration Pattern")
    print("="*70)

    license_key = os.getenv("HEXIS_LICENSE_KEY")
    if not license_key:
        print("❌ HEXIS_LICENSE_KEY environment variable not set!")
        return

    hexis_native.set_license_key(license_key)

    # Simulate CI/CD pipeline
    target_path = "build"  # Replace with your build directory
    if not Path(target_path).exists():
        print(f"⚠️  Build directory not found, falling back to current directory")
        target_path = "."

    print(f"🔍 Scanning binaries in: {target_path}")

    # Find all .exe files in the build directory
    binaries = list(Path(target_path).rglob("*.exe"))
    if not binaries:
        print("⚠️  No .exe files found in build directory")
        return

    print(f"📦 Found {len(binaries)} binaries to scan")

    pipeline_failed = False
    for binary in binaries[:3]:  # Limit to first 3 for demo
        print(f"\n  Scanning: {binary.name}")
        try:
            result = hexis_native.analyze_file(str(binary))
            data = json.loads(result)

            if "error" in data:
                print(f"    ❌ Error: {data['error']}")
                pipeline_failed = True
            else:
                vulnerabilities = data.get('vulnerabilities_found', 0)
                risk_level = data.get('risk_level', 'unknown').lower()

                if risk_level in ['critical', 'high'] or vulnerabilities > 0:
                    print(f"    🚨 {risk_level.upper()} - {vulnerabilities} vulnerabilities")
                    pipeline_failed = True
                else:
                    print(f"    ✅ CLEAN")
        except Exception as e:
            print(f"    ❌ Failed: {e}")
            pipeline_failed = True

    if pipeline_failed:
        print("\n❌ PIPELINE FAILED: Critical vulnerabilities detected")
        # In real CI/CD: sys.exit(1)
    else:
        print("\n✅ PIPELINE PASSED: All binaries clean")

def main():
    """Run all examples"""
    print("\n" + "="*70)
    print("HEXIS PYTHON SDK USAGE EXAMPLES")
    print("="*70)
    print(f"Module version: {hexis_native.__version__}")

    # Run all examples
    example_basic_analysis()
    example_buffer_analysis()
    example_convenience_api()
    example_error_handling()
    example_ci_cd_integration()

    print("\n" + "="*70)
    print("✅ All examples completed")
    print("="*70)
    print("\n💡 Next steps:")
    print("   1. Generate a license: npx tsx scripts/generate-license.ts --generate-keys")
    print("   2. Create a token: npx tsx scripts/generate-license.ts --customer-id 'test'")
    print("   3. Set the key: export HEXIS_LICENSE_KEY='hxs_lic_...'")
    print("   4. Run this script: python examples/python_usage.py")
    print("")

if __name__ == "__main__":
    main()
