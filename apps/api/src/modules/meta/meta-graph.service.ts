import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resilientFetch } from '../common/http/resilient-fetch';
import type { AppConfig } from '../common/config/env.validation';
import type { RawInsights } from './insights-parse';

export interface MetaTokenResult {
  accessToken: string;
  expiresInSec: number | null;
}

export interface MetaAdAccountRaw {
  id: string; // act_<id>
  account_id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
}

/** Low-level Meta Graph API client (OAuth token exchange + ad accounts + insights). */
@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger(MetaGraphService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('META_APP_ID', { infer: true }) &&
        this.config.get('META_APP_SECRET', { infer: true }) &&
        this.config.get('META_OAUTH_REDIRECT_URL', { infer: true }),
    );
  }

  private get version(): string {
    return this.config.get('META_GRAPH_API_VERSION', { infer: true });
  }

  private graph(path: string): string {
    return `https://graph.facebook.com/${this.version}${path}`;
  }

  /** Facebook OAuth dialog URL the browser is redirected to. */
  authDialogUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('META_APP_ID', { infer: true }) ?? '',
      redirect_uri: this.config.get('META_OAUTH_REDIRECT_URL', { infer: true }) ?? '',
      scope: this.config.get('META_OAUTH_SCOPES', { infer: true }),
      state,
      response_type: 'code',
    });
    return `https://www.facebook.com/${this.version}/dialog/oauth?${params.toString()}`;
  }

  private async getJson(url: string, context: string): Promise<Record<string, unknown>> {
    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await resilientFetch(url, {
        onRetry: ({ attempt, status, error, delayMs }) =>
          this.logger.warn(
            `Meta ${context} retry #${attempt + 1} in ${delayMs}ms (${status ?? (error as Error)?.message})`,
          ),
      });
    } catch (e) {
      const err = e as Error;
      const reason =
        err.name === 'AbortError'
          ? "so'rov vaqti tugadi (timeout)"
          : `tarmoq xatosi (${err.message})`;
      throw new Error(`Meta ${context} failed: ${reason}`);
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const fbErr = data.error as
        | { message?: string; code?: number; error_subcode?: number; type?: string }
        | undefined;
      // Include FB error code/subcode — the only way to tell apart "app not in live mode",
      // "missing permission", "token expired", etc. when OAuth/sync fails in prod.
      const detail = fbErr?.message ?? JSON.stringify(data);
      const codes = fbErr?.code != null ? ` [code ${fbErr.code}${fbErr.error_subcode ? `/${fbErr.error_subcode}` : ''}]` : '';
      throw new Error(`Meta ${context} failed: ${detail}${codes}`);
    }
    return data;
  }

  /** Validate + shape a Meta token response (guards against a malformed/empty access_token). */
  private toTokenResult(data: Record<string, unknown>, context: string): MetaTokenResult {
    const token = data.access_token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error(`Meta ${context} failed: javobda access_token yo'q`);
    }
    const expiresIn = data.expires_in;
    return { accessToken: token, expiresInSec: typeof expiresIn === 'number' ? expiresIn : null };
  }

  /** code → short-lived access token. */
  async exchangeCode(code: string): Promise<MetaTokenResult> {
    const params = new URLSearchParams({
      client_id: this.config.get('META_APP_ID', { infer: true }) ?? '',
      client_secret: this.config.get('META_APP_SECRET', { infer: true }) ?? '',
      redirect_uri: this.config.get('META_OAUTH_REDIRECT_URL', { infer: true }) ?? '',
      code,
    });
    const data = await this.getJson(this.graph(`/oauth/access_token?${params}`), 'code exchange');
    return this.toTokenResult(data, 'code exchange');
  }

  /** short-lived → long-lived (~60 day) token. */
  async exchangeLongLived(shortToken: string): Promise<MetaTokenResult> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.get('META_APP_ID', { infer: true }) ?? '',
      client_secret: this.config.get('META_APP_SECRET', { infer: true }) ?? '',
      fb_exchange_token: shortToken,
    });
    const data = await this.getJson(this.graph(`/oauth/access_token?${params}`), 'long-lived exchange');
    return this.toTokenResult(data, 'long-lived exchange');
  }

  async getMe(token: string): Promise<{ id: string }> {
    const data = await this.getJson(
      this.graph(`/me?fields=id&access_token=${encodeURIComponent(token)}`),
      'me',
    );
    if (typeof data.id !== 'string' || data.id.length === 0) {
      throw new Error("Meta me failed: javobda foydalanuvchi id yo'q");
    }
    return { id: data.id };
  }

  /** All ad accounts the user can access (follows pagination). */
  async getAdAccounts(token: string): Promise<MetaAdAccountRaw[]> {
    const fields = 'account_id,name,currency,timezone_name,account_status';
    let url: string | null = this.graph(
      `/me/adaccounts?fields=${fields}&limit=200&access_token=${encodeURIComponent(token)}`,
    );
    const out: MetaAdAccountRaw[] = [];
    while (url) {
      const data: Record<string, unknown> = await this.getJson(url, 'ad accounts');
      out.push(...((data.data as MetaAdAccountRaw[] | undefined) ?? []));
      const paging = data.paging as { next?: string } | undefined;
      url = paging?.next ?? null;
    }
    return out;
  }

  /**
   * Distinct action_types observed on an account in a lookback window, with totals —
   * used to populate the per-account lead-type picker with what the account really produces.
   */
  async getAvailableActionTypes(
    token: string,
    actId: string,
    datePreset = 'last_30d',
  ): Promise<Array<{ actionType: string; value: number }>> {
    const url = this.graph(
      `/${actId}/insights?level=account&date_preset=${datePreset}&fields=actions&access_token=${encodeURIComponent(token)}`,
    );
    const data = await this.getJson(url, 'action types');
    const rows = (data.data as RawInsights[] | undefined) ?? [];
    const totals = new Map<string, number>();
    for (const row of rows) {
      for (const a of row.actions ?? []) {
        const n = Number(a.value);
        totals.set(a.action_type, (totals.get(a.action_type) ?? 0) + (Number.isFinite(n) ? n : 0));
      }
    }
    return [...totals.entries()]
      .map(([actionType, value]) => ({ actionType, value }))
      .sort((a, b) => b.value - a.value);
  }

  /** Account-level insights for a date_preset window (single row, or null if no data). */
  async getInsights(token: string, actId: string, datePreset: string): Promise<RawInsights | null> {
    const fields = 'spend,impressions,reach,unique_link_clicks_ctr,actions,cost_per_action_type';
    const url = this.graph(
      `/${actId}/insights?level=account&date_preset=${datePreset}&fields=${fields}&access_token=${encodeURIComponent(token)}`,
    );
    const data = await this.getJson(url, 'insights');
    const rows = (data.data as RawInsights[] | undefined) ?? [];
    return rows.length > 0 ? rows[0] : null;
  }
}
