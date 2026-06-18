import { Injectable, Logger } from '@nestjs/common';
import type { AdAccount, Report, TelegramGroup, User } from '@prisma/client';
import {
  formatUzDateRange,
  formatUzDateTime,
  renderReportMessage,
  type MetricKey,
  type ReportMetricValues,
} from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramSenderService } from '../telegram/telegram-sender.service';
import { humanizeSendError } from '../telegram/send-error';
import { ReportRunsService } from '../report-runs/report-runs.service';
import { buildFailureDmMessage } from '../report-runs/failure-dm';
import { InsightsService, MetaNotConnectedError } from '../meta/insights.service';

export type DueReport = Report & {
  adAccount: AdAccount;
  telegramGroup: TelegramGroup;
  user: Pick<User, 'telegramUserId' | 'accessExpiresAt'>;
};

/**
 * Dispatches one due report: dedupe → fetch Meta Insights → render → send → record a
 * ReportRun + update lastRunAt, and DM the owner on failure (M5 + M6 failure alert).
 */
@Injectable()
export class ReportDispatcherService {
  private readonly logger = new Logger(ReportDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
    private readonly sender: TelegramSenderService,
    private readonly reportRuns: ReportRunsService,
  ) {}

  async dispatch(report: DueReport, scheduledFor: Date): Promise<void> {
    // Dedupe: one run per (report, minute) — guards against double-send.
    const already = await this.prisma.reportRun.findUnique({
      where: { reportId_scheduledFor: { reportId: report.id, scheduledFor } },
    });
    if (already) return;

    const metrics = report.metrics as MetricKey[];
    let status: 'success' | 'failed' = 'success';
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let telegramMessageId: number | null = null;
    let snapshot: { currency: string; values: ReportMetricValues } | undefined;
    let windowStart: Date | null = null;
    let windowEnd: Date | null = null;

    try {
      const insights = await this.insights.fetchForReport({
        actId: report.adAccount.actId,
        currency: report.adAccount.currency,
        metaConnectionId: report.adAccount.metaConnectionId,
        windowPreset: report.windowPreset,
        leadActionType: report.leadActionType,
      });
      windowStart = insights.windowStart;
      windowEnd = insights.windowEnd;
      snapshot = { currency: insights.currency, values: insights.values };

      const html = renderReportMessage({
        accountName: report.adAccount.name,
        windowPreset: report.windowPreset,
        dateRange: formatUzDateRange(insights.windowStart, insights.windowEnd, report.timezone),
        sentAt: formatUzDateTime(new Date(), report.timezone),
        currency: insights.currency,
        metrics,
        values: insights.values,
      });

      const outcome = await this.sender.sendHtml(report.telegramGroup.chatId, html);
      if (outcome.ok) {
        telegramMessageId = outcome.messageId;
      } else {
        status = 'failed';
        errorCode = outcome.kind;
        errorMessage = humanizeSendError(outcome.kind, outcome.description);
      }
    } catch (err) {
      status = 'failed';
      errorCode = err instanceof MetaNotConnectedError ? 'meta_disconnected' : 'insights_error';
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    try {
      await this.reportRuns.record({
        reportId: report.id,
        userId: report.userId,
        status,
        scheduledFor,
        windowStart,
        windowEnd,
        metricsSnapshot: snapshot,
        telegramMessageId,
        errorCode,
        errorMessage,
      });
    } catch {
      // unique(report_id, scheduled_for) race — another tick already recorded this minute.
      return;
    }
    await this.prisma.report.update({ where: { id: report.id }, data: { lastRunAt: new Date() } });

    if (status === 'failed') {
      this.logger.warn(`report ${report.id} failed: ${errorCode} — ${errorMessage}`);
      const dm = buildFailureDmMessage(
        report.name || report.adAccount.name,
        report.telegramGroup.title,
        errorMessage ?? "Noma'lum xato",
      );
      await this.sender.sendHtml(report.user.telegramUserId, dm);
    }
  }
}
