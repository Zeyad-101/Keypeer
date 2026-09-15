# Keypeer — Project Rules (Always Active)

These rules apply to every AI session in this project, regardless of which model is used.

---

## 🎯 Project Identity

**Keypeer** is a local-only, zero-backend browser extension password manager built for Manifest V3 (Chrome, Edge, Brave).
- **Stack**: React 18, Vite, TypeScript, Tailwind CSS, Web Crypto API (`SubtleCrypto`), `argon2-browser` (WASM).
- **Zero-Backend / Offline**: No entry data, decrypted or otherwise, ever leaves `chrome.storage.local`. Absolutely no network calls anywhere in the codebase.
- **Service Worker Architecture**: A background service worker holds the derived AES-256 key in memory only and mediates all encrypt/decrypt operations. Content scripts detect login forms and message the service worker.

---

## 🔒 Security & Cryptographic Constraints (NEVER break these)

1. **Master Key Persistence**: The master-password-derived key MUST NEVER be persisted to disk or storage. It remains memory-only in the background service worker global scope, cleared on lock, idle timeout, or browser close.
2. **Key Derivation (KDF)**: Argon2id with parameters `{ time: 3, mem: 65536 KiB, parallelism: 4, hashLen: 32 }`. Uses the embedded offline WebAssembly binary to eliminate external fetch requirements.
3. **Symmetric Encryption**: AES-256-GCM with a unique, cryptographically random 96-bit (12-byte) IV per entry. The IV is stored alongside the ciphertext in `EncryptedBlob` (`{ iv: string; data: string }` in base64).
4. **TypeScript Strictness**: TypeScript strict mode must remain enabled. No `any` types in crypto or storage modules.
5. **Content Script Privacy**:
   - While Keypeer is locked, content scripts may only check boolean existence (`KEYPEER_HAS_ENTRY_FOR_DOMAIN`), never enumerate or view credential values.
   - Content scripts must NEVER autofill silently — autofill requires explicit user interaction on the injected widget. No auto-submit.

---

## 🎨 Design System

### Color Palette (Tailwind Dark Theme)
- Base background: `bg-zinc-900` / `bg-zinc-950`
- Card / Panel background: `bg-zinc-800` / `bg-zinc-850`
- Borders: `border-zinc-700` / `border-zinc-800`
- Text primary: `text-zinc-100` / `text-white`
- Text secondary / muted: `text-zinc-400` / `text-zinc-500`
- Primary Accent: `indigo-500` / `indigo-600` (focus rings, CTAs, active states)
- Danger: `rose-500` / `rose-600` (delete confirmations, errors)
- Success: `emerald-400` / `emerald-500` (copy feedback, save toasts)

### Dimensions
- Popup: Fixed width `360px`, height `520px`.
- Options page: Responsive full-page settings and backup dashboard.

---

## 🏗 File Ownership & Architecture

| Path | Responsibility |
|---|---|
| `manifest.json` | Manifest V3 definition with permissions and entry points |
| `src/crypto/` | Argon2id KDF, AES-256-GCM encryption/decryption, embedded WASM |
| `src/storage/` | Schema, `chrome.storage.local` persistence, check sentinel token |
| `src/background/` | Service worker, in-memory session key, auto-lock inactivity timer, message router |
| `src/messaging/` | Typed message contracts between popup, options, content, and background |
| `src/content/` | In-page login form detector, inline autofill widget, save-password banner |
| `src/popup/` | React GUI for vault unlock, credential search/list, and entry details |
| `src/options/` | React GUI for auto-lock timeout, master password change, and encrypted backup export/import |
| `scripts/build.js` | Multi-target Vite build pipeline producing unpacked extension in `dist/` |

---

## 🧩 Messaging Contract

All communication flows asynchronously via typed messages:
- `KEYPEER_STATUS`: Check initialization and lock status
- `KEYPEER_INIT`: Create master password and initial vault
- `KEYPEER_UNLOCK`: Unlock vault with master password
- `KEYPEER_LOCK`: Purge key from memory
- `KEYPEER_LIST_ENTRIES`: Retrieve decrypted entries (unlocked only)
- `KEYPEER_ADD_ENTRY` / `UPDATE_ENTRY` / `DELETE_ENTRY`: Credential CRUD
- `KEYPEER_HAS_ENTRY_FOR_DOMAIN`: Domain check (available locked/unlocked)
- `KEYPEER_GET_MATCHING_CREDENTIALS`: Fetch domain matches for autofill
- `KEYPEER_SET_AUTO_LOCK`: Update auto-lock inactivity duration
- `KEYPEER_EXPORT` / `IMPORT`: Export/restore encrypted `.keypeer` backup
- `KEYPEER_CHANGE_MASTER_PASSWORD`: Re-encrypt all entries with new key & salt

---

## ✅ Quality Standards
- `npm run test`: All Vitest suites pass across crypto, storage, background controller, and form detector.
- `npm run build`: Type-checks with `tsc --noEmit` and outputs a clean, loadable extension in `dist/`.
