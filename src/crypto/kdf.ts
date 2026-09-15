import './wasmInit';
// @ts-expect-error bundled distribution has no separate types
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

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

export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
  options?: KdfOptions
): Promise<CryptoKey> {
  const opts = { ...DEFAULT_KDF_OPTIONS, ...options };

  const argonModule = (argon2 as any).default || argon2;

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
