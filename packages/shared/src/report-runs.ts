import type { ReportRunStatus } from './enums.js';

/** A report run record, as returned by GET /api/report-runs. */
export interface ReportRunResponse {
  id: string;
  reportId: string;
  /** report.name || ad account name. */
  reportLabel: string;
  telegramGroupTitle: string;
  status: ReportRunStatus;
  scheduledFor: string;
  ranAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  /** Spend pulled from the snapshot, for the list summary. */
  spend: number | null;
  currency: string | null;
  /** True for manual test sends. */
  isTest: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  telegramMessageId: string | null;
  createdAt: string;
}

/** GET /api/report-runs/latest — latest run per report, for dashboard status markers. */
export interface LatestRunSummary {
  reportId: string;
  status: ReportRunStatus;
  ranAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

/** Query filters for GET /api/report-runs. */
export interface ReportRunFilters {
  reportId?: string;
  status?: ReportRunStatus;
  from?: string;
  to?: string;
}
