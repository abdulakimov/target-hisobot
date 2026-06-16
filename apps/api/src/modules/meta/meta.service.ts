import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isValidLeadSelection,
  labelForActionType,
  type AccountActionTypesResponse,
  type MetaStatusResponse,
  type UpdateAdAccountRequest,
} from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { MetaGraphService } from './meta-graph.service';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly crypto: EncryptionService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * OAuth callback: code → long-lived token → encrypted MetaConnection → sync ad accounts.
   * The connection is persisted before syncing; a sync failure is returned (not thrown) so a
   * partial success (connected, but accounts couldn't load) still leaves a usable connection.
   * Returns the sync error message, or null on full success.
   */
  async handleCallback(userId: string, code: string): Promise<{ syncError: string | null }> {
    const short = await this.graph.exchangeCode(code);
    const long = await this.graph.exchangeLongLived(short.accessToken);
    const me = await this.graph.getMe(long.accessToken);

    const tokenExpiresAt = long.expiresInSec ? new Date(Date.now() + long.expiresInSec * 1000) : null;
    const scopes = this.config.get('META_OAUTH_SCOPES', { infer: true }).split(',');
    const accessTokenEnc = this.crypto.encrypt(long.accessToken);

    // v1: one connection per user.
    const existing = await this.prisma.metaConnection.findFirst({ where: { userId } });
    const connection = existing
      ? await this.prisma.metaConnection.update({
          where: { id: existing.id },
          data: { metaUserId: me.id, accessTokenEnc, tokenExpiresAt, scopes, status: 'active' },
        })
      : await this.prisma.metaConnection.create({
          data: { userId, metaUserId: me.id, accessTokenEnc, tokenExpiresAt, scopes, status: 'active' },
        });

    try {
      await this.syncAdAccounts(userId, connection.id, long.accessToken);
      return { syncError: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ad-account sync failed for user ${userId}: ${message}`);
      return { syncError: message };
    }
  }

  /** Re-sync ad accounts for an existing connection without re-running OAuth. */
  async resync(userId: string): Promise<number> {
    const connection = await this.prisma.metaConnection.findFirst({ where: { userId } });
    if (!connection) throw new NotFoundException('Meta ulanmagan');
    if (connection.status !== 'active') {
      throw new BadRequestException('Ulanish faol emas — qayta ulang');
    }
    const token = this.crypto.decrypt(connection.accessTokenEnc);
    await this.syncAdAccounts(userId, connection.id, token);
    return this.prisma.adAccount.count({ where: { userId } });
  }

  /** Upsert ad accounts from Meta; never resets the user's enabled / lead-type choices. */
  async syncAdAccounts(userId: string, metaConnectionId: string, token: string): Promise<void> {
    const accounts = await this.graph.getAdAccounts(token);
    for (const a of accounts) {
      const data = {
        name: a.name ?? a.id,
        currency: a.currency ?? '',
        accountTimezone: a.timezone_name ?? '',
        status: String(a.account_status ?? ''),
      };
      await this.prisma.adAccount.upsert({
        where: { userId_actId: { userId, actId: a.id } },
        create: { userId, metaConnectionId, actId: a.id, ...data },
        update: { metaConnectionId, ...data },
      });
    }
  }

  async getStatus(userId: string): Promise<MetaStatusResponse> {
    const connection = await this.prisma.metaConnection.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const adAccounts = await this.prisma.adAccount.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return {
      connection: connection
        ? {
            status: connection.status,
            metaUserId: connection.metaUserId,
            scopes: connection.scopes,
            tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
            connectedAt: connection.createdAt.toISOString(),
          }
        : null,
      adAccounts: adAccounts.map((a) => ({
        id: a.id,
        actId: a.actId,
        name: a.name,
        currency: a.currency,
        accountTimezone: a.accountTimezone,
        status: a.status,
        enabled: a.enabled,
        defaultLeadActionType: a.defaultLeadActionType,
      })),
    };
  }

  async updateAdAccount(userId: string, id: string, body: UpdateAdAccountRequest): Promise<void> {
    const account = await this.prisma.adAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Ad account not found');

    if (
      body.defaultLeadActionType != null &&
      body.defaultLeadActionType !== '' &&
      !isValidLeadSelection(body.defaultLeadActionType)
    ) {
      throw new BadRequestException('Invalid lead action type');
    }

    await this.prisma.adAccount.update({
      where: { id: account.id },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.defaultLeadActionType !== undefined
          ? { defaultLeadActionType: body.defaultLeadActionType || null }
          : {}),
      },
    });
  }

  /** Action types this account actually produced recently (for the lead-type picker). */
  async getAccountActionTypes(userId: string, id: string): Promise<AccountActionTypesResponse> {
    const account = await this.prisma.adAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Ad account not found');
    const connection = await this.prisma.metaConnection.findUnique({
      where: { id: account.metaConnectionId },
    });
    if (!connection || connection.status !== 'active') {
      throw new BadRequestException('Ulanish faol emas — qayta ulang');
    }
    const token = this.crypto.decrypt(connection.accessTokenEnc);
    const observed = await this.graph.getAvailableActionTypes(token, account.actId);
    return {
      actionTypes: observed.map((o) => ({
        actionType: o.actionType,
        label: labelForActionType(o.actionType),
        value: o.value,
      })),
    };
  }

  async disconnect(userId: string): Promise<void> {
    // Removes connection + (cascade) its ad accounts and any reports bound to them.
    await this.prisma.metaConnection.deleteMany({ where: { userId } });
  }
}
