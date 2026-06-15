import type { MetricKey } from './metrics.js';
import type { WindowPreset } from './enums.js';
import type { GroupResponse } from './groups.js';

/** A configured report (joins an ad account + a group with metrics + a schedule). */
export interface ReportResponse {
  id: string;
  name: string | null;
  adAccountId: string;
  adAccountName: string;
  telegramGroupId: string;
  telegramGroupTitle: string;
  metrics: MetricKey[];
  leadActionType: string | null;
  windowPreset: WindowPreset;
  timezone: string;
  sendTimes: string[];
  weekdays: number[];
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An enabled ad account, selectable in the report editor. */
export interface AdAccountOption {
  id: string;
  actId: string;
  name: string;
  currency: string;
  defaultLeadActionType: string | null;
}

/** GET /api/reports/options — choices for the report editor. */
export interface ReportFormOptions {
  adAccounts: AdAccountOption[];
  groups: GroupResponse[];
}

/** POST /api/reports body. */
export interface CreateReportInput {
  name?: string | null;
  adAccountId: string;
  telegramGroupId: string;
  metrics: MetricKey[];
  leadActionType?: string | null;
  windowPreset: WindowPreset;
  timezone: string;
  sendTimes: string[];
  weekdays: number[];
  enabled?: boolean;
}

/** PATCH /api/reports/:id body. */
export type UpdateReportInput = Partial<CreateReportInput>;

/** POST /api/reports/:id/test-send result. */
export type TestSendResponse = { ok: true } | { ok: false; error: string };
