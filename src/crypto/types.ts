export interface EncryptedBlob {
  iv: string; // base64 encoded 96-bit (12 bytes) IV
  data: string; // base64 encoded ciphertext
}

export type DerivedKey = CryptoKey;
