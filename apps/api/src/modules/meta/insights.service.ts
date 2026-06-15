import { Injectable } from '@nestjs/common';
import {
  WINDOW_TO_DATE_PRESET,
  type ReportMetricValues,
  type WindowPreset,
} from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { MetaGraphService } from './meta-graph.service';
import { parseInsights } from './insights-parse';

/** Thrown when the report's Meta connection is missing, revoked, or token-expired. */
export class MetaNotConnectedError extends Error {}

export interface ReportInsightsInput {
  actId: string;
  currency: string;
  metaConnectionId: string;
  windowPreset: WindowPreset;
  leadActionType: string | null;
}

export interface ReportInsights {
  values: ReportMetricValues;
  currency: string;
  windowStart: Date | null;
  windowEnd: Date | null;
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly graph: MetaGraphService,
  ) {}

  /** Fetch + parse the Insights window for one report (decrypts the stored token). */
  async fetchForReport(input: ReportInsightsInput): Promise<ReportInsights> {
    const connection = await this.prisma.metaConnection.findUnique({
      where: { id: input.metaConnectionId },
    });
    if (!connection || connection.status !== 'active') {
      throw new MetaNotConnectedError("Meta ulanmagan yoki o'chirilgan.");
    }
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() < Date.now()) {
      await this.prisma.metaConnection.update({
        where: { id: connection.id },
        data: { status: 'expired' },
      });
      throw new MetaNotConnectedError('Meta token muddati tugagan — qayta ulang.');
    }

    const token = this.crypto.decrypt(connection.accessTokenEnc);
    const raw = await this.graph.getInsights(
      token,
      input.actId,
      WINDOW_TO_DATE_PRESET[input.windowPreset],
    );
    return {
      values: parseInsights(raw, input.leadActionType),
      currency: input.currency,
      windowStart: raw?.date_start ? new Date(raw.date_start) : null,
      windowEnd: raw?.date_stop ? new Date(raw.date_stop) : null,
    };
  }
}
