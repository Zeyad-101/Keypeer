import type { KeypeerFile } from './schema';

const STORAGE_KEY = 'keypeerFile';

export async function loadKeypeerFile(): Promise<KeypeerFile | null> {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return (result[STORAGE_KEY] as KeypeerFile) ?? null;
}

export async function saveKeypeerFile(file: KeypeerFile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: file });
}

export async function isKeypeerInitialized(): Promise<boolean> {
  const file = await loadKeypeerFile();
  return file !== null;
}

export async function clearKeypeerStore(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY]);
}
