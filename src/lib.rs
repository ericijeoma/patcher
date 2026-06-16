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
    match analyzer::analyze_executable(buffer) {
        Ok(report) => {
            // 1. Parse the raw JSON array string from the analyzer into a serde_json::Value
            let raw_alerts: Vec<serde_json::Value> = serde_json::from_str(&report.anomaly_summary)
                .unwrap_or_else(|_| vec![]);
            
            // 2. Map the Rust analyzer's internal output to match the strict Phase 2 TS Schema
            let mapped_slices: Vec<serde_json::Value> = raw_alerts.into_iter().map(|alert| {
                serde_json::json!({
                    // Map Rust's 'offset' to TS 'address' (ensuring hex format)
                    "address": alert["offset"].as_str().unwrap_or("0x00000000"),
                    // Map Rust's 'desc' to TS 'instructions' array
                    "instructions": [alert["desc"].as_str().unwrap_or("unknown instruction")],
                    // Map Rust's 'type' to TS 'anomaly_type'
                    "anomaly_type": alert["type"].as_str().unwrap_or("unknown"),
                    "confidence": 0.95
                })
            }).collect();

            // 3. Construct the full Phase 2 Contract
            let response = serde_json::json!({
                // SHA-256 will be calculated and injected by the Node TS wrapper
                "file_hash_sha256": "PENDING_INJECTION",
                "architecture": "x64",
                "format": "PE", 
                "virtual_base_address": format!("0x{:X}", report.virtual_base_address),
                "total_instructions_decoded": report.total_instructions_decoded,
                "basic_blocks_mapped": report.basic_blocks_mapped,
                "vulnerabilities_found": report.vulnerabilities_found,
                // Placeholders until Phase 1.1 and 1.2 are fully wired
                "structural_mitigations": ["ASLR", "DEP"], 
                "audited_symbols": ["main"], 
                "assembly_slices": mapped_slices
            });

            response.to_string()
        },
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
