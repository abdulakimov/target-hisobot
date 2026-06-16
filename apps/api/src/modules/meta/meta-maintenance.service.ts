import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { TelegramSenderService } from '../telegram/telegram-sender.service';
import { MetaGraphService } from './meta-graph.service';
import { buildReconnectDmMessage } from './reconnect-dm';

/** Re-exchange long-lived tokens this close to expiry (Meta tokens last ~60 days). */
const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * Daily maintenance for Meta connections (M2): proactively re-exchange long-lived tokens
 * nearing expiry, and mark expired + DM the owner when a token is gone or can't be refreshed.
 * Without this, expiry was only ever discovered lazily at send time (a missed report).
 */
@Injectable()
export class MetaMaintenanceService {
  private readonly logger = new Logger(MetaMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly crypto: EncryptionService,
    private readonly sender: TelegramSenderService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshTokens(): Promise<void> {
    const connections = await this.prisma.metaConnection.findMany({
      where: { status: 'active' },
      include: { user: { select: { telegramUserId: true, dmEnabled: true } } },
    });
    const now = Date.now();
    let refreshed = 0;
    let expired = 0;

    for (const conn of connections) {
      const expiresAt = conn.tokenExpiresAt?.getTime();
      if (expiresAt == null) continue; // unknown expiry — nothing actionable

      if (expiresAt <= now) {
        await this.markExpired(conn.id, conn.user, 'Token muddati tugagan');
        expired++;
        continue;
      }
      if (expiresAt - now > REFRESH_WINDOW_MS) continue; // not near expiry yet

      try {
        const token = this.crypto.decrypt(conn.accessTokenEnc);
        const long = await this.graph.exchangeLongLived(token);
        await this.prisma.metaConnection.update({
          where: { id: conn.id },
          data: {
            accessTokenEnc: this.crypto.encrypt(long.accessToken),
            tokenExpiresAt: long.expiresInSec ? new Date(now + long.expiresInSec * 1000) : null,
          },
        });
        refreshed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Token refresh failed for connection ${conn.id}: ${message}`);
        await this.markExpired(conn.id, conn.user, "Tokenni yangilab bo'lmadi");
        expired++;
      }
    }

    if (refreshed || expired) {
      this.logger.log(`Meta token maintenance: ${refreshed} refreshed, ${expired} expired`);
    }
  }

  private async markExpired(
    connectionId: string,
    user: { telegramUserId: bigint; dmEnabled: boolean },
    reason: string,
  ): Promise<void> {
    await this.prisma.metaConnection.update({
      where: { id: connectionId },
      data: { status: 'expired' },
    });
    if (user.dmEnabled) {
      await this.sender.sendHtml(user.telegramUserId, buildReconnectDmMessage(reason));
    }
  }
}
