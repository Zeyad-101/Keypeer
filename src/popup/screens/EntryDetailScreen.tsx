import React, { useState } from 'react';
import type { KeypeerEntryPublic } from '../../messaging/protocol';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { PasswordGeneratorModal } from '../../shared/components/PasswordGeneratorModal';
import { Modal } from '../../shared/components/Modal';
import {
  ArrowLeft,
  Globe,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Wand2,
  Trash2,
} from 'lucide-react';

interface EntryDetailScreenProps {
  entry: KeypeerEntryPublic | null;
  onBack: () => void;
  onSave: (data: {
    domain: string;
    username: string;
    password: string;
    notes?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EntryDetailScreen: React.FC<EntryDetailScreenProps> = ({
  entry,
  onBack,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(entry);
  const [domain, setDomain] = useState(entry?.domain || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.password || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!domain.trim()) {
      setError('Please enter a domain or website.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a username or email.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        domain: domain.trim(),
        username: username.trim(),
        password,
        notes: notes.trim() || undefined,
      });
      onBack();
    } catch (err: any) {
      setError(err.message || 'Failed to save credential.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !onDelete) return;
    setIsLoading(true);
    try {
      await onDelete(entry.id);
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err: any) {
      setError(err.message || 'Failed to delete credential.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onBack}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800 transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-xs text-zinc-200">
            {isEditing ? 'Edit Credential' : 'Add Credential'}
          </span>
        </div>
        {isEditing && onDelete && (
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-md hover:bg-zinc-800 transition-colors"
            title="Delete Credential"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
        <Input
          label="Website / Domain"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          startIcon={<Globe className="w-3.5 h-3.5" />}
          autoFocus={!isEditing}
        />

        <Input
          label="Username / Email"
          placeholder="user@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          startIcon={<User className="w-3.5 h-3.5" />}
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-300">Password</label>
            <button
              type="button"
              onClick={() => setIsGeneratorOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              Generate
            </button>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            startIcon={<KeyRound className="w-3.5 h-3.5" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Notes (Optional)
          </label>
          <div className="relative">
            <textarea
              rows={2}
              placeholder="Recovery codes, PIN, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700/80 focus:border-violet-500 focus:ring-violet-500/30 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 transition-colors resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        <div className="pt-2 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onBack}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={isLoading}
          >
            {isEditing ? 'Save Changes' : 'Save Entry'}
          </Button>
        </div>
      </form>

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelectPassword={(newPass) => {
          setPassword(newPass);
          setShowPassword(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Credential?"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-300">
            Are you sure you want to permanently delete credentials for{' '}
            <span className="font-semibold text-zinc-100">{entry?.domain}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isLoading}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
