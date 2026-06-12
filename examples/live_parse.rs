use std::fs;
use std::path::Path;
use std::process::Command;

use patcher::loader::extract_text_section;

fn main() {
    println!("=== Starting Live Binary Verification ===");

    // 1. Write a small source file programmatically
    let src_path = "temp_dummy.rs";
    let exe_path = "temp_dummy.exe";
    fs::write(src_path, "fn main() { println!(\"Hello Monolith\"); }").unwrap();

    // 2. Compile it using the host machine's rustc compiler
    println!("Compiling dummy executable via rustc...");
    let status = Command::new("rustc")
        .args([src_path, "-o", exe_path])
        .status()
        .expect("Failed to execute rustc compile command");

    if !status.success() {
        panic!("Compilation failed!");
    }

    // 3. Ingest raw bytes of the newly minted compiled executable
    let file_bytes = fs::read(exe_path).unwrap();
    println!("Loaded compiled file into memory: {} bytes.", file_bytes.len());

    // 4. Extract the machine instructions
    match extract_text_section(&file_bytes) {
        Ok((code_slice, virtual_address)) => {
            println!("\n[SUCCESS] Extraction complete!");
            println!("Virtual base memory address: 0x{:X}", virtual_address);

            // Verify zero-copy enforcement by checking pointer positions in memory
            let file_start = file_bytes.as_ptr() as usize;
            let slice_start = code_slice.as_ptr() as usize;
            if slice_start >= file_start && slice_start < file_start + file_bytes.len() {
                println!(
                    "Zero-Copy Verification: PASSED (Data is borrowed directly from the source buffer)"
                );
            } else {
                println!(
                    "Zero-Copy Verification: FAILED (Data was cloned into a new memory location)"
                );
            }

            // Print the first 10 bytes of raw machine code opcodes
            let display_len = std::cmp::min(code_slice.len(), 10);
            println!(
                "First {} bytes of machine code opcodes: {:X?}",
                display_len,
                &code_slice[..display_len]
            );
        }
        Err(e) => println!("\n[FAILURE] Extraction failed: {}", e),
    }

    // 5. Clean up disk pollution safely
    let _ = fs::remove_file(src_path);
    let _ = fs::remove_file(exe_path);
    if Path::new("temp_dummy.pdb").exists() {
        let _ = fs::remove_file("temp_dummy.pdb");
    }
}
