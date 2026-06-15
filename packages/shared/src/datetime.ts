/** Uzbek date formatting in a given IANA timezone (for report messages, PLAN sec 8). */

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

function partsIn(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "12-iyun 2026" */
export function formatUzDate(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  return `${p.day}-${UZ_MONTHS[p.month - 1]} ${p.year}`;
}

/** "13-iyun 09:00" */
export function formatUzDateTime(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  return `${p.day}-${UZ_MONTHS[p.month - 1]} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "12-iyun 2026" (one day) · "8–14-iyun 2026" (same month) · cross-month / cross-year forms. */
export function formatUzDateRange(start: Date | null, end: Date | null, timeZone: string): string {
  if (!start || !end) return '';
  const s = partsIn(start, timeZone);
  const e = partsIn(end, timeZone);
  if (s.year === e.year && s.month === e.month && s.day === e.day) {
    return formatUzDate(start, timeZone);
  }
  if (s.year === e.year && s.month === e.month) {
    return `${s.day}–${e.day}-${UZ_MONTHS[e.month - 1]} ${e.year}`;
  }
  if (s.year === e.year) {
    return `${s.day}-${UZ_MONTHS[s.month - 1]} – ${e.day}-${UZ_MONTHS[e.month - 1]} ${e.year}`;
  }
  return `${formatUzDate(start, timeZone)} – ${formatUzDate(end, timeZone)}`;
}
