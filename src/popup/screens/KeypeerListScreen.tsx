import React, { useState, useRef, useEffect } from 'react';
import type { KeypeerEntryPublic } from '../../messaging/protocol';
import { DomainAvatar } from '../../shared/components/DomainAvatar';
import { Search, Plus, Lock, Settings, Copy, Check, Shield } from 'lucide-react';

interface KeypeerListScreenProps {
  entries: KeypeerEntryPublic[];
  onLock: () => void;
  onAdd: () => void;
  onSelectEntry: (entry: KeypeerEntryPublic) => void;
}

export const KeypeerListScreen: React.FC<KeypeerListScreenProps> = ({
  entries,
  onLock,
  onAdd,
  onSelectEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.domain.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query)
    );
  });

  const handleCopyPassword = (e: React.MouseEvent, entry: KeypeerEntryPublic) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.password);
    setCopiedId(entry.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const openOptions = () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0 bg-zinc-900/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-zinc-100">Keypeer</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
            {entries.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAdd}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title="Add Credential"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={openOptions}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title="Settings & Backup"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onLock}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search vault... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800/90 border border-zinc-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="group flex items-center justify-between p-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/90 border border-zinc-800/60 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <DomainAvatar domain={entry.domain} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
                    {entry.domain}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {entry.username}
                  </div>
                </div>
              </div>

              {/* Copy Password Button */}
              <button
                onClick={(e) => handleCopyPassword(e, entry)}
                className={`p-1.5 rounded-md transition-all ${
                  copiedId === entry.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'
                }`}
                title={copiedId === entry.id ? 'Copied!' : 'Copy Password'}
              >
                {copiedId === entry.id ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mb-2">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-zinc-400">
              {searchQuery ? 'No matching credentials found' : 'No credentials stored yet'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
              {searchQuery
                ? 'Try a different domain or username search.'
                : 'Click "+ Add" to save your first password.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
