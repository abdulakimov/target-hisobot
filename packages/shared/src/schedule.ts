/**
 * Timezone-aware schedule matching for the report scheduler (PLAN.md §6).
 * Pure functions over an IANA timezone + 24h send times + ISO weekdays (1=Mon … 7=Sun).
 *
 * DST note: wall-clock → UTC uses a single-correction offset resolution. Exact for
 * fixed-offset zones (e.g. Asia/Tashkent, UTC+5, no DST); for DST zones the rare
 * transition-boundary minute may be off by an hour. Fine for this product's use.
 */

export interface ScheduleSpec {
  /** IANA timezone, e.g. "Asia/Tashkent". */
  timezone: string;
  /** 24h send times "HH:MM" (e.g. ["09:00","18:00"]). */
  sendTimes: string[];
  /** ISO weekdays the report runs on: 1=Mon … 7=Sun. */
  weekdays: number[];
}

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  weekday: number; // ISO 1-7
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Normalize "9:5"→null, "9:05"→"09:05"; returns null if not a valid HH:MM. */
function normalizeHhmm(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

/** Wall-clock parts of an instant rendered in the given timezone. */
function getLocalParts(instant: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

/**
 * Is the report due at this exact minute? True when `instant`'s local weekday is in
 * `weekdays` and its local HH:MM matches one of `sendTimes`.
 */
export function isDue(spec: ScheduleSpec, instant: Date): boolean {
  if (spec.sendTimes.length === 0 || spec.weekdays.length === 0) return false;
  const local = getLocalParts(instant, spec.timezone);
  if (!spec.weekdays.includes(local.weekday)) return false;
  const current = `${pad2(local.hour)}:${pad2(local.minute)}`;
  return spec.sendTimes.some((t) => normalizeHhmm(t) === current);
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC instant. */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const local = getLocalParts(new Date(naiveUtc), timeZone);
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offset = localAsUtc - naiveUtc; // timezone offset east of UTC, in ms
  return new Date(naiveUtc - offset);
}

/**
 * The next instant strictly after `after` at which the report would send.
 * Scans up to 8 local days; returns null if the schedule is empty.
 */
export function nextSendAt(spec: ScheduleSpec, after: Date): Date | null {
  const times = spec.sendTimes
    .map(normalizeHhmm)
    .filter((t): t is string => t !== null)
    .sort();
  if (times.length === 0 || spec.weekdays.length === 0) return null;

  const base = getLocalParts(after, spec.timezone);
  let best: Date | null = null;

  for (let offset = 0; offset <= 8; offset++) {
    // Advance the local calendar date by `offset` days (UTC math is safe for rollover).
    const d = new Date(Date.UTC(base.year, base.month - 1, base.day + offset));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const isoWeekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (!spec.weekdays.includes(isoWeekday)) continue;

    for (const t of times) {
      const [hh, mm] = t.split(':').map(Number);
      const candidate = zonedTimeToUtc(year, month, day, hh, mm, spec.timezone);
      if (candidate.getTime() > after.getTime()) {
        if (best === null || candidate.getTime() < best.getTime()) best = candidate;
      }
    }
    if (best !== null) break; // earliest qualifying day found
  }
  return best;
}
