pub mod analyzer;
pub mod fuzzer;
pub mod license;
pub mod lifter;
pub mod loader;
pub mod relaxer;
pub mod scanner;
pub mod simulator;

// Re-export the main entrypoint for easy access
pub use analyzer::{analyze_executable, AnalysisReport};
pub use license::{validate_license_key_wasm, LicenseError};

#[cfg(feature = "cloud-test")]
pub use fuzzer::run_cloud_fuzzing;

use sha2::{Digest, Sha256};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

// Python bindings feature
#[cfg(feature = "pyo3")]
use pyo3::prelude::*;

/// Buckets a vulnerability count into a coarse risk label.
/// NOTE: thresholds are a reasonable placeholder — tune once real
/// per-finding severity/confidence data is wired in from the scanner module.
fn classify_risk_level(vulnerabilities_found: usize) -> &'static str {
    match vulnerabilities_found {
        0 => "low",
        1..=2 => "medium",
        3..=5 => "high",
        _ => "critical",
    }
}

// Global license key storage for WASM context
// This will be set by JS before calling analyze functions
static LICENSE_KEY: OnceLock<String> = OnceLock::new();

/// Set the license key for WASM operations
/// Must be called before any analysis functions
#[wasm_bindgen]
pub fn set_license_key(key: String) {
    let _ = LICENSE_KEY.set(key);
}

/// Get the current license key (for internal use)
fn get_license_key() -> Option<String> {
    LICENSE_KEY.get().cloned()
}

/// Validate the current license key
/// Returns true if valid, false otherwise
#[wasm_bindgen]
pub fn validate_license() -> bool {
    match get_license_key() {
        Some(key) => validate_license_key_wasm(&key),
        None => false,
    }
}

/// Monolith facade boundary for JS callers.
///
/// Always returns a JSON string.
/// - Success: serialized `BinaryMetadata`
/// - Error: `{ "error": "..." }`
#[wasm_bindgen]
pub fn analyze_binary(file_bytes: &[u8]) -> String {
    match loader::parse_bytes(file_bytes) {
        Ok(metadata) => match serde_json::to_string(&metadata) {
            Ok(json) => json,
            Err(e) => serde_json::json!({
                "error": format!("serde_json serialization failed: {e}")
            })
            .to_string(),
        },
        Err(reason) => serde_json::json!({ "error": reason }).to_string(),
    }
}

/// WASM interface for the static analysis engine.
///
/// Routes the raw byte array into the ingestion engine and returns the anomaly summary.
/// Always returns a JSON string.
/// - Success: anomaly summary JSON
/// - Error: `{ "error": "..." }`
#[wasm_bindgen]
pub fn analyze_binary_buffer(buffer: &[u8]) -> String {
    // Validate license key before processing
    if !validate_license() {
        return serde_json::json!({
            "error": "LICENSE_REQUIRED",
            "message": "Valid HEXIS_LICENSE_KEY must be set via set_license_key() before analysis"
        })
        .to_string();
    }

    match analyzer::analyze_executable(buffer) {
        Ok(report) => {
            // 1. Parse the raw JSON array string from the analyzer into a serde_json::Value
            let raw_alerts: Vec<serde_json::Value> =
                serde_json::from_str(&report.anomaly_summary).unwrap_or_else(|_| vec![]);

            // 2. Map the Rust analyzer's internal output to match the strict Phase 2 TS Schema
            let mapped_slices: Vec<serde_json::Value> = raw_alerts
                .into_iter()
                .map(|alert| {
                    serde_json::json!({
                        // Map Rust's 'offset' to TS 'address' (ensuring hex format)
                        "address": alert["offset"].as_str().unwrap_or("0x00000000"),
                        // Map Rust's 'desc' to TS 'instructions' array
                        "instructions": [alert["desc"].as_str().unwrap_or("unknown instruction")],
                        // Map Rust's 'type' to TS 'anomaly_type'
                        "anomaly_type": alert["type"].as_str().unwrap_or("unknown"),
                        "confidence": 0.95
                    })
                })
                .collect();

            // 3. Construct the full Phase 2 Contract
            let file_hash = {
                let mut hasher = Sha256::new();
                hasher.update(buffer);
                format!("{:x}", hasher.finalize())
            };

            let response = serde_json::json!({
                "file_hash_sha256": file_hash,
                "architecture": report.architecture,
                "format": report.format,
                "virtual_base_address": format!("0x{:X}", report.virtual_base_address),
                "total_instructions_decoded": report.total_instructions_decoded,
                "basic_blocks_mapped": report.basic_blocks_mapped,
                "vulnerabilities_found": report.vulnerabilities_found,
                "risk_level": classify_risk_level(report.vulnerabilities_found),
                // Placeholders until Phase 1.1 and 1.2 are fully wired
                "structural_mitigations": ["ASLR", "DEP"],
                "audited_symbols": ["main"],
                "assembly_slices": mapped_slices
            });

            response.to_string()
        }
        Err(e) => format!("{{\"error\": \"Failed to analyze binary: {}\"}}", e),
    }
}

/// Generates a standalone WGSL compute shader that represents a continuous relaxation
/// (sigmoid-based penalty manifold) for a parsed binary.
///
/// Always returns a JSON string:
/// - Success: `{ "wgsl": "..." }`
/// - Error: `{ "error": "..." }`
#[wasm_bindgen]
pub fn generate_shader_manifold(file_bytes: &[u8]) -> String {
    match loader::parse_bytes(file_bytes) {
        Ok(metadata) => {
            let wgsl = relaxer::compile_wgsl(&metadata);
            serde_json::json!({ "wgsl": wgsl }).to_string()
        }
        Err(reason) => serde_json::json!({ "error": reason }).to_string(),
    }
}

/// Python bindings for the Hexis native engine
/// Exposes the analysis engine to Python via PyO3
#[cfg(feature = "pyo3")]
#[pymodule]
pub fn _hexis_native(m: &Bound<'_, pyo3::types::PyModule>) -> PyResult<()> {
    // Global license key storage for Python context
    static PY_LICENSE_KEY: std::sync::RwLock<Option<String>> = std::sync::RwLock::new(None);

    fn get_license_key_py() -> Option<String> {
        PY_LICENSE_KEY.read().ok()?.clone()
    }

    #[pyfunction]
    #[pyo3(name = "set_license_key")]
    fn set_license_key_py(key: String) {
        if let Ok(mut guard) = PY_LICENSE_KEY.write() {
            *guard = Some(key);
        }
    }

    // New: expose a clear function
    #[pyfunction]
    #[pyo3(name = "clear_license_key")]
    fn clear_license_key_py() {
        if let Ok(mut guard) = PY_LICENSE_KEY.write() {
            *guard = None;
        }
    }

    /// Validate the current license key
    #[pyfunction]
    #[pyo3(name = "validate_license")]
    fn validate_license_py() -> bool {
        match get_license_key_py() {
            Some(key) => license::validate_license_key_wasm(&key),
            None => false,
        }
    }

    /// Analyze a binary buffer and return the anomaly summary as JSON string
    /// This is the main entry point for Python users
    ///
    /// Args:
    ///     buffer: The raw binary bytes to analyze
    ///
    /// Returns:
    ///     JSON string with analysis results or error
    ///
    /// Raises:
    ///     PyErr if license is not set or invalid
    #[pyfunction]
    #[pyo3(name = "analyze_binary")]
    fn analyze_binary_py(buffer: &[u8]) -> PyResult<String> {
        // Validate license key before processing
        if !validate_license_py() {
            return Err(PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(
                "LICENSE_REQUIRED: Valid HEXIS_LICENSE_KEY must be set via set_license_key() before analysis"
            ));
        }

        match analyzer::analyze_executable(buffer) {
            Ok(report) => {
                // Map the Rust analyzer's internal output to match the expected schema
                let raw_alerts: Vec<serde_json::Value> =
                    serde_json::from_str(&report.anomaly_summary).unwrap_or_else(|_| vec![]);

                let mapped_slices: Vec<serde_json::Value> = raw_alerts.into_iter().map(|alert| {
                    serde_json::json!({
                        "address": alert["offset"].as_str().unwrap_or("0x00000000"),
                        "instructions": [alert["desc"].as_str().unwrap_or("unknown instruction")],
                        "anomaly_type": alert["type"].as_str().unwrap_or("unknown"),
                        "confidence": 0.95
                    })
                }).collect();

                let file_hash = {
                    let mut hasher = Sha256::new();
                    hasher.update(buffer);
                    format!("{:x}", hasher.finalize())
                };

                let response = serde_json::json!({
                    "file_hash_sha256": file_hash,
                    "architecture": report.architecture,
                    "format": report.format,
                    "virtual_base_address": format!("0x{:X}", report.virtual_base_address),
                    "total_instructions_decoded": report.total_instructions_decoded,
                    "basic_blocks_mapped": report.basic_blocks_mapped,
                    "vulnerabilities_found": report.vulnerabilities_found,
                    "risk_level": classify_risk_level(report.vulnerabilities_found),
                    "structural_mitigations": ["ASLR", "DEP"],
                    "audited_symbols": ["main"],
                    "assembly_slices": mapped_slices
                });

                Ok(response.to_string())
            }
            Err(e) => Err(PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(format!(
                "Failed to analyze binary: {}",
                e
            ))),
        }
    }

    /// Analyze a binary file path and return the anomaly summary as JSON string
    /// Convenience wrapper that reads the file and calls analyze_binary_py
    ///
    /// Args:
    ///     file_path: Path to the binary file to analyze
    ///
    /// Returns:
    ///     JSON string with analysis results or error
    #[pyfunction]
    #[pyo3(name = "analyze_file")]
    fn analyze_file_py(file_path: String) -> PyResult<String> {
        use std::fs;
        use std::path::Path;

        let path = Path::new(&file_path);
        let buffer = fs::read(path).map_err(|e| {
            PyErr::new::<pyo3::exceptions::PyIOError, _>(format!(
                "Failed to read file {}: {}",
                file_path, e
            ))
        })?;

        analyze_binary_py(&buffer)
    }

    // Register all Python functions
    m.add_function(wrap_pyfunction!(set_license_key_py, m)?)?;
    m.add_function(wrap_pyfunction!(validate_license_py, m)?)?;
    m.add_function(wrap_pyfunction!(analyze_binary_py, m)?)?;
    m.add_function(wrap_pyfunction!(analyze_file_py, m)?)?;
    m.add_function(wrap_pyfunction!(clear_license_key_py, m)?)?;

    // Module metadata
    m.add("__version__", "0.1.0")?;
    m.add("__doc__", "Hexis native Rust engine with Python bindings")?;

    Ok(())
}
