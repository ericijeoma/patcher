/* tslint:disable */
/* eslint-disable */

/**
 * Monolith facade boundary for JS callers.
 *
 * Always returns a JSON string.
 * - Success: serialized `BinaryMetadata`
 * - Error: `{ "error": "..." }`
 */
export function analyze_binary(file_bytes: Uint8Array): string;

/**
 * WASM interface for the static analysis engine.
 *
 * Routes the raw byte array into the ingestion engine and returns the anomaly summary.
 * Always returns a JSON string.
 * - Success: anomaly summary JSON
 * - Error: `{ "error": "..." }`
 */
export function analyze_binary_buffer(buffer: Uint8Array): string;

/**
 * Generates a standalone WGSL compute shader that represents a continuous relaxation
 * (sigmoid-based penalty manifold) for a parsed binary.
 *
 * Always returns a JSON string:
 * - Success: `{ "wgsl": "..." }`
 * - Error: `{ "error": "..." }`
 */
export function generate_shader_manifold(file_bytes: Uint8Array): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly analyze_binary: (a: number, b: number, c: number) => void;
    readonly analyze_binary_buffer: (a: number, b: number, c: number) => void;
    readonly generate_shader_manifold: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
