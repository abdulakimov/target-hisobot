import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isDue } from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Per-minute scheduler tick. Resolves which enabled reports are due in their own
 * timezone (PLAN.md §6) using the shared isDue() matcher.
 *
 * M5/M6 dispatch seam: for each due report, create a ReportRun guarded by the unique
 * (report_id, scheduled_for) constraint, fetch Meta Insights (M2), render via the shared
 * renderReportMessage(), send via TelegramSenderService, then record the result.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const now = new Date();
    const reports = await this.prisma.report.findMany({
      where: { enabled: true },
      select: { id: true, timezone: true, sendTimes: true, weekdays: true },
    });

    const due = reports.filter((r) =>
      isDue({ timezone: r.timezone, sendTimes: toSendTimes(r.sendTimes), weekdays: r.weekdays }, now),
    );

    if (due.length === 0) return;

    this.logger.log(`${due.length} report(s) due this minute`);
    for (const report of due) {
      // TODO(M5): dispatch — ReportRun guard → Meta Insights → render → send → record.
      this.logger.debug(`due report ${report.id}`);
    }
  }
}

/** Report.sendTimes is stored as JSON; coerce it to a string[] of "HH:MM". */
function toSendTimes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
