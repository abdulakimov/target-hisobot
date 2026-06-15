import { describe, expect, it } from 'vitest';
import { isDue, nextSendAt, type ScheduleSpec } from './schedule';

// Asia/Tashkent is UTC+5, no DST. 2026-06-15 is a Monday (ISO weekday 1).
const TASHKENT = 'Asia/Tashkent';

describe('isDue', () => {
  it('matches local HH:MM and weekday', () => {
    // 09:00 Tashkent = 04:00 UTC, Monday.
    const spec: ScheduleSpec = { timezone: TASHKENT, sendTimes: ['09:00'], weekdays: [1] };
    expect(isDue(spec, new Date('2026-06-15T04:00:00Z'))).toBe(true);
  });
  it('is false when the minute does not match', () => {
    const spec: ScheduleSpec = { timezone: TASHKENT, sendTimes: ['09:00'], weekdays: [1] };
    expect(isDue(spec, new Date('2026-06-15T04:01:00Z'))).toBe(false);
  });
  it('is false when the weekday is excluded', () => {
    const spec: ScheduleSpec = { timezone: TASHKENT, sendTimes: ['09:00'], weekdays: [7] };
    expect(isDue(spec, new Date('2026-06-15T04:00:00Z'))).toBe(false);
  });
  it('handles multiple times and unpadded input', () => {
    const spec: ScheduleSpec = { timezone: TASHKENT, sendTimes: ['9:00', '18:00'], weekdays: [1] };
    expect(isDue(spec, new Date('2026-06-15T13:00:00Z'))).toBe(true); // 18:00 local
  });
  it('respects the timezone', () => {
    const spec: ScheduleSpec = { timezone: 'UTC', sendTimes: ['09:00'], weekdays: [1] };
    expect(isDue(spec, new Date('2026-06-15T09:00:00Z'))).toBe(true);
    expect(isDue(spec, new Date('2026-06-15T04:00:00Z'))).toBe(false);
  });
  it('is never due for an empty schedule', () => {
    expect(isDue({ timezone: TASHKENT, sendTimes: [], weekdays: [1] }, new Date())).toBe(false);
    expect(isDue({ timezone: TASHKENT, sendTimes: ['09:00'], weekdays: [] }, new Date())).toBe(false);
  });
});

describe('nextSendAt', () => {
  it('finds the next time later the same day', () => {
    const spec: ScheduleSpec = {
      timezone: TASHKENT,
      sendTimes: ['09:00', '18:00'],
      weekdays: [1, 2, 3, 4, 5, 6, 7],
    };
    // Monday 05:00 UTC = 10:00 local → next is 18:00 local = 13:00 UTC same day.
    expect(nextSendAt(spec, new Date('2026-06-15T05:00:00Z'))?.toISOString()).toBe(
      '2026-06-15T13:00:00.000Z',
    );
  });
  it('rolls forward to the next enabled weekday', () => {
    // Only Sundays(7): from Monday 2026-06-15 → Sunday 2026-06-21 09:00 local = 04:00 UTC.
    const spec: ScheduleSpec = { timezone: TASHKENT, sendTimes: ['09:00'], weekdays: [7] };
    expect(nextSendAt(spec, new Date('2026-06-15T05:00:00Z'))?.toISOString()).toBe(
      '2026-06-21T04:00:00.000Z',
    );
  });
  it('returns null for an empty schedule', () => {
    expect(nextSendAt({ timezone: TASHKENT, sendTimes: [], weekdays: [1] }, new Date())).toBeNull();
  });
});
