import type { DetectedLoginForm } from './formDetector';
import type { KeypeerEntryPublic, KeypeerResponse, KeypeerStatus } from '../messaging/protocol';

const neverDomains = new Set<string>();

export function setupSavePrompt(detectedForm: DetectedLoginForm): void {
  const { form, usernameInput, passwordInput } = detectedForm;

  const handlePossibleSubmit = () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) return;

    const domain = window.location.hostname;
    if (neverDomains.has(domain)) return;

    try {
      chrome.runtime.sendMessage(
        { type: 'KEYPEER_STATUS' },
        (statusRes: KeypeerResponse<KeypeerStatus>) => {
          if (!statusRes?.success || !statusRes.data.unlocked) return;

          chrome.runtime.sendMessage(
            { type: 'KEYPEER_GET_MATCHING_CREDENTIALS', domain },
            (credRes: KeypeerResponse<KeypeerEntryPublic[]>) => {
              if (credRes?.success && Array.isArray(credRes.data)) {
                const alreadyExists = credRes.data.some(
                  (c) => c.username.toLowerCase() === username.toLowerCase()
                );
                if (alreadyExists) return;
              }

              renderSaveBanner(domain, username, password);
            }
          );
        }
      );
    } catch {
      // Disconnected
    }
  };

  if (form) {
    form.addEventListener('submit', handlePossibleSubmit);
  }

  passwordInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setTimeout(handlePossibleSubmit, 100);
    }
  });
}

function renderSaveBanner(domain: string, username: string, password: string): void {
  const hostId = 'keypeer-save-prompt-root';
  const existing = document.getElementById(hostId);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = hostId;
  host.style.cssText = 'all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .banner {
      width: 320px;
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      padding: 16px;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateY(-12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .icon {
      width: 24px;
      height: 24px;
      background: #7c3aed;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
    }
    .text {
      font-size: 12px;
      color: #a1a1aa;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .user-pill {
      display: inline-block;
      background: #27272a;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      color: #c4b5fd;
      word-break: break-all;
      margin-bottom: 14px;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease;
    }
    .btn-save {
      background: #7c3aed;
      color: white;
    }
    .btn-save:hover {
      background: #8b5cf6;
    }
    .btn-dismiss {
      background: #27272a;
      color: #d4d4d8;
    }
    .btn-dismiss:hover {
      background: #3f3f46;
    }
    .btn-never {
      background: transparent;
      color: #71717a;
      flex: none;
      padding: 4px 8px;
      font-size: 11px;
      margin-top: 8px;
      width: 100%;
      text-align: center;
    }
    .btn-never:hover {
      color: #a1a1aa;
    }
  `;
  shadow.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.innerHTML = `
    <div class="header">
      <div class="icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2l-2 2m-1.5 1.5L10 13V17H6V13L4.5 11.5a6 6 0 1 1 8.5-8.5l4.5 4.5"/>
          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <span class="title">Save Password?</span>
    </div>
    <div class="text">Would you like Keypeer to save credentials for <strong>${escapeHtml(domain)}</strong>?</div>
    <div class="user-pill">${escapeHtml(username)}</div>
    <div class="actions">
      <button class="btn-dismiss" id="kp-dismiss">Dismiss</button>
      <button class="btn-save" id="kp-save">Save Password</button>
    </div>
    <button class="btn-never" id="kp-never">Never for this site</button>
  `;
  shadow.appendChild(banner);

  const dismiss = () => {
    host.remove();
  };

  shadow.getElementById('kp-dismiss')?.addEventListener('click', dismiss);

  shadow.getElementById('kp-never')?.addEventListener('click', () => {
    neverDomains.add(domain);
    dismiss();
  });

  shadow.getElementById('kp-save')?.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'KEYPEER_ADD_ENTRY',
          domain,
          username,
          password,
        },
        () => {
          dismiss();
        }
      );
    } catch {
      dismiss();
    }
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
