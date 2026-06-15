import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const res = await fetch(url);
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = (data.error as { message?: string } | undefined)?.message ?? JSON.stringify(data);
      throw new Error(`Meta ${context} failed: ${err}`);
    }
    return data;
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
    return { accessToken: data.access_token as string, expiresInSec: (data.expires_in as number) ?? null };
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
    return { accessToken: data.access_token as string, expiresInSec: (data.expires_in as number) ?? null };
  }

  async getMe(token: string): Promise<{ id: string }> {
    const data = await this.getJson(
      this.graph(`/me?fields=id&access_token=${encodeURIComponent(token)}`),
      'me',
    );
    return { id: data.id as string };
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
