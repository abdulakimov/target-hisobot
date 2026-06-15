import { Injectable } from '@nestjs/common';
import { Prisma, type ReportRunStatus } from '@prisma/client';
import type { LatestRunSummary, ReportRunResponse } from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { toReportRunResponse } from './report-run.mapper';

export interface RecordRunInput {
  reportId: string;
  userId: string;
  status: ReportRunStatus;
  scheduledFor: Date;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  metricsSnapshot?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  telegramMessageId?: number | null;
}

export interface ListRunFilters {
  reportId?: string;
  status?: ReportRunStatus;
  from?: Date;
  to?: Date;
}

const RUN_INCLUDE = {
  report: { include: { adAccount: true, telegramGroup: true } },
} as const;

@Injectable()
export class ReportRunsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Write a run record. Used by the test-send now and the M5 dispatcher later. */
  async record(input: RecordRunInput): Promise<void> {
    const data: Prisma.ReportRunUncheckedCreateInput = {
      reportId: input.reportId,
      userId: input.userId,
      status: input.status,
      scheduledFor: input.scheduledFor,
      ranAt: new Date(),
      windowStart: input.windowStart ?? null,
      windowEnd: input.windowEnd ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      telegramMessageId: input.telegramMessageId != null ? BigInt(input.telegramMessageId) : null,
    };
    if (input.metricsSnapshot != null) {
      data.metricsSnapshot = input.metricsSnapshot as Prisma.InputJsonValue;
    }
    await this.prisma.reportRun.create({ data });
  }

  async list(userId: string, filters: ListRunFilters): Promise<ReportRunResponse[]> {
    const runs = await this.prisma.reportRun.findMany({
      where: {
        userId,
        reportId: filters.reportId,
        status: filters.status,
        scheduledFor:
          filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      },
      include: RUN_INCLUDE,
      orderBy: { scheduledFor: 'desc' },
      take: 200,
    });
    return runs.map(toReportRunResponse);
  }

  /** Latest run per report — drives the dashboard failure markers. */
  async latestByReport(userId: string): Promise<LatestRunSummary[]> {
    const runs = await this.prisma.reportRun.findMany({
      where: { userId },
      orderBy: { scheduledFor: 'desc' },
      select: { reportId: true, status: true, ranAt: true, errorCode: true, errorMessage: true },
    });
    const seen = new Set<string>();
    const latest: LatestRunSummary[] = [];
    for (const run of runs) {
      if (seen.has(run.reportId)) continue;
      seen.add(run.reportId);
      latest.push({
        reportId: run.reportId,
        status: run.status,
        ranAt: run.ranAt ? run.ranAt.toISOString() : null,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
      });
    }
    return latest;
  }
}
