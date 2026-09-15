// @vitest-environment jsdom
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
    expect(forms[0].passwordInput.name).toBe('password');
  });

  it('finds a bare password input with no form tag', () => {
    document.body.innerHTML = `
      <div>
        <input type="email" name="user_email" />
        <input type="password" name="user_pwd" />
      </div>`;
    const forms = findLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].usernameInput.name).toBe('user_email');
    expect(forms[0].passwordInput.name).toBe('user_pwd');
  });

  it('returns empty when no password input exists', () => {
    document.body.innerHTML = `<input type="text" name="search" />`;
    expect(findLoginForms(document)).toHaveLength(0);
  });
});
