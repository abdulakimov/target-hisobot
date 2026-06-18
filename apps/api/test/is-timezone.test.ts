import { describe, it, expect } from 'vitest';
import { isValidTimeZone } from '../src/modules/common/validation/is-timezone.validator';

describe('isValidTimeZone', () => {
  it('accepts valid IANA zones', () => {
    expect(isValidTimeZone('Asia/Tashkent')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Europe/Moscow')).toBe(true);
  });

  it('rejects invalid or non-string values', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('Tashkent')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(123)).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });
});
