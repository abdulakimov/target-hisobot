/** Reporting window presets → mapped to Meta `date_preset`. */
export const WINDOW_PRESETS = ['yesterday', 'today', 'last_7d', 'last_30d', 'this_month'] as const;
export type WindowPreset = (typeof WINDOW_PRESETS)[number];

/** Uzbek labels for window presets. */
export const WINDOW_LABELS: Record<WindowPreset, string> = {
  yesterday: 'Kecha',
  today: 'Bugun',
  last_7d: "So'nggi 7 kun",
  last_30d: "So'nggi 30 kun",
  this_month: 'Shu oy',
};

/** Window preset → Meta Graph API `date_preset` value. */
export const WINDOW_TO_DATE_PRESET: Record<WindowPreset, string> = {
  yesterday: 'yesterday',
  today: 'today',
  last_7d: 'last_7d',
  last_30d: 'last_30d',
  this_month: 'this_month',
};

export const META_CONNECTION_STATUSES = ['active', 'expired', 'revoked'] as const;
export type MetaConnectionStatus = (typeof META_CONNECTION_STATUSES)[number];

export const BOT_STATUSES = ['member', 'admin', 'removed'] as const;
export type BotStatus = (typeof BOT_STATUSES)[number];

export const REPORT_RUN_STATUSES = ['success', 'failed'] as const;
export type ReportRunStatus = (typeof REPORT_RUN_STATUSES)[number];

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Du',
  2: 'Se',
  3: 'Cho',
  4: 'Pa',
  5: 'Ju',
  6: 'Sha',
  7: 'Ya',
};
