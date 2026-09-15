import React, { useState, useEffect, useCallback } from 'react';
import { SettingsScreen } from './screens/SettingsScreen';
import { BackupScreen } from './screens/BackupScreen';
import { Settings, Database } from 'lucide-react';
import type { KeypeerStatus, KeypeerResponse, KeypeerFile } from '../messaging/protocol';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'backup'>('settings');
  const [status, setStatus] = useState<KeypeerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(() => {
    try {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_STATUS' },
        (res: KeypeerResponse<KeypeerStatus>) => {
          if (res?.success) {
            setStatus(res.data);
          }
          setLoading(false);
        }
      );
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUpdateAutoLock = async (minutes: number) => {
    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_SET_AUTO_LOCK', minutes },
        (res: KeypeerResponse<null>) => {
          if (res?.success) {
            setStatus((prev) => (prev ? { ...prev, autoLockMinutes: minutes } : prev));
            resolve();
          } else {
            reject(new Error((res as any)?.error || 'Failed to update auto-lock'));
          }
        }
      );
    });
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_CHANGE_MASTER_PASSWORD', oldPassword, newPassword },
        (res: KeypeerResponse<KeypeerStatus>) => {
          if (res?.success) {
            setStatus(res.data);
            resolve();
          } else {
            reject(new Error((res as any)?.error || 'Failed to change master password'));
          }
        }
      );
    });
  };

  const handleExport = async (): Promise<KeypeerFile> => {
    return new Promise<KeypeerFile>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_EXPORT' },
        (res: KeypeerResponse<KeypeerFile>) => {
          if (res?.success && res.data) {
            resolve(res.data);
          } else {
            reject(new Error((res as any)?.error || 'Failed to export backup'));
          }
        }
      );
    });
  };

  const handleImport = async (file: KeypeerFile) => {
    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_IMPORT', file },
        (res: KeypeerResponse<KeypeerStatus>) => {
          if (res?.success) {
            setStatus(res.data);
            resolve();
          } else {
            reject(new Error((res as any)?.error || 'Failed to import backup'));
          }
        }
      );
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-violet-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icons/48.png"
              alt="Keypeer"
              className="w-8 h-8 rounded-lg shadow-sm shadow-violet-950 border border-violet-500/20"
            />
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-100">Keypeer Dashboard</h1>
              <p className="text-[11px] text-zinc-400">Settings, Security & Backups</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status?.unlocked ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {status?.unlocked ? 'Vault Unlocked' : 'Vault Locked'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'backup'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Database className="w-4 h-4" />
            Encrypted Backup & Restore
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">Loading options...</div>
        ) : activeTab === 'settings' ? (
          <SettingsScreen
            currentAutoLockMinutes={status?.autoLockMinutes ?? 5}
            onUpdateAutoLock={handleUpdateAutoLock}
            onChangePassword={handleChangePassword}
          />
        ) : (
          <BackupScreen onExport={handleExport} onImport={handleImport} />
        )}
      </main>
    </div>
  );
};
