import { ARGON2_WASM_BASE64 } from './wasmBinary';

// Ensure globalThis.self and self.Module.wasmBinary are populated before argon2 evaluates
const g = globalThis as any;
if (typeof g.self === 'undefined') {
  g.self = g;
}
if (!g.Module || !g.Module.wasmBinary) {
  g.Module = g.Module || {};
  const binStr = atob(ARGON2_WASM_BASE64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  g.Module.wasmBinary = bytes;
}
