"""
Type stubs for Hexis Native Python SDK
"""

def set_license_key(key: str) -> None:
    """Set the license key for the Hexis engine.

    Args:
        key: The HEXIS_LICENSE_KEY (format: hxs_lic_...)
    """
    ...

def validate_license() -> bool:
    """Validate the current license key.

    Returns:
        True if the license key is valid, False otherwise.
    """
    ...

def analyze_binary(buffer: bytes) -> str:
    """Analyze a binary buffer and return analysis results.

    Args:
        buffer: Raw binary bytes to analyze

    Returns:
        JSON string with analysis results

    Raises:
        RuntimeError: If license is not set or invalid
    """
    ...

def analyze_file(file_path: str) -> str:
    """Analyze a binary file and return analysis results.

    Args:
        file_path: Path to the binary file to analyze

    Returns:
        JSON string with analysis results

    Raises:
        RuntimeError: If license is not set or invalid
        IOError: If file cannot be read
    """
    ...

# Module metadata
__version__: str
__doc__: str
version: str

# Convenience function
def analyze(path_or_buffer: str | bytes, license_key: str | None = None) -> str:
    """Convenience function to analyze a binary file or buffer.

    Args:
        path_or_buffer: Either a file path (str) or raw bytes (bytes)
        license_key: Optional license key (overrides global setting)

    Returns:
        JSON string with analysis results

    Raises:
        RuntimeError: If license is invalid or analysis fails
        IOError: If file cannot be read
        TypeError: If path_or_buffer is not str or bytes
    """
    ...
