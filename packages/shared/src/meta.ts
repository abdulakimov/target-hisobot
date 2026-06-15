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
