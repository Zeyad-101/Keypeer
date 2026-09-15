import { useState, useEffect, useCallback } from 'react';
import type {
  KeypeerStatus,
  KeypeerEntryPublic,
  KeypeerMessage,
  KeypeerResponse,
} from '../../messaging/protocol';

async function sendExtensionMessage<T>(message: KeypeerMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      reject(new Error('Extension runtime not available'));
      return;
    }
    chrome.runtime.sendMessage(message, (response: KeypeerResponse<T>) => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        reject(new Error(lastErr.message || 'Extension communication error'));
        return;
      }
      if (!response) {
        reject(new Error('No response received from background service worker'));
        return;
      }
      if (!response.success) {
        reject(new Error(response.error || 'Request failed'));
        return;
      }
      resolve(response.data);
    });
  });
}

export function useKeypeerState() {
  const [status, setStatus] = useState<KeypeerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<KeypeerEntryPublic[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const currentStatus = await sendExtensionMessage<KeypeerStatus>({
        type: 'KEYPEER_STATUS',
      });
      setStatus(currentStatus);
      return currentStatus;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const list = await sendExtensionMessage<KeypeerEntryPublic[]>({
        type: 'KEYPEER_LIST_ENTRIES',
      });
      setEntries(list);
      return list;
    } catch (err: any) {
      setError(err.message || 'Failed to load entries');
      return [];
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus().then((s) => {
      if (s?.unlocked) {
        loadEntries();
      }
    });
  }, [refreshStatus, loadEntries]);

  const initVault = async (masterPassword: string) => {
    setError(null);
    const newStatus = await sendExtensionMessage<KeypeerStatus>({
      type: 'KEYPEER_INIT',
      masterPassword,
    });
    setStatus(newStatus);
    await loadEntries();
  };

  const unlockVault = async (masterPassword: string) => {
    setError(null);
    const newStatus = await sendExtensionMessage<KeypeerStatus>({
      type: 'KEYPEER_UNLOCK',
      masterPassword,
    });
    setStatus(newStatus);
    await loadEntries();
  };

  const lockVault = async () => {
    setError(null);
    const newStatus = await sendExtensionMessage<KeypeerStatus>({
      type: 'KEYPEER_LOCK',
    });
    setStatus(newStatus);
    setEntries([]);
  };

  const addEntry = async (
    domain: string,
    username: string,
    password: string,
    notes?: string
  ) => {
    setError(null);
    const created = await sendExtensionMessage<KeypeerEntryPublic>({
      type: 'KEYPEER_ADD_ENTRY',
      domain,
      username,
      password,
      notes,
    });
    setEntries((prev) => [created, ...prev]);
    return created;
  };

  const updateEntry = async (
    id: string,
    fields: Partial<{ domain: string; username: string; password: string; notes: string }>
  ) => {
    setError(null);
    const updated = await sendExtensionMessage<KeypeerEntryPublic>({
      type: 'KEYPEER_UPDATE_ENTRY',
      id,
      fields,
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  };

  const deleteEntry = async (id: string) => {
    setError(null);
    await sendExtensionMessage<null>({
      type: 'KEYPEER_DELETE_ENTRY',
      id,
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    status,
    loading,
    error,
    setError,
    entries,
    entriesLoading,
    refreshStatus,
    loadEntries,
    initVault,
    unlockVault,
    lockVault,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
