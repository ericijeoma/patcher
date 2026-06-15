pub mod loader;
pub mod lifter;
pub mod relaxer;
pub mod scanner;
pub mod simulator;
pub mod analyzer;
pub mod fuzzer;

// Re-export the main entrypoint for easy access
pub use analyzer::{analyze_executable, AnalysisReport};

#[cfg(feature = "cloud-test")]
pub use fuzzer::run_cloud_fuzzing;

use wasm_bindgen::prelude::*;

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
    // Route the raw byte array into the ingestion engine
    // Bitness is now safely handled inside analyze_executable!
    match analyzer::analyze_executable(buffer) {
        Ok(report) => report.anomaly_summary,
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
