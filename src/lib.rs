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
    // Determine bitness from the binary
    let bitness = detect_bitness(buffer);

    // Route the raw byte array into the ingestion engine
    match analyzer::analyze_executable(buffer, bitness) {
        Ok(report) => {
            // Return the high-density anomaly summary directly to JS
            report.anomaly_summary
        },
        Err(e) => format!("{{\"error\": \"Failed to analyze binary: {}\"}}", e),
    }
}

/// Helper function to detect bitness (32 or 64) from binary bytes
fn detect_bitness(bytes: &[u8]) -> u32 {
    // Try to detect based on known magic numbers and headers
    if bytes.len() >= 4 {
        // Check for ELF magic
        if bytes[0] == 0x7f && bytes[1] == 0x45 && bytes[2] == 0x4c && bytes[3] == 0x46 {
            // ELF file - check class (bitness) at offset 4
            if bytes.len() >= 5 {
                return if bytes[4] == 2 { 64 } else { 32 }; // 2 = 64-bit, 1 = 32-bit
            }
        }
        // Check for PE signature (MZ header)
        else if bytes[0] == 0x4d && bytes[1] == 0x5a {
            // PE file - check machine type in COFF header
            if bytes.len() >= 0x3c + 4 {
                let pe_offset = u32::from_le_bytes([bytes[0x3c], bytes[0x3c+1], bytes[0x3c+2], bytes[0x3c+3]]) as usize;
                if bytes.len() >= pe_offset + 4 && pe_offset + 4 <= bytes.len() {
                    let machine = u16::from_le_bytes([bytes[pe_offset], bytes[pe_offset+1]]);
                    // Common machine types: 0x8664 = x64, 0x014c = x86
                    return if machine == 0x8664 { 64 } else { 32 };
                }
            }
        }
    }

    // Default to 64-bit if we can't determine
    64
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
