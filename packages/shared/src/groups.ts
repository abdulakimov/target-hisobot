import type { BotStatus } from './enums.js';

/** A linked Telegram group, as returned by GET /api/groups. */
export interface GroupResponse {
  id: string;
  /** chat_id as a string (BigInt is not JSON-safe). */
  chatId: string;
  title: string;
  /** "group" | "supergroup". */
  chatType: string;
  botStatus: BotStatus;
  linkedAt: string | null;
  createdAt: string;
}

/** POST /api/groups/pairing-link — a one-time deep link to add the bot to a group. */
export interface PairingLinkResponse {
  token: string;
  /** t.me/<bot>?startgroup=<token> */
  deepLink: string;
  expiresAt: string;
}
