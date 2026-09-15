import React, { useState } from 'react';
import { useKeypeerState } from '../shared/hooks/useKeypeerState';
import { UnlockScreen } from './screens/UnlockScreen';
import { KeypeerListScreen } from './screens/KeypeerListScreen';
import { EntryDetailScreen } from './screens/EntryDetailScreen';
import type { KeypeerEntryPublic } from '../messaging/protocol';

export const App: React.FC = () => {
  const {
    status,
    loading,
    entries,
    initVault,
    unlockVault,
    lockVault,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useKeypeerState();

  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedEntry, setSelectedEntry] = useState<KeypeerEntryPublic | null>(null);

  if (loading || !status) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-900 text-zinc-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs">Loading Keypeer...</span>
      </div>
    );
  }

  // First-time setup / uninitialized vault
  if (!status.initialized) {
    return (
      <UnlockScreen
        isInitMode={true}
        onInit={initVault}
        onUnlock={unlockVault}
      />
    );
  }

  // Vault is locked
  if (!status.unlocked) {
    return (
      <UnlockScreen
        isInitMode={false}
        onInit={initVault}
        onUnlock={unlockVault}
      />
    );
  }

  // Vault is unlocked
  if (currentView === 'add') {
    return (
      <EntryDetailScreen
        entry={null}
        onBack={() => setCurrentView('list')}
        onSave={async (data) => {
          await addEntry(data.domain, data.username, data.password, data.notes);
        }}
      />
    );
  }

  if (currentView === 'edit' && selectedEntry) {
    return (
      <EntryDetailScreen
        entry={selectedEntry}
        onBack={() => {
          setSelectedEntry(null);
          setCurrentView('list');
        }}
        onSave={async (data) => {
          await updateEntry(selectedEntry.id, data);
        }}
        onDelete={async (id) => {
          await deleteEntry(id);
        }}
      />
    );
  }

  return (
    <KeypeerListScreen
      entries={entries}
      onLock={lockVault}
      onAdd={() => setCurrentView('add')}
      onSelectEntry={(entry) => {
        setSelectedEntry(entry);
        setCurrentView('edit');
      }}
    />
  );
};
