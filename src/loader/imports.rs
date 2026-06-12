use goblin::pe::PE;
use goblin::elf::Elf;
use std::collections::HashSet;

/// Parses a raw binary and extracts the names of all dynamically linked functions (IAT/PLT).
pub fn extract_imports(raw_bytes: &[u8]) -> Result<HashSet<String>, String> {
    let mut imports = HashSet::new();

    // Try PE format first
    if let Ok(pe) = PE::parse(raw_bytes) {
        for import in pe.imports {
            imports.insert(import.name.to_string());
        }
        return Ok(imports);
    }

    // Try ELF format
    if let Ok(elf) = Elf::parse(raw_bytes) {
        for sym in elf.dynsyms.iter() {
            if let Some(name) = elf.dynstrtab.get_at(sym.st_name) {
                imports.insert(name.to_string());
            }
        }
        return Ok(imports);
    }

    Err("Unsupported binary format for import extraction".into())
}

/// Returns true if the imported function is a known source of untrusted user input.
pub fn is_untrusted_source(function_name: &str) -> bool {
    let lower = function_name.to_lowercase();
    // Common network, file, and commandline input vectors
    lower.contains("recv") ||
    lower.contains("readfile") ||
    lower.contains("getenvironmentvariable") ||
    lower.contains("scanf") ||
    lower.contains("gets")
}
