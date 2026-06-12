//! Bytecode Lifter
//!
//! This module defines a tiny custom bytecode format (simulated machine code)
//! and lifts raw bytes into our mocked `AstNode` execution graph.

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic};
use crate::scanner::AstNode;

pub mod cfg;
pub mod state;

/// Lifts a raw bytecode stream to an `AstNode` execution graph.
///
/// ## Bytecode spec
/// - `0x00` = SAFE_EXIT
/// - `0xFF` = VULNERABLE_BUFFER
/// - `0x01` = BRANCH, followed by 8 bytes (little-endian f64 target), then the next instruction(s)
pub fn lift_bytes_to_ast(bytecode: &[u8]) -> Result<AstNode, String> {
    let (node, consumed) = parse_node(bytecode)?;
    if consumed != bytecode.len() {
        return Err(format!(
            "Trailing bytes after program end: consumed {consumed} of {}",
            bytecode.len()
        ));
    }
    Ok(node)
}

fn parse_node(bytes: &[u8]) -> Result<(AstNode, usize), String> {
    if bytes.is_empty() {
        return Err("Malformed bytecode: empty input".to_string());
    }

    match bytes[0] {
        0x00 => Ok((AstNode::SafeExit, 1)),
        0xFF => Ok((AstNode::VulnerableBuffer { crash_trigger: 0.0 }, 1)),
        0x01 => {
            if bytes.len() < 1 + 8 {
                return Err("Malformed bytecode: BRANCH missing f64 target".to_string());
            }
            let mut arr = [0u8; 8];
            arr.copy_from_slice(&bytes[1..9]);
            let target_value = f64::from_le_bytes(arr);
            if !target_value.is_finite() {
                return Err("Malformed bytecode: BRANCH target is non-finite".to_string());
            }
            let (next_node, consumed_next) = parse_node(&bytes[9..])?;
            Ok((
                AstNode::Branch {
                    target_value,
                    next_node: Box::new(next_node),
                },
                9 + consumed_next,
            ))
        }
        other => Err(format!("Malformed bytecode: unknown opcode 0x{other:02X}")),
    }
}

pub fn lift_native_instructions(instructions_bytes: &[u8], bitness: u32) -> Result<Vec<Mnemonic>, String> {
    if bitness != 32 && bitness != 64 {
        return Err("Unsupported bitness architecture".to_string());
      }

    let mut decoder = Decoder::with_ip(bitness, instructions_bytes, 0x0, DecoderOptions::NONE);
    let mut mnemonics = Vec::new();
    let mut instruction = Instruction::default();

    // Decode instructions sequentially from the byte stream
    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        mnemonics.push(instruction.mnemonic());
    }

    Ok(mnemonics)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scanner::scan_for_vulnerability;

    #[test]
    fn test_end_to_end_zero_day_hunt() {
        let mut bytes: Vec<u8> = Vec::new();

        bytes.push(0x01);
        bytes.extend_from_slice(&42.0f64.to_le_bytes());
        bytes.push(0x01);
        bytes.extend_from_slice(&100.5f64.to_le_bytes());
        bytes.push(0xFF);

        let ast = lift_bytes_to_ast(&bytes).expect("expected lift to succeed");
        let res = scan_for_vulnerability(ast);
        assert!(res.is_ok(), "expected Ok, got: {res:?}");
        let msg = res.unwrap();
        assert!(msg.contains("Zero-Day Found"), "unexpected msg: {msg}");
    }

    #[test]
    fn test_native_instruction_decoding() {
        let bytes = [0x48, 0x83, 0xEC, 0x28];
        let mnemonics = lift_native_instructions(&bytes, 64).expect("Decoding should succeed");
        assert_eq!(mnemonics[0], Mnemonic::Sub);
    }
}
