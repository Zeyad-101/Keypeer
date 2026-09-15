import type { EncryptedBlob } from './types';

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoded as BufferSource
  );
  return {
    iv: toB64(iv.buffer),
    data: toB64(ciphertext),
  };
}

export async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const iv = fromB64(blob.iv);
  const data = fromB64(blob.data);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return new TextDecoder().decode(plainBuf);
}
