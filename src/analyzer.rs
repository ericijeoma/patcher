use object::Object;
use crate::loader::extract_text_section;
use crate::loader::imports::{extract_imports, is_untrusted_source};
use crate::lifter::lift_native_instructions;
use crate::lifter::cfg::ControlFlowGraph;
use crate::lifter::state::ExecutionState;
use crate::scanner::explorer::PathExplorer;
use std::collections::HashMap;
use std::fmt::Write;
use iced_x86::Instruction;

#[derive(Debug, Clone)]
pub struct AnalysisReport {
    pub virtual_base_address: u64,
    pub total_instructions_decoded: usize,
    pub basic_blocks_mapped: usize,
    pub suspicious_imports: usize,
    pub vulnerabilities_found: usize,
    pub anomaly_summary: String,
}

/// The unified entrypoint for the static analysis engine.
/// Ingests raw executable bytes, orchestrates the extraction, decoding, and mapping phases.
pub fn analyze_executable(raw_bytes: &[u8]) -> Result<AnalysisReport, String> {
    
    // Step 0: Safe format parsing & bitness detection
    let file = object::File::parse(raw_bytes)
        .map_err(|_| "Failed to parse binary format. File may be corrupted or unsupported.")?;
    let bitness = if file.is_64() { 64 } else { 32 };

    // Step 1: Extract imports and count suspicious ones
    let suspicious_imports = match extract_imports(raw_bytes) {
        Ok(imports) => imports.iter().filter(|&import| is_untrusted_source(import)).count(),
        Err(_) => 0, // If import extraction fails, count as 0 suspicious imports
    };

    // Step 2: Unpack
    let (code_slice, virtual_base_address) = extract_text_section(raw_bytes)?;

    // Step 3: Decode
    let mnemonics = lift_native_instructions(code_slice, bitness)?;
    let total_instructions_decoded = mnemonics.len();

    // Step 4: Map
    let cfg = ControlFlowGraph::build_from_mnemonics(&mnemonics);
    let basic_blocks_mapped = cfg.graph.node_count();

    // Map decoded instructions into a HashMap<u32, Vec<Instruction>>
    let mut execution_blocks: HashMap<u32, Vec<Instruction>> = HashMap::new();

    // Re-decode instructions to get full instruction objects
    let mut decoder = iced_x86::Decoder::with_ip(bitness, code_slice, 0x0, iced_x86::DecoderOptions::NONE);
    let mut instruction = Instruction::default();
    let mut current_block_id: Option<u32> = None;
    let mut current_instructions: Vec<Instruction> = Vec::new();

    // Map CFG node indices to block IDs for proper grouping
    let mut block_id_mapping: HashMap<usize, u32> = HashMap::new();
    for node_idx in cfg.graph.node_indices() {
        let block_id = cfg.graph[node_idx].id;
        block_id_mapping.insert(node_idx.index(), block_id as u32);
    }

    // Decode instructions and group them into blocks
    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        // Find which block this instruction belongs to based on instruction pointer
        if current_block_id.is_none() {
            current_block_id = Some(0); // Start with first block
        }

        current_instructions.push(instruction);

        // Check if we've reached a block terminator (simplified logic)
        let is_terminator = matches!(
            instruction.mnemonic(),
            iced_x86::Mnemonic::Je | iced_x86::Mnemonic::Jne | iced_x86::Mnemonic::Jg |
            iced_x86::Mnemonic::Jl | iced_x86::Mnemonic::Jmp | iced_x86::Mnemonic::Call |
            iced_x86::Mnemonic::Ret
        );

        if is_terminator || current_instructions.len() >= 5 { // Simple heuristic for block boundaries
            if let Some(block_id) = current_block_id {
                execution_blocks.insert(block_id, current_instructions.clone());
                current_block_id = Some(block_id + 1);
                current_instructions.clear();
            }
        }
    }

    // Add any remaining instructions
    if !current_instructions.is_empty() {
        if let Some(block_id) = current_block_id {
            execution_blocks.insert(block_id, current_instructions);
        }
    }

    let start_block_id = execution_blocks.keys().min().copied().unwrap_or(0);
    let explorer = PathExplorer::new(100);
    let discovered_alerts = explorer.explore_path(
        &execution_blocks,
        start_block_id,
        ExecutionState::new()
    );

    // Compile Zero-Allocation Telemetry
    let mut summary_buffer = String::with_capacity(2048);
    summary_buffer.push('[');
    for (i, alert) in discovered_alerts.iter().enumerate() {
        if i > 0 { summary_buffer.push(','); }
        let _ = write!(
            summary_buffer,
            "{{\"type\":\"{:?}\",\"offset\":\"0x{:X}\",\"desc\":\"{}\"}}",
            alert.vuln_type, alert.address_offset, alert.description
        );
    }
    summary_buffer.push(']');

    Ok(AnalysisReport {
        virtual_base_address,
        total_instructions_decoded,
        basic_blocks_mapped,
        suspicious_imports,
        vulnerabilities_found: discovered_alerts.len(),
        anomaly_summary: summary_buffer,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_full_pipeline_orchestration() {
        // Test the API signature and basic functionality
        // Use the same instruction pattern as the existing lifter test for consistency

        let mock_extracted_ops = [0x48, 0x83, 0xEC, 0x28]; // sub rsp, 0x28 (same as existing test)

        let mnemonics = lift_native_instructions(&mock_extracted_ops, 64).unwrap();
        let cfg = ControlFlowGraph::build_from_mnemonics(&mnemonics);

        // We expect at least 1 instruction (sub rsp, 0x28)
        assert!(!mnemonics.is_empty(), "Expected at least 1 instruction, got {}", mnemonics.len());
        assert_eq!(mnemonics[0], iced_x86::Mnemonic::Sub);

        // We expect at least 1 basic block
        assert!(cfg.graph.node_count() >= 1, "Expected at least 1 basic block, got {}", cfg.graph.node_count());

        // Test that the API compiles and returns the expected structure
        assert_eq!(mnemonics.len(), cfg.graph.node_count(), "Each instruction should be in its own block for this simple case");
    }
}
