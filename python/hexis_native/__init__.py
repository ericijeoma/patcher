"""
Hexis Native Python SDK

A Python wrapper for the Hexis Rust native engine.
Provides binary static analysis capabilities with cryptographic paywall enforcement.

Installation:
    pip install hexis-native

Usage:
    import hexis_native

    # Set your license key (required)
    hexis_native.set_license_key("hxs_lic_...")

    # Analyze a binary file
    result = hexis_native.analyze_file("path/to/binary.exe")

    # Or analyze raw bytes
    with open("binary.exe", "rb") as f:
        buffer = f.read()
    result = hexis_native.analyze_binary(buffer)

    # Validate your license
    is_valid = hexis_native.validate_license()
"""

import sys
import warnings
from typing import Optional

# Flag to track if Rust module is available
RUST_MODULE_AVAILABLE = False

try:
    # Try to import the compiled Rust module
    # The Rust module is built as a separate extension module
    from . import _hexis_native
    set_license_key = _hexis_native.set_license_key
    clear_license_key = _hexis_native.clear_license_key
    validate_license = _hexis_native.validate_license
    analyze_binary = _hexis_native.analyze_binary
    analyze_file = _hexis_native.analyze_file
    __version__ = _hexis_native.__version__
    __doc__ = _hexis_native.__doc__
    RUST_MODULE_AVAILABLE = True
except ImportError:
    # Fallback: provide mock implementations for development
    # This allows the package to be imported even if the Rust module isn't built
    warnings.warn(
        "Hexis native module not available. Using mock implementations. "
        "To use the real module, build with: maturin develop",
        UserWarning
    )

    def set_license_key(key: str) -> None:
        """Mock implementation - set license key"""
        pass
    
    def clear_license_key() -> None:   # add this
        """Mock implementation - no-op since no key is stored"""
        pass

    def validate_license() -> bool:
        """Mock implementation - always returns False"""
        return False

    def analyze_binary(buffer: bytes) -> str:
        """Mock implementation - returns error"""
        import json
        return json.dumps({"error": "Native module not available"})

    def analyze_file(file_path: str) -> str:
        """Mock implementation - returns error"""
        import json
        return json.dumps({"error": "Native module not available"})

    __version__ = "0.1.0"
    __doc__ = "Hexis native Rust engine with Python bindings (mock)"

__all__ = [
    "set_license_key",
    "clear_license_key",
    "validate_license",
    "analyze_binary",
    "analyze_file",
    "__version__",
    "__doc__",
]

# Module-level convenience functions
def analyze(path_or_buffer, license_key: str = None) -> str:
    """
    Convenience function to analyze a binary file or buffer.

    Args:
        path_or_buffer: Either a file path (str) or raw bytes (bytes)
        license_key: Optional license key (overrides global setting)

    Returns:
        JSON string with analysis results

    Raises:
        RuntimeError: If license is invalid or analysis fails
        IOError: If file cannot be read
    """
    if license_key is not None:
        set_license_key(license_key)

    if isinstance(path_or_buffer, str):
        return analyze_file(path_or_buffer)
    elif isinstance(path_or_buffer, (bytes, bytearray)):
        return analyze_binary(path_or_buffer)
    else:
        raise TypeError("path_or_buffer must be str (path) or bytes (buffer)")

# Export version
version = __version__
