export interface DetectedLoginForm {
  usernameInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  form: HTMLFormElement | null;
}

export function findLoginForms(doc: Document): DetectedLoginForm[] {
  const results: DetectedLoginForm[] = [];
  const passwordInputs = Array.from(
    doc.querySelectorAll<HTMLInputElement>('input[type="password"]')
  );

  for (const passwordInput of passwordInputs) {
    const form = passwordInput.closest('form');
    const scope = form ?? doc;
    const candidates = Array.from(
      scope.querySelectorAll<HTMLInputElement>(
        'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
      )
    );

    // Pick candidate preceding the password field in DOM order
    const usernameInput = candidates
      .filter((el) => {
        // Exclude search inputs or hidden inputs
        if (el.type === 'hidden') return false;
        if (el.getAttribute('role') === 'search') return false;
        return Boolean(
          el.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      })
      .pop();

    if (usernameInput) {
      results.push({ usernameInput, passwordInput, form });
    }
  }
  return results;
}
