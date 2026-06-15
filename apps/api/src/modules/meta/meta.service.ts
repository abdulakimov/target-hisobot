import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LEAD_ACTION_OPTIONS, type MetaStatusResponse, type UpdateAdAccountRequest } from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { MetaGraphService } from './meta-graph.service';

const VALID_LEAD_KEYS = new Set(LEAD_ACTION_OPTIONS.map((o) => o.key));

@Injectable()
export class MetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly crypto: EncryptionService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** OAuth callback: code → long-lived token → encrypted MetaConnection → sync ad accounts. */
  async handleCallback(userId: string, code: string): Promise<void> {
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

    await this.syncAdAccounts(userId, connection.id, long.accessToken);
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
      !VALID_LEAD_KEYS.has(body.defaultLeadActionType)
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

  async disconnect(userId: string): Promise<void> {
    // Removes connection + (cascade) its ad accounts and any reports bound to them.
    await this.prisma.metaConnection.deleteMany({ where: { userId } });
  }
}
