import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

/** Keep ReportRun history this many days; older runs are pruned. */
const REPORT_RUN_RETENTION_DAYS = 180;

/**
 * Daily housekeeping: prune expired one-time tokens, dead sessions, and old ReportRun rows
 * so unbounded tables don't accumulate on the RAM/disk-tight VPS.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async prune(): Promise<void> {
    const now = new Date();
    const runCutoff = new Date(now.getTime() - REPORT_RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [sessions, loginTokens, pairingTokens, runs] = await Promise.all([
      this.prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.loginToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.groupPairingToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.reportRun.deleteMany({ where: { createdAt: { lt: runCutoff } } }),
    ]);

    const total = sessions.count + loginTokens.count + pairingTokens.count + runs.count;
    if (total > 0) {
      this.logger.log(
        `Cleanup: ${sessions.count} sessions, ${loginTokens.count} login tokens, ` +
          `${pairingTokens.count} pairing tokens, ${runs.count} old report runs pruned`,
      );
    }
  }
}
