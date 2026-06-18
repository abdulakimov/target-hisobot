import { describe, expect, it } from 'vitest';
import { deriveAccessStatus, isAccessActive } from './access';

const now = new Date('2026-06-18T12:00:00Z');

describe('deriveAccessStatus', () => {
  it('is none when never granted (null)', () => {
    expect(deriveAccessStatus(null, now)).toBe('none');
    expect(deriveAccessStatus(undefined, now)).toBe('none');
  });
  it('is active when expiry is in the future', () => {
    expect(deriveAccessStatus('2026-07-18T12:00:00Z', now)).toBe('active');
  });
  it('is expired when expiry is in the past', () => {
    expect(deriveAccessStatus('2026-06-01T12:00:00Z', now)).toBe('expired');
  });
  it('treats the exact expiry instant as expired', () => {
    expect(deriveAccessStatus('2026-06-18T12:00:00Z', now)).toBe('expired');
  });
  it('accepts a Date as well as a string', () => {
    expect(deriveAccessStatus(new Date('2026-07-01T00:00:00Z'), now)).toBe('active');
  });
  it('is none for an unparseable value', () => {
    expect(deriveAccessStatus('not-a-date', now)).toBe('none');
  });
});

describe('isAccessActive', () => {
  it('is true only for an unexpired grant', () => {
    expect(isAccessActive('2026-07-18T12:00:00Z', now)).toBe(true);
    expect(isAccessActive(null, now)).toBe(false);
    expect(isAccessActive('2026-06-01T00:00:00Z', now)).toBe(false);
  });
});
