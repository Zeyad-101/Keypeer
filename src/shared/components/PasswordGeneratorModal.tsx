import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { RefreshCw, Copy, Check } from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectPassword,
}) => {
  const [length, setLength] = useState(18);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState(() => generate());
  const [copied, setCopied] = useState(false);

  function generate(
    len = length,
    upper = includeUppercase,
    lower = includeLowercase,
    nums = includeNumbers,
    syms = includeSymbols
  ): string {
    let chars = '';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (nums) chars += '0123456789';
    if (syms) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    const randomValues = new Uint32Array(len);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  const handleRefresh = () => {
    setGeneratedPassword(generate());
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePassword = () => {
    onSelectPassword(generatedPassword);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Password Generator">
      <div className="space-y-4">
        {/* Generated password display */}
        <div className="flex items-center justify-between gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 font-mono text-sm break-all text-indigo-300 select-all">
          <span>{generatedPassword}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleRefresh}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-700 transition-colors"
              title="Generate new"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Length Slider */}
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Length</span>
            <span className="font-mono text-zinc-200">{length}</span>
          </div>
          <input
            type="range"
            min={8}
            max={32}
            value={length}
            onChange={(e) => {
              const val = Number(e.target.value);
              setLength(val);
              setGeneratedPassword(generate(val));
            }}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Character Toggles */}
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeUppercase}
              onChange={(e) => {
                setIncludeUppercase(e.target.checked);
                setGeneratedPassword(generate(length, e.target.checked));
              }}
              className="rounded accent-indigo-500"
            />
            Uppercase (A-Z)
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeLowercase}
              onChange={(e) => {
                setIncludeLowercase(e.target.checked);
                setGeneratedPassword(generate(length, undefined, e.target.checked));
              }}
              className="rounded accent-indigo-500"
            />
            Lowercase (a-z)
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => {
                setIncludeNumbers(e.target.checked);
                setGeneratedPassword(generate(length, undefined, undefined, e.target.checked));
              }}
              className="rounded accent-indigo-500"
            />
            Numbers (0-9)
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => {
                setIncludeSymbols(e.target.checked);
                setGeneratedPassword(generate(length, undefined, undefined, undefined, e.target.checked));
              }}
              className="rounded accent-indigo-500"
            />
            Symbols (!@#$)
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleUsePassword}>
            Use Password
          </Button>
        </div>
      </div>
    </Modal>
  );
};
