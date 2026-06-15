use goblin::Object;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct MitigationMatrix {
    pub nx_dep_enabled: bool,
    pub aslr_enabled: bool,
    pub stack_canary_found: bool,
}

pub fn extract_mitigations(buffer: &[u8]) -> Result<MitigationMatrix, &'static str> {
    let mut matrix = MitigationMatrix::default();

    match Object::parse(buffer).map_err(|_| "Invalid format")? {
        Object::Elf(elf) => {
            // Check for NX (No-Execute) via GNU_STACK program header
            matrix.nx_dep_enabled = elf.program_headers.iter()
                .any(|ph| ph.p_type == goblin::elf::program_header::PT_GNU_STACK && (ph.p_flags & goblin::elf::program_header::PF_X) == 0);
            
            // Check for ASLR (Position Independent Executable)
            matrix.aslr_enabled = elf.header.e_type == goblin::elf::header::ET_DYN;
            
            // Note: Stack canaries in ELF require scanning the symbol table for __stack_chk_fail
        },
        Object::PE(pe) => {
            if let Some(opt_header) = pe.header.optional_header {
                let characteristics = opt_header.windows_fields.dll_characteristics;
                matrix.aslr_enabled = (characteristics & goblin::pe::optional_header::IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE) != 0;
                matrix.nx_dep_enabled = (characteristics & goblin::pe::optional_header::IMAGE_DLLCHARACTERISTICS_NX_COMPAT) != 0;
            }
        },
        Object::Mach(mach) => {
            // Mach-O implementation goes here
            matrix.nx_dep_enabled = true; // Modern Mach-O defaults
        },
        _ => return Err("Unsupported binary container"),
    }

    Ok(matrix)
}
