import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { isAccessActive } from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AccessSummary {
  isSuperadmin: boolean;
  accessActive: boolean;
  accessExpiresAt: Date | null;
}

type AccessUser = Pick<User, 'telegramUserId' | 'accessExpiresAt'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Single source of truth for "can this user use the product?" — combines the env-based
 * superadmin bypass with the time-bound `accessExpiresAt` gate. Shared by the guards,
 * the scheduler, and the /me mappers. `extendAccess` is the only access-write chokepoint.
 */
@Injectable()
export class AccessService {
  private readonly superadminIds: Set<string>;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    this.superadminIds = new Set(
      this.config
        .get('SUPERADMIN_TELEGRAM_IDS', { infer: true })
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  isSuperadmin(user: Pick<User, 'telegramUserId'>): boolean {
    return this.superadminIds.has(user.telegramUserId.toString());
  }

  hasActiveAccess(user: AccessUser, now: Date = new Date()): boolean {
    return this.isSuperadmin(user) || isAccessActive(user.accessExpiresAt, now);
  }

  computeAccess(user: AccessUser): AccessSummary {
    return {
      isSuperadmin: this.isSuperadmin(user),
      accessActive: this.hasActiveAccess(user),
      accessExpiresAt: user.accessExpiresAt,
    };
  }

  /**
   * Grant/extend access. `extend` adds `days` to the remaining window when still active,
   * otherwise from now; `set` always starts from now. Writes an AccessGrant audit row.
   * Future Payme/Click webhooks call this with source/externalRef/amount set.
   */
  async extendAccess(
    userId: string,
    days: number,
    opts: {
      mode?: 'extend' | 'set';
      note?: string | null;
      source?: string;
      grantedByTgId?: bigint | null;
      externalRef?: string | null;
      amount?: number | null;
      currency?: string | null;
    } = {},
  ): Promise<User> {
    const now = new Date();
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const base =
      opts.mode !== 'set' && current.accessExpiresAt && current.accessExpiresAt > now
        ? current.accessExpiresAt
        : now;
    const newExpiry = new Date(base.getTime() + days * DAY_MS);

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          accessExpiresAt: newExpiry,
          accessGrantedAt: now,
          accessGrantedByTgId: opts.grantedByTgId ?? null,
          accessNote: opts.note ?? null,
        },
      }),
      this.prisma.accessGrant.create({
        data: {
          userId,
          action: 'grant',
          source: opts.source ?? 'manual',
          days,
          previousExpiresAt: current.accessExpiresAt,
          newExpiresAt: newExpiry,
          grantedByTgId: opts.grantedByTgId ?? null,
          note: opts.note ?? null,
          externalRef: opts.externalRef ?? null,
          amount: opts.amount ?? null,
          currency: opts.currency ?? null,
        },
      }),
    ]);
    return updated;
  }

  /** Revoke access immediately (sets expiry to now → reads as 'expired'). Logs the revoke. */
  async revokeAccess(
    userId: string,
    opts: { note?: string | null; grantedByTgId?: bigint | null } = {},
  ): Promise<User> {
    const now = new Date();
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { accessExpiresAt: now, accessNote: opts.note ?? current.accessNote },
      }),
      this.prisma.accessGrant.create({
        data: {
          userId,
          action: 'revoke',
          source: 'manual',
          previousExpiresAt: current.accessExpiresAt,
          newExpiresAt: now,
          grantedByTgId: opts.grantedByTgId ?? null,
          note: opts.note ?? null,
        },
      }),
    ]);
    return updated;
  }
}
