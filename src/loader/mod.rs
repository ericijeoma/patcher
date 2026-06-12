use goblin::pe::PE;
use goblin::elf::Elf;
use serde::Serialize;

use object::{File, Object as _, ObjectSection};

pub mod imports;

/// Extracted metadata about a native binary.
#[derive(Serialize)]
pub struct BinaryMetadata {
    pub file_type: String,
    pub entry_point: u64,
    pub num_sections: usize,
    pub architecture: String,
}

/// Parses a raw byte stream and extracts basic metadata.
//
/// Supported formats: ELF, PE.
pub fn parse_bytes(bytes: &[u8]) -> Result<BinaryMetadata, String> {
    // Try PE format first
    if let Ok(pe) = PE::parse(bytes) {
        let opt = pe
            .header
            .optional_header
            .ok_or_else(|| "PE optional header missing".to_string())?;

        let entry_rva = opt.standard_fields.address_of_entry_point;
        let image_base = opt.windows_fields.image_base;
        let entry_point = image_base.saturating_add(entry_rva);

        return Ok(BinaryMetadata {
            file_type: "PE".to_string(),
            entry_point,
            num_sections: pe.sections.len(),
            architecture: pe_arch_to_string(pe.header.coff_header.machine),
        });
    }

    // Try ELF format
    if let Ok(elf) = Elf::parse(bytes) {
        return Ok(BinaryMetadata {
            file_type: "ELF".to_string(),
            entry_point: elf.entry,
            num_sections: elf.section_headers.len(),
            architecture: elf_arch_to_string(elf.header.e_machine),
        });
    }

    Err("Unsupported binary format".to_string())
}

/// Zero-copy extraction of the executable `.text` section from ELF/PE binaries.
///
/// Returns a borrowed slice of the text section bytes and the section's virtual address.
///
/// This function performs **no allocations** (it borrows from `raw_bytes`).
#[allow(clippy::needless_lifetimes)]
pub fn extract_text_section<'a>(raw_bytes: &'a [u8]) -> Result<(&'a [u8], u64), String> {
    let file = File::parse(raw_bytes)
        .map_err(|e| format!("Failed to parse executable format: {e}"))?;

    let section = file.section_by_name(".text").ok_or_else(|| {
        "Target binary does not contain a valid executable .text section.".to_string()
    })?;

    let code_bytes = section
        .data()
        .map_err(|e| format!("Failed to read text section data: {e}"))?;

    Ok((code_bytes, section.address()))
}

fn elf_arch_to_string(e_machine: u16) -> String {
    use goblin::elf::header as elf_hdr;
    match e_machine {
        elf_hdr::EM_386 => "x86".to_string(),
        elf_hdr::EM_X86_64 => "x86_64".to_string(),
        elf_hdr::EM_ARM => "arm".to_string(),
        elf_hdr::EM_AARCH64 => "aarch64".to_string(),
        elf_hdr::EM_RISCV => "riscv".to_string(),
        other => format!("unknown({other})"),
    }
}

fn pe_arch_to_string(machine: u16) -> String {
    use goblin::pe::header as pe_hdr;
    match machine {
        pe_hdr::COFF_MACHINE_X86 => "x86".to_string(),
        pe_hdr::COFF_MACHINE_X86_64 => "x86_64".to_string(),
        pe_hdr::COFF_MACHINE_ARM => "arm".to_string(),
        pe_hdr::COFF_MACHINE_ARM64 => "aarch64".to_string(),
        other => format!("unknown({other})"),
    }
}

#[cfg(test)]
mod extract_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        // Guardrail: arbitrary bytes should never panic.
        #[test]
        fn prop_extract_text_section_never_panics(data in proptest::collection::vec(any::<u8>(), 0..8192)) {
            let _ = extract_text_section(&data);
        }
    }

    #[test]
    fn test_extract_text_section_from_current_test_binary() {
        // This is a pragmatic positive test: it uses the current test executable built by Cargo.
        // On Windows this is a PE; on Linux it's an ELF.
        // It should always contain a `.text` section.
        let exe_path = std::env::current_exe().expect("expected current_exe");
        let bytes = std::fs::read(&exe_path).expect("expected to read current exe");

        let (text, addr) = extract_text_section(&bytes).expect("expected .text extraction to succeed");
        assert!(!text.is_empty(), "expected non-empty .text section");
        assert!(addr != 0, "expected non-zero virtual address for .text");
    }
}
