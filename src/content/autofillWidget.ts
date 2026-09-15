import type { DetectedLoginForm } from './formDetector';
import type { KeypeerEntryPublic, KeypeerResponse } from '../messaging/protocol';

const ATTACHED_FLAG = '__keypeer_attached__';

export function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  const prototype = Object.getPrototypeOf(input);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    'value'
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value);
  } else if (valueSetter) {
    valueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function attachAutofillWidget(form: DetectedLoginForm): void {
  const { usernameInput, passwordInput } = form;

  // Avoid duplicate attachment
  if ((usernameInput as any)[ATTACHED_FLAG]) {
    return;
  }
  (usernameInput as any)[ATTACHED_FLAG] = true;

  const domain = window.location.hostname;

  // Check if credentials exist for this domain first
  try {
    chrome.runtime.sendMessage(
      { type: 'KEYPEER_HAS_ENTRY_FOR_DOMAIN', domain },
      (response: KeypeerResponse<boolean>) => {
        if (!response || !response.success || !response.data) {
          return; // No credentials for this domain, skip rendering widget
        }

        renderIconWidget(usernameInput, passwordInput, domain);
      }
    );
  } catch {
    // Runtime disconnected or invalid context
  }
}

function renderIconWidget(
  usernameInput: HTMLInputElement,
  passwordInput: HTMLInputElement,
  domain: string
): void {
  // Create wrapper container or position relative to input
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Autofill with Keypeer');
  btn.style.cssText = `
    position: absolute;
    z-index: 2147483645;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: none;
    background: #4f46e5;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.15s ease, background 0.15s ease;
  `;
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 2l-2 2m-1.5 1.5L10 13V17H6V13L4.5 11.5a6 6 0 1 1 8.5-8.5l4.5 4.5"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  `;

  btn.onmouseenter = () => {
    btn.style.background = '#6366f1';
    btn.style.transform = 'scale(1.08)';
  };
  btn.onmouseleave = () => {
    btn.style.background = '#4f46e5';
    btn.style.transform = 'scale(1)';
  };

  function updatePosition() {
    const rect = usernameInput.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = 'flex';
    btn.style.top = `${window.scrollY + rect.top + (rect.height - 22) / 2}px`;
    btn.style.left = `${window.scrollX + rect.right - 26}px`;
  }

  updatePosition();
  document.body.appendChild(btn);

  // Keep positioned on window scroll or resize
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });

  let dropdownEl: HTMLElement | null = null;

  function closeDropdown() {
    if (dropdownEl) {
      dropdownEl.remove();
      dropdownEl = null;
    }
  }

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (dropdownEl) {
      closeDropdown();
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'KEYPEER_GET_MATCHING_CREDENTIALS', domain },
      (response: KeypeerResponse<KeypeerEntryPublic[]>) => {
        if (!response || !response.success || !response.data || response.data.length === 0) {
          // Vault might be locked
          showLockedTooltip(btn);
          return;
        }

        const creds = response.data;
        showDropdown(btn, creds, (selected) => {
          setNativeInputValue(usernameInput, selected.username);
          setNativeInputValue(passwordInput, selected.password);
          closeDropdown();
        });
      }
    );
  };

  document.addEventListener('click', (e) => {
    if (dropdownEl && !dropdownEl.contains(e.target as Node) && e.target !== btn) {
      closeDropdown();
    }
  });
}

function showLockedTooltip(anchor: HTMLElement): void {
  const existing = document.getElementById('keypeer-locked-tooltip');
  if (existing) existing.remove();

  const tip = document.createElement('div');
  tip.id = 'keypeer-locked-tooltip';
  tip.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    background: #18181b;
    color: #f4f4f5;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    white-space: nowrap;
  `;
  tip.textContent = 'Unlock Keypeer extension to autofill';

  const rect = anchor.getBoundingClientRect();
  tip.style.top = `${window.scrollY + rect.bottom + 6}px`;
  tip.style.left = `${window.scrollX + rect.left - 100}px`;

  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), 2500);
}

function showDropdown(
  anchor: HTMLElement,
  credentials: KeypeerEntryPublic[],
  onSelect: (cred: KeypeerEntryPublic) => void
): void {
  const dropdown = document.createElement('div');
  dropdown.style.cssText = `
    position: absolute;
    z-index: 2147483646;
    width: 240px;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 7px 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #a1a1aa;
    background: #27272a;
    border-bottom: 1px solid #3f3f46;
  `;
  header.textContent = 'Keypeer Autofill';
  dropdown.appendChild(header);

  const list = document.createElement('div');
  list.style.cssText = 'max-height: 180px; overflow-y: auto; padding: 4px 0;';

  credentials.forEach((c) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: background 0.1s ease;
    `;
    item.innerHTML = `
      <span style="font-size: 12px; font-weight: 500; color: #f4f4f5;">${escapeHtml(c.username)}</span>
      <span style="font-size: 10px; color: #71717a;">${escapeHtml(c.domain)}</span>
    `;
    item.onmouseenter = () => {
      item.style.background = '#27272a';
    };
    item.onmouseleave = () => {
      item.style.background = 'transparent';
    };
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(c);
    };
    list.appendChild(item);
  });

  dropdown.appendChild(list);

  const rect = anchor.getBoundingClientRect();
  dropdown.style.top = `${window.scrollY + rect.bottom + 6}px`;
  dropdown.style.left = `${Math.max(10, window.scrollX + rect.right - 240)}px`;

  document.body.appendChild(dropdown);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
