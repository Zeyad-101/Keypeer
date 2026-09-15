import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadKeypeerFile,
  saveKeypeerFile,
  isKeypeerInitialized,
  clearKeypeerStore,
} from '../../src/storage/keypeerStore';
import type { KeypeerFile } from '../../src/storage/schema';

const store: Record<string, any> = {};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  // Chrome storage mock
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: (keys: string[]) =>
          Promise.resolve(Object.fromEntries(keys.map((k) => [k, store[k]]))),
        set: (obj: Record<string, any>) => {
          Object.assign(store, obj);
          return Promise.resolve();
        },
        remove: (keys: string[]) => {
          keys.forEach((k) => delete store[k]);
          return Promise.resolve();
        },
      },
    },
  };
});

describe('keypeerStore', () => {
  it('returns null when uninitialized', async () => {
    expect(await loadKeypeerFile()).toBeNull();
    expect(await isKeypeerInitialized()).toBe(false);
  });

  it('saves and loads a keypeer file', async () => {
    const file: KeypeerFile = {
      version: 1,
      salt: 'c2FsdA==',
      check: { iv: 'ivb64==', data: 'datab64==' },
      entries: [],
    };
    await saveKeypeerFile(file);
    expect(await loadKeypeerFile()).toEqual(file);
    expect(await isKeypeerInitialized()).toBe(true);
  });

  it('clears storage', async () => {
    const file: KeypeerFile = {
      version: 1,
      salt: 'c2FsdA==',
      check: { iv: 'ivb64==', data: 'datab64==' },
      entries: [],
    };
    await saveKeypeerFile(file);
    await clearKeypeerStore();
    expect(await isKeypeerInitialized()).toBe(false);
  });
});
