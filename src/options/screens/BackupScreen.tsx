import React, { useState, useRef } from 'react';
import { Button } from '../../shared/components/Button';
import { Download, Upload, ShieldAlert, Check, AlertTriangle } from 'lucide-react';
import type { KeypeerFile } from '../../storage/schema';

interface BackupScreenProps {
  onExport: () => Promise<KeypeerFile>;
  onImport: (file: KeypeerFile) => Promise<void>;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({ onExport, onImport }) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExportLoading(true);
    setErrorMessage(null);
    try {
      const fileData = await onExport();
      const json = JSON.stringify(fileData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `keypeer-vault-backup-${dateStr}.keypeer`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export backup.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setImportLoading(true);
      setErrorMessage(null);
      setImportSuccess(false);
      try {
        const text = event.target?.result as string;
        const parsed: KeypeerFile = JSON.parse(text);

        if (!parsed || parsed.version !== 1 || !parsed.salt || !parsed.check || !Array.isArray(parsed.entries)) {
          throw new Error('Invalid Keypeer backup file format.');
        }

        const confirmed = window.confirm(
          `This will overwrite your existing vault with the ${parsed.entries.length} credentials from the backup. Are you sure you want to proceed?`
        );
        if (!confirmed) {
          setImportLoading(false);
          return;
        }

        await onImport(parsed);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 4000);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse or import backup file.');
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Export Encrypted Backup</h2>
            <p className="text-xs text-zinc-400">
              Download your vault as an encrypted <code className="font-mono text-indigo-300">.keypeer</code> file.
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 max-w-xl leading-relaxed mb-4">
          Your backup remains encrypted with your current master password using AES-256-GCM. It cannot be opened without your master password, so you can safely store it on cloud storage or external drives.
        </p>

        <Button onClick={handleExport} variant="primary" size="md" isLoading={exportLoading}>
          <Download className="w-4 h-4 mr-2" />
          Export Backup File
        </Button>
      </div>

      {/* Import Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Restore / Import Vault Backup</h2>
            <p className="text-xs text-zinc-400">
              Restore credentials from an existing <code className="font-mono text-indigo-300">.keypeer</code> backup file.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-4 max-w-xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Warning:</strong> Restoring an encrypted backup file will replace the current vault data. You will need to unlock Keypeer with the master password that was active when this backup was created.
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".keypeer,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="secondary"
          size="md"
          isLoading={importLoading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Select Backup File (.keypeer)
        </Button>

        {importSuccess && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <Check className="w-4 h-4 shrink-0" />
            <span>Backup successfully imported! Open the Keypeer popup to unlock your restored vault.</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
