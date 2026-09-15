import React, { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

interface UnlockScreenProps {
  isInitMode: boolean;
  onUnlock: (password: string) => Promise<void>;
  onInit: (password: string) => Promise<void>;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  isInitMode,
  onUnlock,
  onInit,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 14) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return Math.min(score, 4);
  };

  const strength = calculateStrength(password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-zinc-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-emerald-500',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isInitMode) {
      if (password.length < 8) {
        setError('Master password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setIsLoading(true);
      try {
        await onInit(password);
      } catch (err: any) {
        setError(err.message || 'Failed to create vault.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!password) {
        setError('Please enter your master password.');
        return;
      }
      setIsLoading(true);
      try {
        await onUnlock(password);
      } catch (err: any) {
        setFailedAttempts((prev) => prev + 1);
        setError(err.message || 'Invalid master password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-6 bg-zinc-900 select-none">
      <div className="flex flex-col items-center text-center mt-2">
        <img
          src="/icons/128.png"
          alt="Keypeer"
          className="w-16 h-16 rounded-2xl mb-3 shadow-lg shadow-violet-950/60 border border-violet-500/20"
        />
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">
          {isInitMode ? 'Create Master Password' : 'Unlock Keypeer'}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
          {isInitMode
            ? 'Set a strong master password. It encrypts all your credentials locally.'
            : 'Enter your master password to unlock your credentials.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 my-auto">
        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Master Password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            startIcon={<KeyRound className="w-4 h-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-zinc-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {isInitMode && password.length > 0 && (
            <div className="mt-2">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                <span>Strength</span>
                <span className="font-medium text-zinc-300">{strengthLabels[strength]}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 h-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-colors duration-200 ${
                      step <= strength ? strengthColors[strength] : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isInitMode && (
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Confirm Password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            startIcon={<KeyRound className="w-4 h-4" />}
          />
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center animate-in fade-in">
            {error}
            {failedAttempts >= 3 && !isInitMode && (
              <div className="mt-1 text-[11px] text-rose-300/80">
                Failed attempts: {failedAttempts}. Passwords cannot be recovered if lost.
              </div>
            )}
          </div>
        )}

        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
          {isInitMode ? 'Create Vault' : 'Unlock'}
        </Button>
      </form>

      <div className="text-center text-[11px] text-zinc-500 pb-1">
        Local-only • Zero-knowledge AES-256
      </div>
    </div>
  );
};
