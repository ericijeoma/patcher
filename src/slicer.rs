use iced_x86::{Decoder, DecoderOptions, Formatter, NasmFormatter, Instruction};

/// Slices a strict window of assembly instructions around a target offset.
/// Returns a vector of plain-text assembly strings for the cloud payload.
pub fn slice_assembly(
    text_section_bytes: &[u8],
    section_base_address: u64,
    target_offset: u64,
    bitness: u32,
) -> Vec<String> {
    // Determine how far back we want to look (e.g., 20 bytes before the target call)
    let slice_start = if target_offset > 20 { target_offset - 20 } else { 0 };
    
    // Safety boundary: Ensure we don't read past the text section
    let end_index = (slice_start as usize + 64).min(text_section_bytes.len());
    let slice_bytes = &text_section_bytes[(slice_start as usize)..end_index];

    let mut decoder = Decoder::with_ip(
        bitness,
        slice_bytes,
        section_base_address + slice_start,
        DecoderOptions::NONE,
    );

    let mut formatter = NasmFormatter::new();
    let mut instructions = Vec::new();
    let mut instruction = Instruction::default();

    // Decode up to 10 instructions to form the context window
    let mut count = 0;
    while decoder.can_decode() && count < 10 {
        decoder.decode_out(&mut instruction);
        let mut output = String::new();
        formatter.format(&instruction, &mut output);
        
        // Mark the exact target line so the LLM knows where the sink is
        if instruction.ip() == section_base_address + target_offset {
            instructions.push(format!("-> {:016X} {}", instruction.ip(), output));
        } else {
            instructions.push(format!("   {:016X} {}", instruction.ip(), output));
        }
        count += 1;
    }

    instructions
}
