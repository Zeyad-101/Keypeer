import { ARGON2_WASM_BASE64 } from './wasmBinary';

export interface KdfOptions {
  time?: number;
  mem?: number;
  parallelism?: number;
  hashLen?: number;
  extractable?: boolean;
}

const DEFAULT_KDF_OPTIONS: Required<KdfOptions> = {
  time: 3,
  mem: 65536, // 64 MB
  parallelism: 4,
  hashLen: 32, // 256-bit key
  extractable: false,
};

function ensureWasmBinary(): void {
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
}

export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
  options?: KdfOptions
): Promise<CryptoKey> {
  ensureWasmBinary();
  const opts = { ...DEFAULT_KDF_OPTIONS, ...options };

  // Import pre-bundled JS without external wasm file imports
  // @ts-expect-error bundled distribution has no separate types
  const argonModuleImport = await import('argon2-browser/dist/argon2-bundled.min.js');
  const argonModule = (argonModuleImport as any).default || argonModuleImport;

  const result = await argonModule.hash({
    pass: masterPassword,
    salt,
    time: opts.time,
    mem: opts.mem,
    parallelism: opts.parallelism,
    hashLen: opts.hashLen,
    type: argonModule.ArgonType.Argon2id,
  });

  return crypto.subtle.importKey(
    'raw',
    result.hash,
    { name: 'AES-GCM' },
    opts.extractable,
    ['encrypt', 'decrypt']
  );
}
