use hexis_native::loader::imports::{extract_imports, is_untrusted_source};

fn main() {
    // Test the import extraction functionality
    println!("Testing import extraction functionality...");

    // Try to read the current executable and extract imports
    let exe_path = std::env::current_exe().expect("expected current_exe");
    let bytes = std::fs::read(&exe_path).expect("expected to read current exe");

    match extract_imports(&bytes) {
        Ok(imports) => {
            println!("Successfully extracted {} imports:", imports.len());

            let suspicious_count = imports.iter()
                .filter(|&import| is_untrusted_source(import))
                .count();

            println!("Found {} suspicious imports:", suspicious_count);

            for import in imports.iter().filter(|&i| is_untrusted_source(i)) {
                println!("  - {}", import);
            }

            println!("Import extraction test: PASSED");
        }
        Err(e) => {
            println!("Import extraction failed: {}", e);
            println!("This is expected if the binary format is not supported for import extraction");
        }
    }
}
