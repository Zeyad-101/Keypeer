import { describe, it, expect } from 'vitest';
import { deriveKey } from '../../src/crypto/kdf';
import { encrypt, decrypt } from '../../src/crypto/aes';

describe('Argon2id key derivation', () => {
  it('derives the same key for same password+salt', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const k1 = await deriveKey('correct horse battery staple', salt, {
      time: 1,
      mem: 1024,
      parallelism: 1,
      extractable: true,
    });
    const k2 = await deriveKey('correct horse battery staple', salt, {
      time: 1,
      mem: 1024,
      parallelism: 1,
      extractable: true,
    });

    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));

    // Also verify cross-encryption roundtrip
    const blob = await encrypt(k1, 'cross-check-payload');
    const decrypted = await decrypt(k2, blob);
    expect(decrypted).toBe('cross-check-payload');
  });

  it('derives different keys for different passwords', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const k1 = await deriveKey('password-one', salt, {
      time: 1,
      mem: 1024,
      parallelism: 1,
      extractable: true,
    });
    const k2 = await deriveKey('password-two', salt, {
      time: 1,
      mem: 1024,
      parallelism: 1,
      extractable: true,
    });

    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));

    // Decryption with wrong key must fail
    const blob = await encrypt(k1, 'secret message');
    await expect(decrypt(k2, blob)).rejects.toThrow();
  });
});
