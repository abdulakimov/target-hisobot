/** Current authenticated user, returned by GET /api/me and a successful login poll. */
export interface MeResponse {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  timezone: string;
  dmEnabled: boolean;
}

/** POST /api/auth/telegram/start — begins a bot deep-link login. */
export interface TelegramStartResponse {
  token: string;
  deepLink: string;
}

/** GET /api/auth/telegram/poll?token= — login progress. */
export type TelegramPollResponse =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'ok'; user: MeResponse };

/** GET /api/auth/config — non-secret config the SPA needs (e.g. DM banner link). */
export interface AuthConfigResponse {
  botUsername: string | null;
}
