import React, { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Clock, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface SettingsScreenProps {
  currentAutoLockMinutes: number;
  onUpdateAutoLock: (minutes: number) => Promise<void>;
  onChangePassword: (oldPass: string, newPass: string) => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentAutoLockMinutes,
  onUpdateAutoLock,
  onChangePassword,
}) => {
  const [autoLock, setAutoLock] = useState(currentAutoLockMinutes);
  const [autoLockSaved, setAutoLockSaved] = useState(false);
  const [autoLockLoading, setAutoLockLoading] = useState(false);

  // Password change form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleAutoLockSave = async () => {
    setAutoLockLoading(true);
    try {
      await onUpdateAutoLock(autoLock);
      setAutoLockSaved(true);
      setTimeout(() => setAutoLockSaved(false), 2000);
    } finally {
      setAutoLockLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!oldPassword) {
      setPasswordError('Please enter your current master password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New master password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await onChangePassword(oldPassword, newPassword);
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change master password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Auto-lock Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Auto-Lock Inactivity Timeout</h2>
            <p className="text-xs text-zinc-400">
              Automatically lock Keypeer after a period of browser inactivity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <select
            value={autoLock}
            onChange={(e) => setAutoLock(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value={1}>1 minute</option>
            <option value={5}>5 minutes (recommended)</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
          </select>

          <Button
            onClick={handleAutoLockSave}
            variant="primary"
            size="md"
            isLoading={autoLockLoading}
          >
            {autoLockSaved ? (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Check className="w-4 h-4" /> Saved
              </span>
            ) : (
              'Save Timeout'
            )}
          </Button>
        </div>
      </div>

      {/* Change Master Password Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Change Master Password</h2>
            <p className="text-xs text-zinc-400">
              All stored credentials will be seamlessly decrypted and re-encrypted with your new key.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md pt-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Current Master Password"
            placeholder="••••••••••••"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="New Master Password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Confirm New Master Password"
            placeholder="Repeat new master password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {passwordError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>Master password successfully updated!</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="md" isLoading={passwordLoading}>
            Update Master Password
          </Button>
        </form>
      </div>
    </div>
  );
};
