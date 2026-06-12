#!/usr/bin/env python3
"""
Secure Binary Ingestion and Neutralization Script

This script safely streams a remote binary file, strips execution privileges,
neutralizes the file extension, and calculates its cryptographic signature.
"""

import argparse
import hashlib
import json
import os
import requests
import stat
import sys
from pathlib import Path
from typing import Optional, Dict, Any

def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Secure Binary Ingestion and Neutralization Script"
    )
    parser.add_argument(
        "--url", "-u",
        required=True,
        help="Remote URL of the binary file to download"
    )
    parser.add_argument(
        "--out-dir", "-o",
        default="./test_fixtures/raw_bytes/",
        help="Output directory path (default: ./test_fixtures/raw_bytes/)"
    )
    return parser.parse_args()

def ensure_directory_exists(directory_path: str) -> Path:
    """Ensure the output directory exists, create if necessary."""
    try:
        output_dir = Path(directory_path).absolute()
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir
    except Exception as e:
        raise RuntimeError(f"Failed to create output directory: {e}")

def sanitize_filename(url: str) -> str:
    """Generate a safe filename from URL, removing any executable extensions."""
    # Extract filename from URL
    filename = os.path.basename(url)

    # Remove common executable extensions
    executable_extensions = [
        '.exe', '.bat', '.cmd', '.msi', '.scr',
        '.sh', '.bin', '.out', '.dll', '.so',
        '.app', '.dmg', '.pkg', '.run'
    ]

    # Remove any executable extension
    for ext in executable_extensions:
        if filename.lower().endswith(ext):
            filename = filename[:-len(ext)]
            break

    # Ensure we have a .bin extension
    if not filename.endswith('.bin'):
        filename += '.bin'

    return filename

def stream_download(url: str, output_path: Path, chunk_size: int = 1024) -> int:
    """Stream download the file in chunks and save to disk."""
    try:
        with requests.get(url, stream=True, timeout=30) as response:
            response.raise_for_status()

            total_size = 0
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:  # filter out keep-alive new chunks
                        f.write(chunk)
                        total_size += len(chunk)

            return total_size
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Download failed: {e}")

def set_file_permissions(file_path: Path) -> None:
    """Set file permissions to read-only (no execute bits)."""
    try:
        # Set permissions to 0644 (read/write for owner, read for others, no execute)
        os.chmod(file_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)

        # On Windows, we rely on the .bin extension and standard file permissions
        # The win32api approach is commented out as it requires additional dependencies
        # and the .bin extension + standard permissions are sufficient for security
    except Exception as e:
        raise RuntimeError(f"Failed to set file permissions: {e}")

def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash of the downloaded file."""
    try:
        sha256_hash = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        raise RuntimeError(f"Failed to calculate SHA-256 hash: {e}")

def generate_telemetry_log(
    success: bool,
    local_path: str,
    file_size: int,
    sha256_hash: Optional[str] = None,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """Generate telemetry log in JSON format."""
    log_data = {
        "download_status": "Success" if success else "Failure",
        "local_path": local_path,
        "file_size_bytes": file_size,
        "sha256": sha256_hash if sha256_hash else ""
    }

    if error:
        log_data["error"] = error

    return log_data

def main() -> int:
    """Main execution function."""
    try:
        args = parse_arguments()

        # Ensure output directory exists
        output_dir = ensure_directory_exists(args.out_dir)

        # Generate safe filename
        safe_filename = sanitize_filename(args.url)
        output_path = output_dir / safe_filename

        # Download the file
        file_size = stream_download(args.url, output_path)

        # Set secure file permissions
        set_file_permissions(output_path)

        # Calculate SHA-256 hash
        sha256_hash = calculate_sha256(output_path)

        # Generate and output telemetry log
        telemetry = generate_telemetry_log(
            success=True,
            local_path=str(output_path),
            file_size=file_size,
            sha256_hash=sha256_hash
        )

        print(json.dumps(telemetry, indent=2))
        return 0

    except Exception as e:
        # Generate error telemetry log
        error_telemetry = generate_telemetry_log(
            success=False,
            local_path="",
            file_size=0,
            error=str(e)
        )

        print(json.dumps(error_telemetry, indent=2))
        return 1

if __name__ == "__main__":
    sys.exit(main())
