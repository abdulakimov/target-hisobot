import type { MetaConnectionStatus } from './enums.js';

export interface AdAccountResponse {
  id: string;
  actId: string;
  name: string;
  currency: string;
  accountTimezone: string;
  status: string;
  enabled: boolean;
  defaultLeadActionType: string | null;
}

export interface MetaConnectionResponse {
  status: MetaConnectionStatus;
  metaUserId: string;
  scopes: string[];
  tokenExpiresAt: string | null;
  connectedAt: string;
}

export interface MetaStatusResponse {
  connection: MetaConnectionResponse | null;
  adAccounts: AdAccountResponse[];
}

export interface UpdateAdAccountRequest {
  enabled?: boolean;
  defaultLeadActionType?: string | null;
}

/** Result of a manual ad-account re-sync (POST /api/meta/sync). */
export interface MetaSyncResponse {
  /** Number of ad accounts present after the sync. */
  accountCount: number;
}

/** One Meta `action_type` actually observed on an account in the recent window. */
export interface AccountActionType {
  /** Raw Meta action_type string (e.g. `onsite_conversion.messaging_conversation_started_7d`). */
  actionType: string;
  /** Friendly Uzbek label if it maps to a curated lead option, else null. */
  label: string | null;
  /** Total occurrences in the lookback window (helps the user pick the real lead event). */
  value: number;
}

/** Action types observed on an account (GET /api/meta/ad-accounts/:id/action-types). */
export interface AccountActionTypesResponse {
  actionTypes: AccountActionType[];
}
