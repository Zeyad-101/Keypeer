import type { EncryptedBlob } from '../crypto/types';

export interface KeypeerEntry {
  id: string;
  domain: string;
  username: string;
  password: EncryptedBlob;
  notes?: EncryptedBlob;
  createdAt: number;
  updatedAt: number;
}

export interface KeypeerFile {
  version: 1;
  salt: string; // base64 encoded salt (16 bytes)
  check: EncryptedBlob; // encrypted sentinel string "keypeer-ok" to validate master password
  autoLockMinutes?: number;
  entries: KeypeerEntry[];
}
