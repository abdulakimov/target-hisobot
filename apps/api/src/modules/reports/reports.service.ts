import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  formatUzDateTime,
  LEAD_DEPENDENT_METRICS,
  renderReportMessage,
  type CreateReportInput,
  type MetricKey,
  type ReportFormOptions,
  type ReportMetricValues,
  type ReportResponse,
  type TestSendResponse,
  type UpdateReportInput,
} from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramSenderService } from '../telegram/telegram-sender.service';
import { humanizeSendError } from '../telegram/send-error';
import { toGroupResponse } from '../groups/group.mapper';
import { ReportRunsService } from '../report-runs/report-runs.service';
import { buildFailureDmMessage } from '../report-runs/failure-dm';
import { toAdAccountOption, toReportResponse, type ReportWithRelations } from './report.mapper';

const REPORT_INCLUDE = { adAccount: true, telegramGroup: true } as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: TelegramSenderService,
    private readonly reportRuns: ReportRunsService,
  ) {}

  async findAll(userId: string): Promise<ReportResponse[]> {
    const reports = await this.prisma.report.findMany({
      where: { userId },
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return reports.map(toReportResponse);
  }

  async findOne(userId: string, id: string): Promise<ReportResponse> {
    return toReportResponse(await this.getEntity(userId, id));
  }

  async getFormOptions(userId: string): Promise<ReportFormOptions> {
    const [adAccounts, groups] = await Promise.all([
      this.prisma.adAccount.findMany({ where: { userId, enabled: true }, orderBy: { name: 'asc' } }),
      this.prisma.telegramGroup.findMany({
        where: { userId, botStatus: { not: 'removed' } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { adAccounts: adAccounts.map(toAdAccountOption), groups: groups.map(toGroupResponse) };
  }

  async create(userId: string, input: CreateReportInput): Promise<ReportResponse> {
    await this.assertAccount(userId, input.adAccountId);
    await this.assertGroup(userId, input.telegramGroupId);
    this.assertLeadDependency(input.metrics, input.leadActionType ?? null);

    const report = await this.prisma.report.create({
      data: {
        userId,
        name: input.name ?? null,
        adAccountId: input.adAccountId,
        telegramGroupId: input.telegramGroupId,
        metrics: input.metrics,
        leadActionType: input.leadActionType ?? null,
        windowPreset: input.windowPreset,
        timezone: input.timezone,
        sendTimes: input.sendTimes,
        weekdays: input.weekdays,
        enabled: input.enabled ?? true,
      },
      include: REPORT_INCLUDE,
    });
    return toReportResponse(report);
  }

  async update(userId: string, id: string, input: UpdateReportInput): Promise<ReportResponse> {
    const existing = await this.getEntity(userId, id);
    if (input.adAccountId) await this.assertAccount(userId, input.adAccountId);
    if (input.telegramGroupId) await this.assertGroup(userId, input.telegramGroupId);

    const metrics = input.metrics ?? (existing.metrics as MetricKey[]);
    const leadActionType =
      input.leadActionType !== undefined ? input.leadActionType : existing.leadActionType;
    this.assertLeadDependency(metrics, leadActionType ?? null);

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        adAccountId: input.adAccountId ?? undefined,
        telegramGroupId: input.telegramGroupId ?? undefined,
        metrics: input.metrics ?? undefined,
        leadActionType: input.leadActionType !== undefined ? input.leadActionType : undefined,
        windowPreset: input.windowPreset ?? undefined,
        timezone: input.timezone ?? undefined,
        sendTimes: input.sendTimes ?? undefined,
        weekdays: input.weekdays ?? undefined,
        enabled: input.enabled ?? undefined,
      },
      include: REPORT_INCLUDE,
    });
    return toReportResponse(report);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.report.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new NotFoundException('Report not found');
  }

  /**
   * Send a sample report to the group now to verify delivery + format before Meta is wired.
   * Records a ReportRun (M6) and DMs the owner on failure — the same path M5 reuses.
   */
  async testSend(userId: string, id: string): Promise<TestSendResponse> {
    const report = await this.getEntity(userId, id);
    const metrics = report.metrics as MetricKey[];
    const values = sampleValues(metrics);
    const html = buildSampleMessage(report, metrics, values);
    const outcome = await this.sender.sendHtml(report.telegramGroup.chatId, html);
    const reason = outcome.ok ? null : humanizeSendError(outcome.kind, outcome.description);

    await this.reportRuns.record({
      reportId: report.id,
      userId,
      status: outcome.ok ? 'success' : 'failed',
      scheduledFor: new Date(),
      metricsSnapshot: { test: true, currency: report.adAccount.currency, values },
      telegramMessageId: outcome.ok ? outcome.messageId : null,
      errorCode: outcome.ok ? null : outcome.kind,
      errorMessage: reason,
    });

    if (outcome.ok) return { ok: true };

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramUserId: true },
    });
    if (owner) {
      const dm = buildFailureDmMessage(
        report.name || report.adAccount.name,
        report.telegramGroup.title,
        reason ?? "Noma'lum xato",
      );
      await this.sender.sendHtml(owner.telegramUserId, dm);
    }
    return { ok: false, error: reason ?? "Noma'lum xato" };
  }

  private async getEntity(userId: string, id: string): Promise<ReportWithRelations> {
    const report = await this.prisma.report.findFirst({
      where: { id, userId },
      include: REPORT_INCLUDE,
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  private async assertAccount(userId: string, adAccountId: string): Promise<void> {
    const account = await this.prisma.adAccount.findFirst({ where: { id: adAccountId, userId } });
    if (!account) throw new BadRequestException('Reklama akkaunti topilmadi.');
    if (!account.enabled) throw new BadRequestException('Reklama akkaunti yoqilmagan.');
  }

  private async assertGroup(userId: string, telegramGroupId: string): Promise<void> {
    const group = await this.prisma.telegramGroup.findFirst({
      where: { id: telegramGroupId, userId },
    });
    if (!group) throw new BadRequestException('Guruh topilmadi.');
    if (group.botStatus === 'removed') {
      throw new BadRequestException('Guruh aktiv emas (bot guruhdan chiqarilgan).');
    }
  }

  private assertLeadDependency(metrics: MetricKey[], leadActionType: string | null): void {
    const needsLead = metrics.some((m) => LEAD_DEPENDENT_METRICS.includes(m));
    if (needsLead && !leadActionType) {
      throw new BadRequestException('Lidlar / CPL metrikalari uchun lead turini tanlang.');
    }
  }
}

/** Sample metric values for the test send (real numbers come from Meta in the scheduler). */
const SAMPLE_VALUES: Record<MetricKey, number> = {
  ad_spend: 1250000,
  cost_per_lead: 36764,
  impressions: 84210,
  reach: 61540,
  lead_count: 34,
  unique_ctr: 2.4,
};

function sampleValues(metrics: MetricKey[]): ReportMetricValues {
  const values: ReportMetricValues = {};
  for (const metric of metrics) values[metric] = SAMPLE_VALUES[metric];
  return values;
}

function buildSampleMessage(
  report: ReportWithRelations,
  metrics: MetricKey[],
  values: ReportMetricValues,
): string {
  const body = renderReportMessage({
    accountName: report.adAccount.name,
    windowPreset: report.windowPreset,
    dateRange: 'namunaviy davr',
    sentAt: formatUzDateTime(new Date(), report.timezone),
    currency: report.adAccount.currency,
    metrics,
    values,
  });
  return `🧪 <b>Sinov xabari</b> — namunaviy ma'lumotlar, haqiqiy hisobot emas.\n\n${body}`;
}
