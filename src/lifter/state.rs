use std::collections::BTreeMap;
use iced_x86::Register;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SymbolicValue {
    Uninitialized,
    Concrete(u64),
    StackOffset(i64),
    Tainted(String), // Tracks the source of the taint (e.g., "recv")
    Unknown,
}

#[derive(Debug, Clone)]
pub struct ExecutionState {
    pub registers: BTreeMap<Register, SymbolicValue>,
    pub stack: BTreeMap<i64, SymbolicValue>,
}

impl ExecutionState {
    /// Initializes a clean virtual CPU state with base stack references.
    pub fn new() -> Self {
        let mut registers = BTreeMap::new();
        // Establish symbolic base points for stack pointers
        registers.insert(Register::RSP, SymbolicValue::StackOffset(0));
        registers.insert(Register::RBP, SymbolicValue::StackOffset(0));

        Self {
            registers,
            stack: BTreeMap::new(),
        }
    }

    /// Sets the symbolic value of a CPU register.
    pub fn set_register(&mut self, reg: Register, val: SymbolicValue) {
        self.registers.insert(reg, val);
    }

    /// Retrieves the current symbolic value of a CPU register. Defers to Uninitialized if missing.
    pub fn get_register(&self, reg: Register) -> SymbolicValue {
        self.registers.get(&reg).cloned().unwrap_or(SymbolicValue::Uninitialized)
    }

    /// Simulates a stack manipulation event (e.g., RSP allocations/deallocations).
    pub fn modify_stack_pointer(&mut self, offset_delta: i64) {
        if let SymbolicValue::StackOffset(current_offset) = self.get_register(Register::RSP) {
            self.set_register(Register::RSP, SymbolicValue::StackOffset(current_offset + offset_delta));
        }
    }

    /// Writes a symbolic value into a specific memory offset relative to the current stack pointer.
    pub fn write_stack(&mut self, offset_from_rsp: i64, val: SymbolicValue) {
        if let SymbolicValue::StackOffset(current_rsp) = self.get_register(Register::RSP) {
            let absolute_offset = current_rsp + offset_from_rsp;
            self.stack.insert(absolute_offset, val);
        }
    }

    /// Reads a symbolic value from a memory offset relative to the current stack pointer.
    pub fn read_stack(&self, offset_from_rsp: i64) -> SymbolicValue {
        if let SymbolicValue::StackOffset(current_rsp) = self.get_register(Register::RSP) {
            let absolute_offset = current_rsp + offset_from_rsp;
            self.stack.get(&absolute_offset).cloned().unwrap_or(SymbolicValue::Uninitialized)
        } else {
            SymbolicValue::Unknown
        }
    }
}

impl Default for ExecutionState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use iced_x86::Register;

    #[test]
    fn test_virtual_stack_and_register_tracking() {
        let mut state = ExecutionState::new();

        // 1. Verify initialization
        assert_eq!(state.get_register(Register::RSP), SymbolicValue::StackOffset(0));
        assert_eq!(state.get_register(Register::RAX), SymbolicValue::Uninitialized);

        // 2. Simulate standard x86_64 prologue function stack allocation: sub rsp, 0x28 (40 bytes)
        state.modify_stack_pointer(-40);
        assert_eq!(state.get_register(Register::RSP), SymbolicValue::StackOffset(-40));

        // 3. Write a value to the local stack frame space and read it back
        let secret_payload = SymbolicValue::Concrete(0xDEADBEEF);
        state.write_stack(8, secret_payload.clone());

        // Reading from the same relative position must yield the concrete payload
        assert_eq!(state.read_stack(8), secret_payload);

        // Reading from an unwritten frame offset must return Uninitialized
        assert_eq!(state.read_stack(16), SymbolicValue::Uninitialized);
    }
}
