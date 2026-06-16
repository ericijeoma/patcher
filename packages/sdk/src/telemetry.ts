/**
 * Telemetry Data Contract - Phase 2
 *
 * This file defines the strict TypeScript boundaries for telemetry payloads
 * exchanged between the local client and Cloudflare Hono worker.
 *
 * Rules:
 * - No raw file buffers permitted
 * - All addresses must be strict hex format
 * - No raw ASCII dumps in instruction data
 * - Deep validation required before transmission
 */

export interface BinaryTelemetryPayload {
  /**
   * SHA-256 hash of the analyzed file
   * Format: 64-character hexadecimal string
   */
  file_hash_sha256: string;

  /**
   * Target architecture of the binary
   * Examples: 'x86', 'x86_64', 'arm', 'aarch64'
   */
  architecture: string;

  /**
   * Binary format type
   * Examples: 'PE', 'ELF', 'MACH-O'
   */
  format: string;

  /**
   * Virtual base address where the binary is loaded
   * Format: hexadecimal string starting with '0x'
   */
  virtual_base_address: string;

  /**
   * Total number of instructions successfully decoded
   */
  total_instructions_decoded: number;

  /**
   * Number of basic blocks mapped in the control flow graph
   */
  basic_blocks_mapped: number;

  /**
   * Number of vulnerabilities detected during analysis
   */
  vulnerabilities_found: number;

  /**
   * Structural mitigations present in the binary
   * Examples: ['DEP', 'ASLR', 'CFG', 'SafeSEH']
   */
  structural_mitigations: string[];

  /**
   * Symbols that were audited during analysis
   * Format: array of symbol names
   */
  audited_symbols: string[];

  /**
   * Assembly slices containing suspicious patterns
   * Each slice contains address and disassembly information
   */
  assembly_slices: AssemblySlice[];

  /**
   * Additional metadata about the analysis
   */
  metadata?: {
    analysis_timestamp?: string;
    engine_version?: string;
    [key: string]: unknown;
  };
}

export interface AssemblySlice {
  /**
   * Virtual address of the slice
   * Format: hexadecimal string starting with '0x'
   */
  address: string;

  /**
   * Disassembled instructions
   * No raw ASCII dumps allowed - only structured disassembly
   */
  instructions: string[];

  /**
   * Type of anomaly detected in this slice
   */
  anomaly_type?: string;

  /**
   * Confidence score (0-1)
   */
  confidence?: number;
}

/**
 * Hex address validation regex
 * Must start with '0x' followed by hexadecimal digits
 */
export const HEX_ADDRESS_REGEX = /^0x[0-9A-Fa-f]+$/;

/**
 * SHA-256 hash validation regex
 * Must be exactly 64 hexadecimal characters
 */
export const SHA256_REGEX = /^[0-9a-f]{64}$/;
