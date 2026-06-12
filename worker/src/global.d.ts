// 1. Tell TS how to handle the raw WebAssembly module
declare module "*.wasm" {
  const value: WebAssembly.Module;
  export default value;
}

// 2. Tell TS about the internal wasm-bindgen memory bridge
declare module "*patcher_bg.js" {
  export function __wbg_set_wasm(wasm: any): void;
}


// 2. Tell TS about the internal wasm-bindgen memory bridge
declare module "../../pkg/patcher_bg.js" {
  export function __wbg_set_wasm(wasm: any): void;
}
