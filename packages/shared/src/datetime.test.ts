import { describe, expect, it } from 'vitest';
import { formatUzDate, formatUzDateRange, formatUzDateTime } from './datetime';

const TZ = 'Asia/Tashkent'; // UTC+5

describe('formatUzDate', () => {
  it('formats a date', () => {
    expect(formatUzDate(new Date('2026-06-12T00:00:00Z'), TZ)).toBe('12-iyun 2026');
  });
  it('respects the timezone day boundary', () => {
    // 20:00 UTC = 01:00 next day in Tashkent.
    expect(formatUzDate(new Date('2026-06-12T20:00:00Z'), TZ)).toBe('13-iyun 2026');
  });
});

describe('formatUzDateTime', () => {
  it('formats date + 24h time', () => {
    // 04:00 UTC = 09:00 Tashkent.
    expect(formatUzDateTime(new Date('2026-06-13T04:00:00Z'), TZ)).toBe('13-iyun 09:00');
  });
});

describe('formatUzDateRange', () => {
  it('collapses a single day', () => {
    const d = new Date('2026-06-12T00:00:00Z');
    expect(formatUzDateRange(d, d, TZ)).toBe('12-iyun 2026');
  });
  it('formats a same-month range', () => {
    expect(
      formatUzDateRange(new Date('2026-06-08T00:00:00Z'), new Date('2026-06-14T00:00:00Z'), TZ),
    ).toBe('8–14-iyun 2026');
  });
  it('returns empty for missing bounds', () => {
    expect(formatUzDateRange(null, null, TZ)).toBe('');
  });
});
