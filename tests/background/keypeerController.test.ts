import { describe, it, expect, beforeEach } from 'vitest';
import * as controller from '../../src/background/keypeerController';
import * as session from '../../src/background/session';

const store: Record<string, any> = {};

beforeEach(() => {
  session.clearKey();
  Object.keys(store).forEach((k) => delete store[k]);
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

describe('keypeerController', () => {
  it('reports uninitialized status initially', async () => {
    const status = await controller.getStatus();
    expect(status.initialized).toBe(false);
    expect(status.unlocked).toBe(false);
  });

  it('initializes vault and remains unlocked in session', async () => {
    await controller.init('super-master-password-123');
    const status = await controller.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.unlocked).toBe(true);
    expect(status.entryCount).toBe(0);
  });

  it('locks and rejects listEntries when locked', async () => {
    await controller.init('super-master-password-123');
    controller.lock();
    const status = await controller.getStatus();
    expect(status.unlocked).toBe(false);

    await expect(controller.listEntries()).rejects.toThrow('Keypeer is locked');
  });

  it('unlocks with correct password and rejects wrong password', async () => {
    await controller.init('super-master-password-123');
    controller.lock();

    // Wrong password
    await expect(controller.unlock('wrong-password')).rejects.toThrow('Invalid master password');
    expect((await controller.getStatus()).unlocked).toBe(false);

    // Correct password
    await controller.unlock('super-master-password-123');
    expect((await controller.getStatus()).unlocked).toBe(true);
  });

  it('performs full CRUD lifecycle for credentials', async () => {
    await controller.init('super-master-password-123');

    // Add entry
    const added = await controller.addEntry(
      'https://github.com/login',
      'alice@example.com',
      'hunter2-github',
      'developer account'
    );
    expect(added.domain).toBe('github.com');
    expect(added.username).toBe('alice@example.com');
    expect(added.password).toBe('hunter2-github');
    expect(added.notes).toBe('developer account');

    // List entries
    const list = await controller.listEntries();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(added.id);
    expect(list[0].password).toBe('hunter2-github');

    // Domain matching
    expect(await controller.hasEntryForDomain('github.com')).toBe(true);
    expect(await controller.hasEntryForDomain('gist.github.com')).toBe(true);
    expect(await controller.hasEntryForDomain('google.com')).toBe(false);

    // Update entry
    const updated = await controller.updateEntry(added.id, {
      password: 'new-hunter2-github',
    });
    expect(updated.password).toBe('new-hunter2-github');

    // Delete entry
    await controller.deleteEntry(added.id);
    expect(await controller.listEntries()).toHaveLength(0);
  });

  it('handles message router requests', async () => {
    const resInit = await controller.handleMessage({
      type: 'KEYPEER_INIT',
      masterPassword: 'my-strong-password-999',
    });
    expect(resInit.success).toBe(true);

    const resStatus = await controller.handleMessage({ type: 'KEYPEER_STATUS' });
    expect(resStatus.success).toBe(true);
    expect((resStatus as any).data.initialized).toBe(true);
  });
});
