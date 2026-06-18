import { describe, it, expect } from 'vitest';
import { DEFAULT_LOCALE, isLocale, resolveLocale } from './locales.js';

describe('locales', () => {
  it('recognizes supported locales', () => {
    expect(isLocale('uz')).toBe(true);
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('resolves the first valid candidate', () => {
    expect(resolveLocale('ru', 'uz')).toBe('ru');
    expect(resolveLocale(null, 'en')).toBe('en');
    expect(resolveLocale(undefined, 'xx')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale()).toBe(DEFAULT_LOCALE);
  });
});
