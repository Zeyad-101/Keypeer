<div align="center">

<img src="https://img.shields.io/badge/status-in%20development-8b5cf6?style=for-the-badge" alt="status">
<img src="https://img.shields.io/badge/manifest-v3-1a1b2e?style=for-the-badge" alt="manifest v3">
<img src="https://img.shields.io/badge/encryption-AES--256--GCM-8b5cf6?style=for-the-badge" alt="AES-256-GCM">
<img src="https://img.shields.io/badge/KDF-Argon2id-1a1b2e?style=for-the-badge" alt="Argon2id">
<img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=for-the-badge" alt="MIT license">

<h1>🔑 Keypeer</h1>
<p><strong>A local-first password manager that lives in your browser.</strong></p>
<p>No servers. No accounts. No sync you didn't ask for. Your vault stays on your machine, encrypted with your master password.</p>

</div>

---

## 🛡️ Why this exists

Most password managers ask you to trust a company's server with your credentials. Keypeer doesn't have a server. Everything is encrypted and stored in `chrome.storage.local` — if it's not on your device, it doesn't exist.

## ⚡ What it does

- 🔐 **Encrypts everything at rest** — AES-256-GCM per entry, master key derived with Argon2id and held in memory only
- 🖱️ **Autofills login forms** — detects username/password fields on any page and offers a one-click fill
- 💾 **Prompts to save new logins** — catches credentials on submit, asks before storing
- ✏️ **Full CRUD** — add, edit, delete, and search entries from a popup UI
- ⏱️ **Auto-locks** — configurable idle timeout clears the key from memory
- 📦 **Encrypted export/import** — back up your vault as a file without ever decrypting it outside the extension

## 🧩 Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  Content Script  │◄────►│  Background Worker    │◄────►│  chrome.storage  │
│  (per tab)       │      │  (holds key in memory) │      │  .local          │
│                  │      │                        │      │  (encrypted)     │
│ • form detection │      │ • Argon2id KDF         │      └─────────────────┘
│ • autofill icon  │      │ • AES-GCM encrypt/     │
│ • save prompt    │      │   decrypt              │      ┌─────────────────┐
└─────────────────┘      │ • auto-lock timer      │◄────►│  Popup / Options │
                          └──────────────────────┘      │  (React + Vite)   │
                                                          └─────────────────┘
```

The master key never touches disk. Lock the vault, close the browser, or let the idle timer run out, and the key is gone until you unlock again.

## 🛠️ Stack

| Layer | Choice |
|---|---|
| Extension | Manifest V3 |
| UI | React 18 + Vite + Tailwind CSS |
| Crypto | Argon2id (KDF) + AES-256-GCM (Web Crypto API) |
| Storage | `chrome.storage.local`, no backend |
| Targets | Chrome, Edge, Brave |

## 📂 Project structure

```
keypeer/
├── manifest.json
├── src/
│   ├── background/     # service worker, session, vault controller
│   ├── crypto/         # Argon2id KDF, AES-GCM helpers
│   ├── storage/         # schema + chrome.storage wrapper
│   ├── content/         # form detection, autofill, save prompt
│   ├── messaging/       # typed background <-> UI message contracts
│   ├── popup/           # unlock, vault list, entry detail screens
│   ├── options/         # settings, backup/restore
│   └── shared/          # components and hooks shared across UI
└── tests/               # crypto, storage, and form-detection tests
```

## 🚀 Getting started

```bash
git clone <repo-url>
cd keypeer
npm install
npm run build
```

Then load it as an unpacked extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

## 🔒 Security notes

- Master password is never stored — only its Argon2id-derived key exists, in memory, until lock
- Each entry has its own random IV; no two encrypted blobs look alike even for identical passwords
- Changing your master password re-encrypts every entry with the new key
- No network requests. Full stop.

If you find a security issue, please don't open a public issue — reach out privately first.

## 🗺️ Status

Actively in development. Core crypto, storage, and the popup UI are built first; autofill and the save-prompt flow come after the vault itself is solid. See the implementation plan for the full task breakdown.

## 📄 License

MIT — do what you want with it, just don't blame me if you lose your own vault file.

---

<div align="center">
<sub>Built by Zeyad Waled</sub>
</div>
