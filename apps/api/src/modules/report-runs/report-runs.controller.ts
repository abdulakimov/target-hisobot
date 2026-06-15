import { Controller, Get, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  REPORT_RUN_STATUSES,
  type LatestRunSummary,
  type ReportRunResponse,
  type ReportRunStatus,
} from '@hisobotchi/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportRunsService } from './report-runs.service';

@Controller('report-runs')
export class ReportRunsController {
  constructor(private readonly runs: ReportRunsService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Query('reportId') reportId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ReportRunResponse[]> {
    return this.runs.list(user.id, {
      reportId: reportId || undefined,
      status: parseStatus(status),
      from: parseDate(from),
      to: parseDate(to),
    });
  }

  @Get('latest')
  latest(@CurrentUser() user: User): Promise<LatestRunSummary[]> {
    return this.runs.latestByReport(user.id);
  }
}

function parseStatus(value?: string): ReportRunStatus | undefined {
  return value && (REPORT_RUN_STATUSES as readonly string[]).includes(value)
    ? (value as ReportRunStatus)
    : undefined;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
