import type { AdAccount, Report, TelegramGroup } from '@prisma/client';
import type { AdAccountOption, MetricKey, ReportResponse } from '@hisobotchi/shared';

export type ReportWithRelations = Report & {
  adAccount: AdAccount;
  telegramGroup: TelegramGroup;
};

/** JSON array column → string[] guard. */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function toReportResponse(report: ReportWithRelations): ReportResponse {
  return {
    id: report.id,
    name: report.name,
    adAccountId: report.adAccountId,
    adAccountName: report.adAccount.name,
    telegramGroupId: report.telegramGroupId,
    telegramGroupTitle: report.telegramGroup.title,
    metrics: report.metrics as MetricKey[],
    leadActionType: report.leadActionType,
    windowPreset: report.windowPreset,
    timezone: report.timezone,
    sendTimes: toStringArray(report.sendTimes),
    weekdays: report.weekdays,
    enabled: report.enabled,
    lastRunAt: report.lastRunAt ? report.lastRunAt.toISOString() : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toAdAccountOption(account: AdAccount): AdAccountOption {
  return {
    id: account.id,
    actId: account.actId,
    name: account.name,
    currency: account.currency,
    defaultLeadActionType: account.defaultLeadActionType,
  };
}
