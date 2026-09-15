import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/crypto/aes';

describe('AES-GCM encrypt/decrypt', () => {
  it('round-trips plaintext', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const blob = await encrypt(key, 'hunter2');
    const result = await decrypt(key, blob);
    expect(result).toBe('hunter2');
  });

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const a = await encrypt(key, 'same');
    const b = await encrypt(key, 'same');
    expect(a.data).not.toBe(b.data);
    expect(a.iv).not.toBe(b.iv);
  });

  it('fails to decrypt if ciphertext is tampered', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const blob = await encrypt(key, 'secret password');
    const tamperedBlob = { ...blob, data: btoa('tampered data content!!') };
    await expect(decrypt(key, tamperedBlob)).rejects.toThrow();
  });
});
