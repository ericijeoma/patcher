use std::fs;
use std::process::Command;
use hexis_native::analyzer::analyze_executable;

fn main() {
    println!("=== Starting Live End-to-End Pipeline Verification ===");
    let src_path = "temp_orchestrator_dummy.rs";
    let exe_path = "temp_orchestrator_dummy.exe";

    // 1. Clean up any existing files first to avoid locking issues
    let _ = fs::remove_file(src_path);
    let _ = fs::remove_file(exe_path);
    let _ = fs::remove_file("temp_orchestrator_dummy.pdb");

    // 2. Write a slightly complex dummy program with branching logic
    let dummy_code = r#"
    fn main() {
        let x = std::env::args().len();
        if x > 2 {
            println!("Branch A");
        } else {
            println!("Branch B");
        }
    }
    "#;
    fs::write(src_path, dummy_code).unwrap();

    println!("Compiling dynamic dummy executable via rustc...");
    let status = Command::new("rustc")
        .args([src_path, "-o", exe_path, "-C", "opt-level=0"])
        .status()
        .expect("Failed to execute rustc compiler");

    if !status.success() {
        let _ = fs::remove_file(src_path);
        panic!("Compilation failed!");
    }

    // 2. Read the live compiled binary
    let file_bytes = fs::read(exe_path).unwrap();
    println!("Loaded live executable: {} bytes.", file_bytes.len());

    // 3. Feed it to the master API
    println!("Executing static analysis pipeline...\n");
    match analyze_executable(&file_bytes) {
        Ok(report) => {
            println!("[SUCCESS] Full Analysis Complete!");
            println!("- Virtual Base Address: 0x{:X}", report.virtual_base_address);
            println!("- Total Instructions Decoded: {}", report.total_instructions_decoded);
            println!("- Total Basic Blocks Mapped: {}", report.basic_blocks_mapped);
            println!("- Critical Vulnerabilities Isolated: {}", report.vulnerabilities_found);
            println!("- High-Density AI Telemetry Payload: {}", report.anomaly_summary);

            assert!(report.total_instructions_decoded > 50, "Should decode real executable payload");
            assert!(report.basic_blocks_mapped > 10, "Should map real branching logic");
            println!("\nIntegration Verification: PASSED");
        }
        Err(e) => println!("\n[FAILURE] Analysis pipeline failed: {}", e),
    }

    // 4. Cleanup
    let _ = fs::remove_file(src_path);
    let _ = fs::remove_file(exe_path);
    let _ = fs::remove_file("temp_orchestrator_dummy.pdb");
}
