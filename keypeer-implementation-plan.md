# Keypeer — Browser Extension Password Manager — Implementation Plan

**Goal:** A Manifest V3 Chrome/Edge/Brave extension that stores encrypted credentials locally, autofills login forms, and lets the user add/edit/remove entries through a polished React GUI.

**Architecture:** Local-only, zero-backend. A background service worker holds the derived AES key in memory and mediates all encrypt/decrypt operations. Content scripts detect login forms per-tab and message the background worker for matching credentials. Popup and Options pages are separate React apps sharing a `packages/ui` component set, both built with Vite + Tailwind.

**Tech Stack:** Manifest V3, React 18, Vite, TypeScript, Tailwind CSS, `argon2-browser` (WASM), Web Crypto API (`SubtleCrypto` for AES-GCM).

## Global Constraints

- Master-password-derived key MUST NEVER be persisted to disk — memory-only (service worker global scope), cleared on lock/idle-timeout/browser close.
- KDF: Argon2id, minimum params `{ time: 3, mem: 65536 KiB, parallelism: 4 }` — tune down only if popup unlock exceeds ~800ms on target hardware.
- Encryption: AES-256-GCM, unique random IV (96-bit) per entry, IV stored alongside ciphertext (not secret).
- No entry data, decrypted or otherwise, ever leaves `chrome.storage.local` — no network calls anywhere in the codebase.
- TypeScript strict mode on. No `any` in crypto or storage modules.
- Content script must not autofill silently — user-initiated click on the injected icon/dropdown only. No auto-submit.
- While keypeer is locked, content script may only know "an entry exists for this domain" (boolean), never enumerate values.

---

## Project Structure

```
keypeer/
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── background/
│   │   ├── index.ts              # service worker entry, message router
│   │   ├── session.ts            # in-memory key holder + auto-lock timer
│   │   └── keypeerController.ts    # orchestrates crypto + storage for CRUD
│   ├── crypto/
│   │   ├── kdf.ts                # Argon2id key derivation
│   │   ├── aes.ts                # AES-GCM encrypt/decrypt helpers
│   │   └── types.ts              # EncryptedBlob, DerivedKey types
│   ├── storage/
│   │   ├── keypeerStore.ts         # chrome.storage.local read/write
│   │   └── schema.ts             # KeypeerEntry, KeypeerFile types + migrations
│   ├── content/
│   │   ├── index.ts              # injected into pages, form detection
│   │   ├── formDetector.ts       # finds username/password input pairs
│   │   └── autofillWidget.ts     # renders inline picker UI
│   ├── messaging/
│   │   └── protocol.ts           # typed message contracts (bg <-> content <-> popup)
│   ├── popup/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── screens/
│   │       ├── UnlockScreen.tsx
│   │       ├── KeypeerListScreen.tsx
│   │       └── EntryDetailScreen.tsx
│   ├── options/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── screens/
│   │       ├── SettingsScreen.tsx
│   │       └── BackupScreen.tsx
│   └── shared/
│       ├── components/           # Button, Input, Modal, DomainIcon, etc.
│       └── hooks/                # useKeypeerState, useAutoLock
└── tests/
    ├── crypto/kdf.test.ts
    ├── crypto/aes.test.ts
    ├── storage/keypeerStore.test.ts
    └── content/formDetector.test.ts
```

---

### Task 1: Project Scaffold + Manifest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `manifest.json`

**Interfaces:**
- Produces: build pipeline (`npm run dev`, `npm run build`) that outputs a loadable unpacked extension to `dist/`

- [ ] **Step 1:** Init project
```bash
npm create vite@latest keypeer -- --template react-ts
cd keypeer
npm install -D tailwindcss postcss autoprefixer @types/chrome vitest
npm install argon2-browser
npx tailwindcss init -p
```

- [ ] **Step 2:** Write `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Keypeer",
  "version": "0.1.0",
  "description": "Local, encrypted password manager.",
  "permissions": ["storage", "activeTab", "scripting"],
  "background": { "service_worker": "src/background/index.ts", "type": "module" },
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["src/content/index.ts"], "run_at": "document_idle" }
  ],
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```

- [ ] **Step 3:** Configure Vite for multi-entry build (popup, options, background, content) using `@crxjs/vite-plugin` or manual `rollupOptions.input` with `popup.html`, `options.html`.

- [ ] **Step 4:** Verify `npm run build` produces a `dist/` folder loadable via `chrome://extensions` → Load unpacked. Confirm no console errors on load.

- [ ] **Step 5:** Commit
```bash
git init && git add -A && git commit -m "chore: scaffold Keypeer extension project"
```

---

### Task 2: Crypto Module (KDF + AES-GCM)

**Files:**
- Create: `src/crypto/kdf.ts`, `src/crypto/aes.ts`, `src/crypto/types.ts`
- Test: `tests/crypto/kdf.test.ts`, `tests/crypto/aes.test.ts`

**Interfaces:**
- Produces:
  - `deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey>`
  - `encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob>`
  - `decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string>`
  - `type EncryptedBlob = { iv: string; data: string }` (both base64)

- [ ] **Step 1: Write failing test for AES round-trip**
```ts
// tests/crypto/aes.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/crypto/aes';

describe('AES-GCM encrypt/decrypt', () => {
  it('round-trips plaintext', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const blob = await encrypt(key, 'hunter2');
    const result = await decrypt(key, blob);
    expect(result).toBe('hunter2');
  });

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const a = await encrypt(key, 'same');
    const b = await encrypt(key, 'same');
    expect(a.data).not.toBe(b.data);
  });
});
```

- [ ] **Step 2:** Run test, confirm it fails (`encrypt`/`decrypt` not defined)

- [ ] **Step 3: Implement `aes.ts`**
```ts
// src/crypto/aes.ts
import type { EncryptedBlob } from './types';

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: toB64(iv.buffer), data: toB64(ciphertext) };
}

export async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const iv = fromB64(blob.iv);
  const data = fromB64(blob.data);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}
```

- [ ] **Step 4:** Run test, confirm pass

- [ ] **Step 5: Write failing test for KDF determinism**
```ts
// tests/crypto/kdf.test.ts
import { describe, it, expect } from 'vitest';
import { deriveKey } from '../../src/crypto/kdf';

describe('Argon2id key derivation', () => {
  it('derives the same key for same password+salt', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const k1 = await deriveKey('correct horse battery staple', salt);
    const k2 = await deriveKey('correct horse battery staple', salt);
    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
  });
});
```

- [ ] **Step 6: Implement `kdf.ts`**
```ts
// src/crypto/kdf.ts
import argon2 from 'argon2-browser';

export async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const result = await argon2.hash({
    pass: masterPassword,
    salt,
    time: 3,
    mem: 65536,
    parallelism: 4,
    hashLen: 32,
    type: argon2.ArgonType.Argon2id,
  });
  return crypto.subtle.importKey('raw', result.hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
```

- [ ] **Step 7:** Run both test files, confirm pass. Commit.
```bash
git add src/crypto tests/crypto && git commit -m "feat: Argon2id KDF + AES-GCM crypto module"
```

---

### Task 3: Storage Schema + Keypeer Store

**Files:**
- Create: `src/storage/schema.ts`, `src/storage/keypeerStore.ts`
- Test: `tests/storage/keypeerStore.test.ts`

**Interfaces:**
- Consumes: `EncryptedBlob` from Task 2
- Produces:
  - `type KeypeerEntry = { id: string; domain: string; username: string; password: EncryptedBlob; notes?: EncryptedBlob; createdAt: number; updatedAt: number }`
  - `type KeypeerFile = { version: 1; salt: string; entries: KeypeerEntry[] }`
  - `loadKeypeerFile(): Promise<KeypeerFile | null>`
  - `saveKeypeerFile(file: KeypeerFile): Promise<void>`
  - `isKeypeerInitialized(): Promise<boolean>`

- [ ] **Step 1: Write failing test**
```ts
// tests/storage/keypeerStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadKeypeerFile, saveKeypeerFile, isKeypeerInitialized } from '../../src/storage/keypeerStore';

const store: Record<string, any> = {};
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  // @ts-expect-error test shim
  global.chrome = {
    storage: {
      local: {
        get: (keys: string[]) => Promise.resolve(Object.fromEntries(keys.map(k => [k, store[k]]))),
        set: (obj: Record<string, any>) => { Object.assign(store, obj); return Promise.resolve(); },
      },
    },
  };
});

describe('keypeerStore', () => {
  it('returns null when uninitialized', async () => {
    expect(await loadKeypeerFile()).toBeNull();
    expect(await isKeypeerInitialized()).toBe(false);
  });

  it('saves and loads a keypeer file', async () => {
    const file = { version: 1 as const, salt: 'c2FsdA==', entries: [] };
    await saveKeypeerFile(file);
    expect(await loadKeypeerFile()).toEqual(file);
    expect(await isKeypeerInitialized()).toBe(true);
  });
});
```

- [ ] **Step 2:** Run, confirm fail

- [ ] **Step 3: Implement**
```ts
// src/storage/schema.ts
import type { EncryptedBlob } from '../crypto/types';

export interface KeypeerEntry {
  id: string;
  domain: string;
  username: string;
  password: EncryptedBlob;
  notes?: EncryptedBlob;
  createdAt: number;
  updatedAt: number;
}

export interface KeypeerFile {
  version: 1;
  salt: string; // base64
  entries: KeypeerEntry[];
}
```
```ts
// src/storage/keypeerStore.ts
import type { KeypeerFile } from './schema';

const KEY = 'keypeerFile';

export async function loadKeypeerFile(): Promise<KeypeerFile | null> {
  const result = await chrome.storage.local.get([KEY]);
  return result[KEY] ?? null;
}

export async function saveKeypeerFile(file: KeypeerFile): Promise<void> {
  await chrome.storage.local.set({ [KEY]: file });
}

export async function isKeypeerInitialized(): Promise<boolean> {
  return (await loadKeypeerFile()) !== null;
}
```

- [ ] **Step 4:** Run test, confirm pass. Commit.
```bash
git add src/storage tests/storage && git commit -m "feat: keypeer storage schema and store"
```

---

### Task 4: Background Service Worker — Session + Message Router

**Files:**
- Create: `src/background/session.ts`, `src/background/keypeerController.ts`, `src/background/index.ts`, `src/messaging/protocol.ts`

**Interfaces:**
- Consumes: `deriveKey`, `encrypt`, `decrypt` (Task 2); `loadKeypeerFile`, `saveKeypeerFile`, `isKeypeerInitialized` (Task 3)
- Produces: message contract used by popup and content script:
```ts
type KeypeerMessage =
  | { type: 'KEYPEER_INIT'; masterPassword: string }
  | { type: 'KEYPEER_UNLOCK'; masterPassword: string }
  | { type: 'KEYPEER_LOCK' }
  | { type: 'KEYPEER_STATUS' } // -> { initialized: boolean; unlocked: boolean }
  | { type: 'KEYPEER_LIST_ENTRIES' } // -> KeypeerEntryPublic[] (decrypted, unlocked only)
  | { type: 'KEYPEER_ADD_ENTRY'; domain: string; username: string; password: string; notes?: string }
  | { type: 'KEYPEER_UPDATE_ENTRY'; id: string; fields: Partial<{ domain: string; username: string; password: string; notes: string }> }
  | { type: 'KEYPEER_DELETE_ENTRY'; id: string }
  | { type: 'KEYPEER_HAS_ENTRY_FOR_DOMAIN'; domain: string }; // -> boolean, works even locked
```

- [ ] **Step 1: Write `protocol.ts`** with the `KeypeerMessage` union above plus a `KeypeerEntryPublic` type (`Omit<KeypeerEntry, 'password'|'notes'> & { password: string; notes?: string }`).

- [ ] **Step 2: Write `session.ts`** — in-memory key + auto-lock
```ts
// src/background/session.ts
let currentKey: CryptoKey | null = null;
let lockTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_LOCK_MS = 5 * 60 * 1000; // default 5 min, overridden by settings

export function setKey(key: CryptoKey) {
  currentKey = key;
  resetLockTimer();
}

export function getKey(): CryptoKey | null {
  return currentKey;
}

export function clearKey() {
  currentKey = null;
  if (lockTimer) clearTimeout(lockTimer);
}

export function resetLockTimer(timeoutMs = AUTO_LOCK_MS) {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => clearKey(), timeoutMs);
}
```

- [ ] **Step 3: Write `keypeerController.ts`** — implements each message type against session + storage + crypto (init generates random salt, derives key, saves empty `KeypeerFile`; unlock loads file, derives key with stored salt, attempts decrypt of a sentinel/first entry to validate password — if no entries exist, store a `__check` encrypted marker string `"keypeer-ok"` at init time to validate password on unlock even with zero entries).

- [ ] **Step 4: Write `index.ts`** — registers `chrome.runtime.onMessage` listener, dispatches to `keypeerController`, returns `true` for async `sendResponse`.

- [ ] **Step 5:** Manual test — load unpacked extension, open service worker devtools console, send a test message via `chrome.runtime.sendMessage` from console, confirm round-trip init → unlock → add entry → list entries returns decrypted data.

- [ ] **Step 6:** Commit.
```bash
git add src/background src/messaging && git commit -m "feat: background service worker session + keypeer controller"
```

---

### Task 5: Popup UI — Unlock, List, Detail Screens

**Files:**
- Create: `src/popup/main.tsx`, `src/popup/App.tsx`, `src/popup/screens/UnlockScreen.tsx`, `src/popup/screens/KeypeerListScreen.tsx`, `src/popup/screens/EntryDetailScreen.tsx`, `src/shared/components/{Button,Input,Modal}.tsx`, `src/shared/hooks/useKeypeerState.ts`

**Interfaces:**
- Consumes: `KeypeerMessage` protocol (Task 4) via `chrome.runtime.sendMessage`

- [ ] **Step 1:** Build `useKeypeerState.ts` — hook wrapping `sendMessage`, exposes `{ status, entries, unlock, lock, addEntry, updateEntry, deleteEntry, refresh }`, polls `KEYPEER_STATUS` on mount.

- [ ] **Step 2:** Build `UnlockScreen.tsx` — password input (masked, show/hide toggle), "Unlock" button, error state for wrong password, "First time? Set up keypeer" link → init flow with confirm-password field.

- [ ] **Step 3:** Build `KeypeerListScreen.tsx` — search bar (filters by domain/username client-side), scrollable list of entries showing favicon (via `https://www.google.com/s2/favicons?domain=` — flag: this is an external call for an icon only, not keypeer data; if you want zero network calls at all, use a generic domain-letter avatar instead), domain, username, "copy password" icon button, "+ Add" floating button, lock icon in header.

- [ ] **Step 4:** Build `EntryDetailScreen.tsx` — full add/edit form (domain, username, password with generate-password button, notes), delete with confirm modal, save/cancel.

- [ ] **Step 5:** Build `App.tsx` — screen router based on keypeer status (`uninitialized → Unlock(init mode)`, `locked → Unlock`, `unlocked → KeypeerList ⇄ EntryDetail`).

- [ ] **Step 6:** Style pass with Tailwind — dark theme (`bg-zinc-900`, `text-zinc-100`, accent `indigo-500`), 360×480px popup, transitions with Tailwind's `transition` + `duration-150`, focus states on all inputs, empty-state illustration text when keypeer has zero entries.

- [ ] **Step 7:** Manual test — load extension, click icon, run through init → unlock → add 3 entries → search → edit → delete → lock → unlock again, confirm state persists correctly.

- [ ] **Step 8:** Commit.
```bash
git add src/popup src/shared && git commit -m "feat: popup UI (unlock, list, detail screens)"
```

---

### Task 6: Content Script — Form Detection + Autofill Widget

**Files:**
- Create: `src/content/index.ts`, `src/content/formDetector.ts`, `src/content/autofillWidget.ts`
- Test: `tests/content/formDetector.test.ts` (jsdom)

**Interfaces:**
- Consumes: `KEYPEER_HAS_ENTRY_FOR_DOMAIN`, `KEYPEER_LIST_ENTRIES` (Task 4, only returns data if unlocked)
- Produces: `findLoginForms(doc: Document): { usernameInput: HTMLInputElement; passwordInput: HTMLInputElement; form: HTMLFormElement | null }[]`

- [ ] **Step 1: Write failing test**
```ts
// tests/content/formDetector.test.ts
import { describe, it, expect } from 'vitest';
import { findLoginForms } from '../../src/content/formDetector';

describe('findLoginForms', () => {
  it('finds a standard username+password form', () => {
    document.body.innerHTML = `
      <form id="login">
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>`;
    const forms = findLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].usernameInput.name).toBe('username');
  });

  it('finds a bare password input with no form tag', () => {
    document.body.innerHTML = `<input type="email" /><input type="password" />`;
    expect(findLoginForms(document)).toHaveLength(1);
  });
});
```

- [ ] **Step 2:** Run, confirm fail

- [ ] **Step 3: Implement `formDetector.ts`**
```ts
export interface DetectedLoginForm {
  usernameInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  form: HTMLFormElement | null;
}

export function findLoginForms(doc: Document): DetectedLoginForm[] {
  const results: DetectedLoginForm[] = [];
  const passwordInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="password"]'));

  for (const passwordInput of passwordInputs) {
    const form = passwordInput.closest('form');
    const scope = form ?? doc;
    const candidates = Array.from(
      scope.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"], input:not([type])')
    );
    // pick the candidate immediately preceding the password field in DOM order
    const usernameInput = candidates.filter(el => el.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
    if (usernameInput) results.push({ usernameInput, passwordInput, form });
  }
  return results;
}
```

- [ ] **Step 4:** Run test, confirm pass

- [ ] **Step 5: Build `autofillWidget.ts`** — for each detected form, inject a small key-icon button positioned absolutely at the right edge of `usernameInput`. On click: send `KEYPEER_HAS_ENTRY_FOR_DOMAIN` first (skip rendering the icon at all if false); on click again fetch `KEYPEER_LIST_ENTRIES` filtered to `window.location.hostname`, render a dropdown of matches, on selection fill both inputs via native setter (`Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set`) + dispatch `input`/`change` events so frameworks like React pick up the change.

- [ ] **Step 6: Build `index.ts`** — runs `findLoginForms(document)` on load and on a `MutationObserver` (debounced) for SPA-injected forms; calls `autofillWidget.attach(form)` for each.

- [ ] **Step 7:** Manual test on 2-3 real sites with different form structures (e.g., a simple HTML login form you build locally, plus one SPA-style site) — confirm icon appears only when unlocked+has-entry, autofill correctly populates and doesn't autosubmit.

- [ ] **Step 8:** Commit.
```bash
git add src/content tests/content && git commit -m "feat: content script form detection + autofill widget"
```

---

### Task 7: Save-Password Prompt on Form Submit

**Files:**
- Modify: `src/content/index.ts`
- Create: `src/content/savePrompt.ts`

**Interfaces:**
- Consumes: `KEYPEER_ADD_ENTRY`, `KEYPEER_HAS_ENTRY_FOR_DOMAIN` (Task 4)

- [ ] **Step 1:** Add a `submit` listener on each detected form (and a `keydown` Enter fallback for forms without a submit button) that reads current `usernameInput.value` / `passwordInput.value` just before navigation.

- [ ] **Step 2:** Build `savePrompt.ts` — a small fixed-position banner (top-right, shadow DOM to avoid host-page CSS collisions) reading "Save password for {domain}?" with Save / Never / Dismiss buttons. Only shown if `KEYPEER_HAS_ENTRY_FOR_DOMAIN` for this exact username is false (avoid re-prompting for known creds) and Keypeer is unlocked.

- [ ] **Step 3:** Wire Save button → `KEYPEER_ADD_ENTRY` message, then dismiss banner.

- [ ] **Step 4:** Manual test — log into a test form with a new username, confirm banner appears; click Save, reopen popup, confirm entry exists.

- [ ] **Step 5:** Commit.
```bash
git add src/content && git commit -m "feat: save-password prompt on form submit"
```

---

### Task 8: Options Page — Settings + Encrypted Backup

**Files:**
- Create: `src/options/main.tsx`, `src/options/App.tsx`, `src/options/screens/SettingsScreen.tsx`, `src/options/screens/BackupScreen.tsx`

**Interfaces:**
- Consumes: `KeypeerMessage` protocol; adds two new message types to `protocol.ts`:
```ts
| { type: 'KEYPEER_SET_AUTO_LOCK'; minutes: number }
| { type: 'KEYPEER_EXPORT' } // -> full KeypeerFile JSON (still encrypted, safe to export)
| { type: 'KEYPEER_IMPORT'; file: KeypeerFile }
| { type: 'KEYPEER_CHANGE_MASTER_PASSWORD'; oldPassword: string; newPassword: string }
```

- [ ] **Step 1:** Implement the four new handlers in `keypeerController.ts`. `KEYPEER_CHANGE_MASTER_PASSWORD` must: verify old password, derive new key+salt, re-encrypt every entry's `password`/`notes` blobs with the new key, save.

- [ ] **Step 2:** Build `SettingsScreen.tsx` — auto-lock timeout dropdown (1/5/15/30 min), change master password form (old + new + confirm).

- [ ] **Step 3:** Build `BackupScreen.tsx` — "Export encrypted backup" downloads the `KeypeerFile` JSON as a `.keypeer` file via a blob URL; "Import backup" file picker, warns it overwrites current keypeer, requires re-entering master password matching the imported file's salt.

- [ ] **Step 4:** Manual test — change master password, confirm old password no longer unlocks and new one does; export, wipe `chrome.storage.local` via devtools, import, confirm entries restored.

- [ ] **Step 5:** Commit.
```bash
git add src/options src/messaging src/background && git commit -m "feat: options page - settings, backup, password change"
```

---

### Task 9: Polish Pass + Manual QA Checklist

**Files:**
- Modify: various (icons, error states, edge cases)

- [ ] **Step 1:** Add real icon assets (16/48/128px) to `icons/`.
- [ ] **Step 2:** Add loading spinners for async operations >200ms (unlock, import).
- [ ] **Step 3:** Add empty states: no entries, no search results, wrong master password (with attempt counter — no lockout needed for local-only, but show a subtle warning after 5 failed attempts).
- [ ] **Step 4:** Keyboard support: Enter submits unlock form, Esc closes modals, `/` focuses search in list screen.
- [ ] **Step 5:** Full manual QA pass:
  - [ ] Fresh install → init → add 5 entries → lock → unlock
  - [ ] Autofill on 3 different real sites
  - [ ] Save-prompt on a new login
  - [ ] Change master password → old password rejected
  - [ ] Export → clear storage → import → data intact
  - [ ] Auto-lock timer actually locks after configured timeout
- [ ] **Step 6:** Final commit + tag.
```bash
git add -A && git commit -m "polish: icons, loading states, keyboard support, empty states"
git tag v0.1.0
```

---

## Self-Review Notes

- Spec coverage: crypto ✅ (Task 2), storage ✅ (Task 3), background/session ✅ (Task 4), CRUD GUI ✅ (Task 5), autofill ✅ (Task 6), save-prompt ✅ (Task 7), settings/backup ✅ (Task 8), polish ✅ (Task 9).
- Type consistency: `KeypeerMessage`, `KeypeerEntry`, `EncryptedBlob` defined once (Tasks 2–4) and reused verbatim in later tasks.
- No backend, no network calls except the optional favicon fetch flagged in Task 5 — swap for a local avatar if you want truly zero network.
