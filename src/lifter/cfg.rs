use iced_x86::Mnemonic;
use petgraph::graph::{DiGraph, NodeIndex};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BranchType {
    Unconditional, // JMP
    ConditionTrue, // JE, JNE, JG, JL (Branch taken)
    ConditionFalse,// Fall-through when condition fails
    Call,          // Subroutine invocation
    Return,        // Block terminal
}

#[derive(Debug, Clone)]
pub struct BasicBlock {
    pub id: usize,
    pub instructions: Vec<Mnemonic>,
}

pub struct ControlFlowGraph {
    pub graph: DiGraph<BasicBlock, BranchType>,
}

impl ControlFlowGraph {
    pub fn build_from_mnemonics(mnemonics: &[Mnemonic]) -> Self {
        let mut graph = DiGraph::new();
        let mut current_instrs = Vec::new();
        let mut prev_node: Option<NodeIndex> = None;
        let mut block_id = 0;

        let add_basic_block = |instructions: Vec<Mnemonic>, graph_ref: &mut DiGraph<BasicBlock, BranchType>, prev_node_option: &mut Option<NodeIndex>, current_block_id: &mut usize| -> Option<NodeIndex> {
            if instructions.is_empty() {
                return None;
            }

            let block = BasicBlock {
                id: *current_block_id,
                instructions: instructions.clone(), // Clone to retain for analysis
            };
            let node = graph_ref.add_node(block);

            if let Some(p_node) = *prev_node_option {
                let prev_block_last_mnemonic = graph_ref[p_node].instructions.last().unwrap();
                let branch_type = if matches!(prev_block_last_mnemonic, Mnemonic::Je | Mnemonic::Jne | Mnemonic::Jg | Mnemonic::Jl) {
                    BranchType::ConditionFalse // This is the fall-through edge from a conditional branch
                } else if matches!(prev_block_last_mnemonic, Mnemonic::Jmp) {
                    BranchType::Unconditional // This edge should actually not exist if Jmp is a terminal instruction
                } else if matches!(prev_block_last_mnemonic, Mnemonic::Call) {
                    BranchType::Call // This is the return path (implied fall-through after call)
                } else if matches!(prev_block_last_mnemonic, Mnemonic::Ret) {
                    BranchType::Return // This edge should not exist if Ret is a terminal instruction
                } else {
                    BranchType::Unconditional // Default fall-through for sequential execution
                };
                // Only add an edge if the previous block is not a terminal instruction that prevents fall-through
                if !matches!(prev_block_last_mnemonic, Mnemonic::Jmp | Mnemonic::Ret) {
                     graph_ref.add_edge(p_node, node, branch_type);
                }
            }
            *prev_node_option = Some(node);
            *current_block_id += 1;
            Some(node)
        };

        for &mnemonic in mnemonics {
            let is_conditional_branch = matches!(mnemonic, Mnemonic::Je | Mnemonic::Jne | Mnemonic::Jg | Mnemonic::Jl);
            let is_unconditional_branch = matches!(mnemonic, Mnemonic::Jmp);
            let is_call = matches!(mnemonic, Mnemonic::Call);
            let _is_return = matches!(mnemonic, Mnemonic::Ret);

            let is_block_terminator = is_conditional_branch || is_unconditional_branch || is_call;

            // If we hit a branch instruction and have accumulated instructions, create a block first
            if is_block_terminator && !current_instrs.is_empty() {
                add_basic_block(std::mem::take(&mut current_instrs), &mut graph, &mut prev_node, &mut block_id);
            }

            current_instrs.push(mnemonic);

            // A basic block ends if the current instruction is a conditional/unconditional branch or call.
            // These instructions should be in their own blocks.
            // Returns can be part of the same block as preceding instructions.
            if is_conditional_branch || is_unconditional_branch || is_call {
                add_basic_block(std::mem::take(&mut current_instrs), &mut graph, &mut prev_node, &mut block_id);
            }
        }

        // After the loop, add any remaining instructions as the last basic block.
        add_basic_block(current_instrs, &mut graph, &mut prev_node, &mut block_id);

        ControlFlowGraph { graph }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conditional_branch_mapping() {
        let mnemonics = vec![
            Mnemonic::Mov,
            Mnemonic::Cmp,
            Mnemonic::Je,
            Mnemonic::Add,
            Mnemonic::Ret,
        ];

        let cfg = ControlFlowGraph::build_from_mnemonics(&mnemonics);

        // Expected 3 basic blocks:
        // 0: Mov, Cmp
        // 1: Je
        // 2: Add, Ret

        assert_eq!(cfg.graph.node_count(), 3, "Expected 3 blocks");

        let mut nodes = cfg.graph.node_weights().collect::<Vec<&BasicBlock>>();
        nodes.sort_by_key(|b| b.id);

        assert_eq!(nodes[0].instructions, vec![Mnemonic::Mov, Mnemonic::Cmp]);
        assert_eq!(nodes[1].instructions, vec![Mnemonic::Je]);
        assert_eq!(nodes[2].instructions, vec![Mnemonic::Add, Mnemonic::Ret]);

        // Expected edges:
        // Block 0 (Mov, Cmp) -> Block 1 (Je) : Unconditional (fall-through)
        // Block 1 (Je) -> Block 2 (Add, Ret) : ConditionFalse (fall-through when condition fails)

        let node0_id = cfg.graph.node_indices().find(|&n_idx| cfg.graph[n_idx].id == 0).unwrap();
        let node1_id = cfg.graph.node_indices().find(|&n_idx| cfg.graph[n_idx].id == 1).unwrap();
        let node2_id = cfg.graph.node_indices().find(|&n_idx| cfg.graph[n_idx].id == 2).unwrap();

        // Check edge from node0 to node1
        let edge01 = cfg.graph.find_edge(node0_id, node1_id).expect("Expected edge from block 0 to 1");
        assert_eq!(cfg.graph[edge01], BranchType::Unconditional, "Edge 0-1 should be Unconditional");

        // Check edge from node1 to node2
        let edge12 = cfg.graph.find_edge(node1_id, node2_id).expect("Expected edge from block 1 to 2");
        assert_eq!(cfg.graph[edge12], BranchType::ConditionFalse, "Edge 1-2 should be ConditionFalse");
    }
}
