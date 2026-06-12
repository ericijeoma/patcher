use crate::lifter::state::{ExecutionState, SymbolicValue};
use iced_x86::Register;

/// Security vulnerability classification types.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VulnerabilityType {
    StackBufferOverflow,
    UninitializedMemoryRead,
    DangerousSinkViolation,
}

/// Structured alert emitted when a security constraint is violated.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VulnerabilityAlert {
    pub vuln_type: VulnerabilityType,
    pub description: String,
    pub address_offset: u64,
}

/// Taint propagation and vulnerability heuristic engine.
pub struct HeuristicEngine;

impl HeuristicEngine {
    /// Evaluates an abstract state change and checks for vulnerability bounds violations.
    /// Returns an alert if a security constraint is broken.
    pub fn evaluate_state_mutation(
        state: &mut ExecutionState,
        op: &str,
        dst: Register,
        src: SymbolicValue,
        addr_offset: u64
    ) -> Option<VulnerabilityAlert> {
        match op {
            "MOV" => {
                if src == SymbolicValue::Uninitialized {
                    return Some(VulnerabilityAlert {
                        vuln_type: VulnerabilityType::UninitializedMemoryRead,
                        description: format!("Read from uninitialized storage into register {:?}", dst),
                        address_offset: addr_offset,
                    });
                }
                state.set_register(dst, src);
            },
            "ADD" => {
                let current_dst = state.get_register(dst);
                match (current_dst, src) {
                    (SymbolicValue::StackOffset(curr), SymbolicValue::Concrete(val)) => {
                        // Use wrapping to prevent panic on high-memory address manipulation
                        let safe_offset = curr.wrapping_add(val as i64);
                        state.set_register(dst, SymbolicValue::StackOffset(safe_offset));
                    },
                    (SymbolicValue::Tainted(source), _) => {
                        state.set_register(dst, SymbolicValue::Tainted(source));
                    },
                    _ => {}
                }
            },
            "SUB" => {
                let current_dst = state.get_register(dst);
                match (current_dst, src) {
                    (SymbolicValue::StackOffset(curr), SymbolicValue::Concrete(val)) => {
                        let safe_offset = curr.wrapping_sub(val as i64);
                        state.set_register(dst, SymbolicValue::StackOffset(safe_offset));
                    },
                    (SymbolicValue::Tainted(source), _) => {
                        state.set_register(dst, SymbolicValue::Tainted(source));
                    },
                    _ => {}
                }
            },
            _ => {}
        }
        None
    }

    /// Evaluates a direct stack write operation for potential buffer overflows.
    pub fn check_stack_write(
        state: &mut ExecutionState,
        offset_from_rsp: i64,
        value: SymbolicValue,
        addr_offset: u64
    ) -> Option<VulnerabilityAlert> {
        if let SymbolicValue::Tainted(ref source) = value {
            if let SymbolicValue::StackOffset(current_rsp) = state.get_register(Register::RSP) {
                let absolute_offset = current_rsp.wrapping_add(offset_from_rsp);

                if absolute_offset >= 0 {
                    return Some(VulnerabilityAlert {
                        vuln_type: VulnerabilityType::StackBufferOverflow,
                        description: format!(
                            "Tainted data from source '{}' directly overwrote stack control boundary at absolute offset {}",
                            source, absolute_offset
                        ),
                        address_offset: addr_offset,
                    });
                }
            }
        }

        state.write_stack(offset_from_rsp, value);
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lifter::state::ExecutionState;
    use iced_x86::Register;

    #[test]
    fn test_heuristics_detect_stack_overflow() {
        let mut state = ExecutionState::new();

        HeuristicEngine::evaluate_state_mutation(&mut state, "SUB", Register::RSP, SymbolicValue::Concrete(32), 0x1000);

        let untrusted_payload = SymbolicValue::Tainted("recv".to_string());

        let safe_alert = HeuristicEngine::check_stack_write(&mut state, 8, untrusted_payload.clone(), 0x1004);
        assert!(safe_alert.is_none());

        let exploit_alert = HeuristicEngine::check_stack_write(&mut state, 32, untrusted_payload, 0x1008);

        assert!(exploit_alert.is_some());
        let alert = exploit_alert.unwrap();
        assert_eq!(alert.vuln_type, VulnerabilityType::StackBufferOverflow);
        assert!(alert.description.contains("overwrote stack control boundary"));
    }

    #[test]
    fn test_heuristics_detect_uninitialized_read() {
        let mut state = ExecutionState::new();

        let alert = HeuristicEngine::evaluate_state_mutation(
            &mut state,
            "MOV",
            Register::RAX,
            SymbolicValue::Uninitialized,
            0x2000
        );

        assert!(alert.is_some());
        assert_eq!(alert.unwrap().vuln_type, VulnerabilityType::UninitializedMemoryRead);
    }
}
