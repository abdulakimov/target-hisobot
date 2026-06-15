import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Per-minute tick. In M5 this resolves due reports (per-report timezone + send_times +
 * weekdays), dispatches via Meta Insights → grammY, and writes ReportRun with a unique
 * (report_id, scheduled_for) guard against double-send.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  tick(): void {
    this.logger.debug('scheduler tick');
  }
}
