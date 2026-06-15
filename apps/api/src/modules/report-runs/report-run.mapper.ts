import type { AdAccount, Report, ReportRun, TelegramGroup } from '@prisma/client';
import type { ReportRunResponse } from '@hisobotchi/shared';

export type ReportRunWithReport = ReportRun & {
  report: Report & { adAccount: AdAccount; telegramGroup: TelegramGroup };
};

interface Snapshot {
  test?: boolean;
  currency?: string;
  values?: Record<string, number>;
}

/** A metrics snapshot is a JSON object; arrays/primitives/null are not valid snapshots. */
export function parseSnapshot(value: unknown): Snapshot | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Snapshot;
  }
  return null;
}

export function toReportRunResponse(run: ReportRunWithReport): ReportRunResponse {
  const snapshot = parseSnapshot(run.metricsSnapshot);
  const spend = typeof snapshot?.values?.ad_spend === 'number' ? snapshot.values.ad_spend : null;
  return {
    id: run.id,
    reportId: run.reportId,
    reportLabel: run.report.name || run.report.adAccount.name,
    telegramGroupTitle: run.report.telegramGroup.title,
    status: run.status,
    scheduledFor: run.scheduledFor.toISOString(),
    ranAt: run.ranAt ? run.ranAt.toISOString() : null,
    windowStart: run.windowStart ? run.windowStart.toISOString() : null,
    windowEnd: run.windowEnd ? run.windowEnd.toISOString() : null,
    spend,
    currency: snapshot?.currency ?? null,
    isTest: snapshot?.test === true,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    telegramMessageId: run.telegramMessageId ? run.telegramMessageId.toString() : null,
    createdAt: run.createdAt.toISOString(),
  };
}
