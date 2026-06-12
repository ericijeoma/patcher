//! Zero-Day Scanner (Mocked AST Execution Graph)
//!
//! This module models a simplified execution graph (AST) and demonstrates how
//! our continuous relaxation / gradient-descent engine can be chained to bypass
//! discrete branches and reach deeply buried vulnerabilities.

use crate::simulator::test_gradient_convergence;

pub mod heuristics;
pub mod explorer;

/// Simplified execution graph representing a compiled binary.
#[derive(Debug)]
pub enum AstNode {
    /// A standard discrete logic gate we must bypass (e.g., `if input == target`).
    Branch {
        target_value: f64,
        next_node: Box<AstNode>,
    },
    /// A memory corruption vulnerability we want to find.
    VulnerableBuffer {
        crash_trigger: f64,
    },
    /// Safe execution end.
    SafeExit,
}

/// Walks the AST and tries to discover a vulnerability.
///
/// - On `VulnerableBuffer`: returns `Ok("Zero-Day Found: Memory Corruption triggered!".to_string())`.
/// - On `SafeExit`: returns `Err("Program exited safely. No vulnerabilities found.".to_string())`.
/// - On `Branch`: uses `test_gradient_convergence` to find the bypass value.
pub fn scan_for_vulnerability(ast: AstNode) -> Result<String, String> {
    let mut logs: Vec<String> = Vec::new();
    let mut node = ast;

    loop {
        match node {
            AstNode::VulnerableBuffer { crash_trigger } => {
                logs.push(format!(
                    "Reached VulnerableBuffer node (crash_trigger={crash_trigger})"
                ));
                // Keep the required success message intact.
                let mut msg = "Zero-Day Found: Memory Corruption triggered!".to_string();
                if !logs.is_empty() {
                    msg.push('\n');
                    msg.push_str(&logs.join("\n"));
                }
                return Ok(msg);
            }
            AstNode::SafeExit => {
                return Err("Program exited safely. No vulnerabilities found.".to_string());
            }
            AstNode::Branch {
                target_value,
                next_node,
            } => {
                match test_gradient_convergence(target_value, 0.0, 0.5, 1000) {
                    Ok(bypass) => {
                        logs.push(format!(
                            "Bypassed Branch target={target_value} with bypass_value={bypass}"
                        ));
                        node = *next_node;
                    }
                    Err(_) => {
                        return Err("Scanner stalled at complex branch.".to_string());
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_zero_day() {
        let ast = AstNode::Branch {
            target_value: 42.0,
            next_node: Box::new(AstNode::Branch {
                target_value: 100.5,
                next_node: Box::new(AstNode::VulnerableBuffer {
                    crash_trigger: 1337.0,
                }),
            }),
        };

        let res = scan_for_vulnerability(ast);
        assert!(res.is_ok(), "expected to find a zero-day, got: {res:?}");
        let msg = res.unwrap();
        assert!(
            msg.contains("Zero-Day Found: Memory Corruption triggered!"),
            "unexpected message: {msg}"
        );
        assert!(msg.contains("Bypassed Branch target=42"));
        assert!(msg.contains("Bypassed Branch target=100.5"));
    }
}
