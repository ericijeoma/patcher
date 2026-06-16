/**
 * Hexis Telemetry Data Contract
 * Defines the strict boundary payload between the local WASM engine and the Cloudflare Worker.
 */

export const HEX_ADDRESS_REGEX = /^0x[0-9A-Fa-f]+$/;
export const SHA256_REGEX = /^[A-Fa-f0-9]{64}$/;

export interface AssemblySlice {
  address: string;
  instructions: string[];
  anomaly_type?: string;
  confidence?: number;
}

export interface BinaryTelemetryPayload {
  file_hash_sha256: string;
  architecture: string;
  format: string;
  virtual_base_address: string;
  total_instructions_decoded: number;
  basic_blocks_mapped: number;
  vulnerabilities_found: number;
  structural_mitigations: string[];
  audited_symbols: string[];
  assembly_slices: AssemblySlice[];
  metadata?: Record<string, unknown>;
}
