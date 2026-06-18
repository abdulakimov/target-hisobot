import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isDue } from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { mapWithConcurrency } from '../common/async/concurrency';
import { AccessService } from '../access/access.service';
import { ReportDispatcherService } from './report-dispatcher.service';

/** Max reports dispatched in parallel per tick (bounds Meta/Telegram load). */
const DISPATCH_CONCURRENCY = 5;

/**
 * Per-minute scheduler tick (PLAN sec 6). Loads enabled reports, selects the ones due in
 * their own timezone via the shared isDue() matcher, and dispatches each. A unique
 * (report_id, scheduled_for) ReportRun guards against double-send.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: ReportDispatcherService,
    private readonly access: AccessService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    // Skip if a previous tick is still running so slow Meta/Telegram calls can't pile up
    // ticks. The (report_id, scheduled_for) dedupe + A3b catch-up cover any skipped minute.
    if (this.ticking) {
      this.logger.warn('previous tick still running — skipping this minute');
      return;
    }
    this.ticking = true;
    try {
      const now = new Date();
      // Truncate to the minute (UTC) so the dedupe key is stable within the tick.
      const scheduledFor = new Date(Math.floor(now.getTime() / 60000) * 60000);

      const reports = await this.prisma.report.findMany({
        where: { enabled: true },
        include: {
          adAccount: true,
          telegramGroup: true,
          user: { select: { telegramUserId: true, accessExpiresAt: true } },
        },
      });

      // Only dispatch for users with active access (paywall) — superadmins bypass.
      const due = reports.filter(
        (r) =>
          this.access.hasActiveAccess(r.user, now) &&
          isDue(
            { timezone: r.timezone, sendTimes: toSendTimes(r.sendTimes), weekdays: r.weekdays },
            now,
          ),
      );
      if (due.length === 0) return;

      this.logger.log(`${due.length} report(s) due — dispatching (concurrency ${DISPATCH_CONCURRENCY})`);
      await mapWithConcurrency(due, DISPATCH_CONCURRENCY, async (report) => {
        try {
          await this.dispatcher.dispatch(report, scheduledFor);
        } catch (err) {
          this.logger.error(`dispatch failed for report ${report.id}: ${String(err)}`);
        }
      });
    } finally {
      this.ticking = false;
    }
  }
}

/** Report.sendTimes is stored as JSON; coerce it to a string[] of "HH:MM". */
function toSendTimes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
