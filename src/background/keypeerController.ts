import { deriveKey } from '../crypto/kdf';
import { encrypt, decrypt } from '../crypto/aes';
import { loadKeypeerFile, saveKeypeerFile, isKeypeerInitialized } from '../storage/keypeerStore';
import type { KeypeerFile, KeypeerEntry } from '../storage/schema';
import type {
  KeypeerStatus,
  KeypeerEntryPublic,
  KeypeerMessage,
  KeypeerResponse,
} from '../messaging/protocol';
import * as session from './session';

const CHECK_TOKEN = 'keypeer-ok';

export function normalizeDomain(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().toLowerCase();
  try {
    if (!cleaned.includes('://')) {
      cleaned = 'https://' + cleaned;
    }
    const url = new URL(cleaned);
    let host = url.hostname;
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return raw.trim().toLowerCase().replace(/^www\./, '').split('/')[0].split(':')[0];
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function getStatus(): Promise<KeypeerStatus> {
  const file = await loadKeypeerFile();
  const initialized = file !== null;
  const unlocked = session.isUnlocked();
  return {
    initialized,
    unlocked,
    autoLockMinutes: file?.autoLockMinutes ?? session.getAutoLockMinutes(),
    entryCount: file?.entries.length,
  };
}

export async function init(masterPassword: string): Promise<void> {
  if (!masterPassword || masterPassword.length < 8) {
    throw new Error('Master password must be at least 8 characters');
  }
  if (await isKeypeerInitialized()) {
    throw new Error('Keypeer is already initialized');
  }

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(masterPassword, saltBytes);
  const checkBlob = await encrypt(key, CHECK_TOKEN);

  const newFile: KeypeerFile = {
    version: 1,
    salt: uint8ToBase64(saltBytes),
    check: checkBlob,
    autoLockMinutes: 5,
    entries: [],
  };

  await saveKeypeerFile(newFile);
  session.setKey(key, 5);
}

export async function unlock(masterPassword: string): Promise<void> {
  const file = await loadKeypeerFile();
  if (!file) {
    throw new Error('Keypeer is not initialized');
  }

  const saltBytes = base64ToUint8(file.salt);
  const key = await deriveKey(masterPassword, saltBytes);

  try {
    const verified = await decrypt(key, file.check);
    if (verified !== CHECK_TOKEN) {
      throw new Error('Invalid master password');
    }
  } catch {
    throw new Error('Invalid master password');
  }

  session.setKey(key, file.autoLockMinutes ?? 5);
}

export function lock(): void {
  session.clearKey();
}

function requireKey(): CryptoKey {
  const key = session.getKey();
  if (!key) {
    throw new Error('Keypeer is locked');
  }
  return key;
}

export async function listEntries(): Promise<KeypeerEntryPublic[]> {
  const key = requireKey();
  const file = await loadKeypeerFile();
  if (!file) return [];

  const publicEntries: KeypeerEntryPublic[] = [];
  for (const entry of file.entries) {
    const password = await decrypt(key, entry.password);
    let notes: string | undefined = undefined;
    if (entry.notes) {
      try {
        notes = await decrypt(key, entry.notes);
      } catch {
        notes = undefined;
      }
    }

    publicEntries.push({
      id: entry.id,
      domain: entry.domain,
      username: entry.username,
      password,
      notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  return publicEntries;
}

export async function addEntry(
  domain: string,
  username: string,
  password: string,
  notes?: string
): Promise<KeypeerEntryPublic> {
  const key = requireKey();
  const file = await loadKeypeerFile();
  if (!file) throw new Error('Keypeer is not initialized');

  const normalized = normalizeDomain(domain);
  if (!normalized) throw new Error('Domain is required');
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const encPassword = await encrypt(key, password);
  const encNotes = notes ? await encrypt(key, notes) : undefined;
  const now = Date.now();

  const newEntry: KeypeerEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `entry-${now}-${Math.random().toString(36).slice(2, 8)}`,
    domain: normalized,
    username: username.trim(),
    password: encPassword,
    notes: encNotes,
    createdAt: now,
    updatedAt: now,
  };

  file.entries.push(newEntry);
  await saveKeypeerFile(file);

  return {
    id: newEntry.id,
    domain: newEntry.domain,
    username: newEntry.username,
    password,
    notes,
    createdAt: newEntry.createdAt,
    updatedAt: newEntry.updatedAt,
  };
}

export async function updateEntry(
  id: string,
  fields: Partial<{ domain: string; username: string; password: string; notes: string }>
): Promise<KeypeerEntryPublic> {
  const key = requireKey();
  const file = await loadKeypeerFile();
  if (!file) throw new Error('Keypeer is not initialized');

  const entry = file.entries.find((e) => e.id === id);
  if (!entry) throw new Error('Entry not found');

  const now = Date.now();
  let decryptedPassword = await decrypt(key, entry.password);
  let decryptedNotes = entry.notes ? await decrypt(key, entry.notes).catch(() => '') : '';

  if (fields.domain !== undefined) {
    entry.domain = normalizeDomain(fields.domain);
  }
  if (fields.username !== undefined) {
    entry.username = fields.username.trim();
  }
  if (fields.password !== undefined) {
    entry.password = await encrypt(key, fields.password);
    decryptedPassword = fields.password;
  }
  if (fields.notes !== undefined) {
    entry.notes = fields.notes ? await encrypt(key, fields.notes) : undefined;
    decryptedNotes = fields.notes;
  }
  entry.updatedAt = now;

  await saveKeypeerFile(file);

  return {
    id: entry.id,
    domain: entry.domain,
    username: entry.username,
    password: decryptedPassword,
    notes: decryptedNotes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function deleteEntry(id: string): Promise<void> {
  requireKey();
  const file = await loadKeypeerFile();
  if (!file) throw new Error('Keypeer is not initialized');

  file.entries = file.entries.filter((e) => e.id !== id);
  await saveKeypeerFile(file);
}

export async function hasEntryForDomain(domain: string): Promise<boolean> {
  const file = await loadKeypeerFile();
  if (!file) return false;
  const target = normalizeDomain(domain);
  return file.entries.some((e) => {
    const entryDomain = normalizeDomain(e.domain);
    return entryDomain === target || target.endsWith('.' + entryDomain);
  });
}

export async function getMatchingCredentials(domain: string): Promise<KeypeerEntryPublic[]> {
  const key = session.getKey();
  if (!key) return []; // Return empty if locked

  const file = await loadKeypeerFile();
  if (!file) return [];

  const target = normalizeDomain(domain);
  const matching = file.entries.filter((e) => {
    const entryDomain = normalizeDomain(e.domain);
    return entryDomain === target || target.endsWith('.' + entryDomain);
  });

  const results: KeypeerEntryPublic[] = [];
  for (const entry of matching) {
    const password = await decrypt(key, entry.password);
    results.push({
      id: entry.id,
      domain: entry.domain,
      username: entry.username,
      password,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  return results;
}

export async function setAutoLock(minutes: number): Promise<void> {
  session.setAutoLockMinutes(minutes);
  const file = await loadKeypeerFile();
  if (file) {
    file.autoLockMinutes = minutes;
    await saveKeypeerFile(file);
  }
}

export async function exportBackup(): Promise<KeypeerFile> {
  const file = await loadKeypeerFile();
  if (!file) throw new Error('Keypeer is not initialized');
  return file;
}

export async function importBackup(file: KeypeerFile): Promise<void> {
  if (!file || file.version !== 1 || !file.salt || !file.check || !Array.isArray(file.entries)) {
    throw new Error('Invalid Keypeer backup file format');
  }

  session.clearKey();
  await saveKeypeerFile(file);
}

export async function changeMasterPassword(oldPassword: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New master password must be at least 8 characters');
  }

  const file = await loadKeypeerFile();
  if (!file) throw new Error('Keypeer is not initialized');

  // Verify old password
  const oldSalt = base64ToUint8(file.salt);
  const oldKey = await deriveKey(oldPassword, oldSalt);
  try {
    const check = await decrypt(oldKey, file.check);
    if (check !== CHECK_TOKEN) throw new Error('Old password is incorrect');
  } catch {
    throw new Error('Old password is incorrect');
  }

  // Decrypt all entries with old key
  const decryptedEntries: Array<{
    id: string;
    domain: string;
    username: string;
    passwordText: string;
    notesText?: string;
    createdAt: number;
    updatedAt: number;
  }> = [];

  for (const entry of file.entries) {
    const passwordText = await decrypt(oldKey, entry.password);
    const notesText = entry.notes ? await decrypt(oldKey, entry.notes).catch(() => undefined) : undefined;
    decryptedEntries.push({
      id: entry.id,
      domain: entry.domain,
      username: entry.username,
      passwordText,
      notesText,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  // Generate new salt and derive new key
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveKey(newPassword, newSalt);

  // Re-encrypt check token and all entries with new key
  const newCheck = await encrypt(newKey, CHECK_TOKEN);
  const newEntries: KeypeerEntry[] = [];

  for (const d of decryptedEntries) {
    const encPassword = await encrypt(newKey, d.passwordText);
    const encNotes = d.notesText ? await encrypt(newKey, d.notesText) : undefined;
    newEntries.push({
      id: d.id,
      domain: d.domain,
      username: d.username,
      password: encPassword,
      notes: encNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    });
  }

  file.salt = uint8ToBase64(newSalt);
  file.check = newCheck;
  file.entries = newEntries;

  await saveKeypeerFile(file);
  session.setKey(newKey, file.autoLockMinutes ?? 5);
}

export async function handleMessage(
  message: KeypeerMessage
): Promise<KeypeerResponse<any>> {
  try {
    switch (message.type) {
      case 'KEYPEER_STATUS':
        return { success: true, data: await getStatus() };
      case 'KEYPEER_INIT':
        await init(message.masterPassword);
        return { success: true, data: await getStatus() };
      case 'KEYPEER_UNLOCK':
        await unlock(message.masterPassword);
        return { success: true, data: await getStatus() };
      case 'KEYPEER_LOCK':
        lock();
        return { success: true, data: await getStatus() };
      case 'KEYPEER_LIST_ENTRIES':
        return { success: true, data: await listEntries() };
      case 'KEYPEER_ADD_ENTRY':
        return {
          success: true,
          data: await addEntry(
            message.domain,
            message.username,
            message.password,
            message.notes
          ),
        };
      case 'KEYPEER_UPDATE_ENTRY':
        return {
          success: true,
          data: await updateEntry(message.id, message.fields),
        };
      case 'KEYPEER_DELETE_ENTRY':
        await deleteEntry(message.id);
        return { success: true, data: null };
      case 'KEYPEER_HAS_ENTRY_FOR_DOMAIN':
        return {
          success: true,
          data: await hasEntryForDomain(message.domain),
        };
      case 'KEYPEER_GET_MATCHING_CREDENTIALS':
        return {
          success: true,
          data: await getMatchingCredentials(message.domain),
        };
      case 'KEYPEER_SET_AUTO_LOCK':
        await setAutoLock(message.minutes);
        return { success: true, data: null };
      case 'KEYPEER_EXPORT':
        return { success: true, data: await exportBackup() };
      case 'KEYPEER_IMPORT':
        await importBackup(message.file);
        return { success: true, data: await getStatus() };
      case 'KEYPEER_CHANGE_MASTER_PASSWORD':
        await changeMasterPassword(message.oldPassword, message.newPassword);
        return { success: true, data: await getStatus() };
      default:
        return {
          success: false,
          error: `Unknown message type: ${(message as any).type}`,
        };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Operation failed' };
  }
}
