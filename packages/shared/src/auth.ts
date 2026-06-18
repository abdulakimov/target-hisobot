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
  /** Platform owner — bypasses the paywall (set via SUPERADMIN_TELEGRAM_IDS). */
  isSuperadmin: boolean;
  /** True while the subscription is unexpired (or superadmin). Gates the whole app. */
  accessActive: boolean;
  /** Subscription expiry (ISO) or null if never activated. */
  accessExpiresAt: string | null;
}

/** PATCH /api/me — fields the user may edit on their own profile. */
export interface UpdateMeInput {
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string;
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
