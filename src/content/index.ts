import { findLoginForms } from './formDetector';
import { attachAutofillWidget } from './autofillWidget';
import { setupSavePrompt } from './savePrompt';

function scanAndAttach() {
  const forms = findLoginForms(document);
  for (const form of forms) {
    attachAutofillWidget(form);
    setupSavePrompt(form);
  }
}

// Initial scan
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanAndAttach);
} else {
  scanAndAttach();
}

// Observe dynamic DOM changes (e.g. SPAs like React, Vue, Angular)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    scanAndAttach();
  }, 300);
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});
