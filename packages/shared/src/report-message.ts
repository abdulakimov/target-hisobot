import type { MetricKey } from './metrics.js';
import { WINDOW_LABELS, type WindowPreset } from './enums.js';
import { formatInteger, formatMoney, formatPercent } from './format.js';

/** Computed metric values for one report run. A `null`/absent value hides that line. */
export interface ReportMetricValues {
  ad_spend?: number | null;
  cost_per_lead?: number | null;
  impressions?: number | null;
  reach?: number | null;
  lead_count?: number | null;
  unique_ctr?: number | null;
}

export interface ReportMessageInput {
  /** Ad account display name (shown in the title). */
  accountName: string;
  /** Window preset → localized label (Kecha / Bugun / …). */
  windowPreset: WindowPreset;
  /** Pre-formatted Uzbek date range, e.g. "12-iyun 2026". */
  dateRange: string;
  /** Pre-formatted send timestamp, e.g. "13-iyun 09:00". */
  sentAt: string;
  /** Account currency code (UZS, USD, …) for money lines. */
  currency: string;
  /** Enabled metric keys for this report. */
  metrics: MetricKey[];
  /** Computed values; enabled-but-null metrics (e.g. leads without a lead type) are skipped. */
  values: ReportMetricValues;
}

/** Fixed display order of metric lines in the Telegram message (PLAN.md §8). */
const LINE_ORDER: readonly MetricKey[] = [
  'ad_spend',
  'lead_count',
  'cost_per_lead',
  'impressions',
  'reach',
  'unique_ctr',
] as const;

/** Escape the characters significant in Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function metricLine(key: MetricKey, value: number, currency: string): string {
  switch (key) {
    case 'ad_spend':
      return `💰 Sarf: ${formatMoney(value, currency)}`;
    case 'lead_count':
      return `🎯 Lidlar: ${formatInteger(value)}`;
    case 'cost_per_lead':
      return `📉 CPL: ${formatMoney(value, currency)}`;
    case 'impressions':
      return `👁 Ko'rsatildi: ${formatInteger(value)}`;
    case 'reach':
      return `📣 Qamrov: ${formatInteger(value)}`;
    case 'unique_ctr':
      return `🔗 Unique CTR: ${formatPercent(value)}%`;
  }
}

/**
 * Render a report as a Telegram-HTML message (PLAN.md §8), in Uzbek.
 * Only enabled metrics that have a finite value are rendered, in the fixed display order.
 */
export function renderReportMessage(input: ReportMessageInput): string {
  const enabled = new Set(input.metrics);
  const header = [
    `📊 Hisobot — ${escapeHtml(input.accountName)}`,
    `🗓 ${escapeHtml(WINDOW_LABELS[input.windowPreset])} · ${escapeHtml(input.dateRange)}`,
  ];

  const body: string[] = [];
  for (const key of LINE_ORDER) {
    if (!enabled.has(key)) continue;
    const value = input.values[key];
    if (value == null || !Number.isFinite(value)) continue;
    body.push(metricLine(key, value, input.currency));
  }

  const footer = [`⏱ ${escapeHtml(input.sentAt)}`];

  return [...header, '', ...body, '', ...footer].join('\n');
}
