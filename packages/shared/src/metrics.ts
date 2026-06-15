/**
 * Metric keys shown in a report. Mirrors PLAN.md §9.
 * User-facing labels are Uzbek (Latin); keys/identifiers are English.
 */
export const METRIC_KEYS = [
  'ad_spend',
  'cost_per_lead',
  'impressions',
  'reach',
  'lead_count',
  'unique_ctr',
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

/** Uzbek labels for each metric. */
export const METRIC_LABELS: Record<MetricKey, string> = {
  ad_spend: 'Sarf',
  cost_per_lead: 'CPL',
  impressions: "Ko'rsatildi",
  reach: 'Qamrov',
  lead_count: 'Lidlar',
  unique_ctr: 'Unique CTR',
};

/** Metrics that require a lead `action_type` to be selected on the report. */
export const LEAD_DEPENDENT_METRICS: readonly MetricKey[] = ['lead_count', 'cost_per_lead'];

/** Default metric selection for a new report — all on. */
export const DEFAULT_METRICS: readonly MetricKey[] = METRIC_KEYS;
