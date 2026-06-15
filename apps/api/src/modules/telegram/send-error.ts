import { GrammyError, HttpError } from 'grammy';

/** Why a Telegram send failed — drives M6 DM alerts and group-status updates. */
export type SendErrorKind =
  | 'forbidden' // 403: bot blocked, kicked, or not a group member
  | 'chat_not_found' // 400: chat id invalid / bot never met the chat
  | 'migrated' // 400: group upgraded to supergroup (chat_id changed)
  | 'rate_limited' // 429: too many requests
  | 'network' // transport-level failure
  | 'unknown';

export interface SendSuccess {
  ok: true;
  messageId: number;
}

export interface SendFailure {
  ok: false;
  kind: SendErrorKind;
  description: string;
  /** For 'rate_limited': seconds to wait before retrying. */
  retryAfter?: number;
  /** For 'migrated': the new supergroup chat id to migrate to. */
  migrateToChatId?: number;
}

export type SendOutcome = SendSuccess | SendFailure;

/** Map any error thrown by a grammY API call into a structured failure. */
export function classifySendError(error: unknown): SendFailure {
  if (error instanceof GrammyError) {
    const description = error.description || `Telegram error ${error.error_code}`;
    const migrateToChatId = error.parameters?.migrate_to_chat_id;
    if (migrateToChatId != null) {
      return { ok: false, kind: 'migrated', description, migrateToChatId };
    }
    switch (error.error_code) {
      case 403:
        return { ok: false, kind: 'forbidden', description };
      case 429:
        return { ok: false, kind: 'rate_limited', description, retryAfter: error.parameters?.retry_after };
      case 400:
        if (/chat not found/i.test(description)) {
          return { ok: false, kind: 'chat_not_found', description };
        }
        return { ok: false, kind: 'unknown', description };
      default:
        return { ok: false, kind: 'unknown', description };
    }
  }
  if (error instanceof HttpError) {
    return { ok: false, kind: 'network', description: error.message || 'Network error' };
  }
  return {
    ok: false,
    kind: 'unknown',
    description: error instanceof Error ? error.message : String(error),
  };
}

/** Uzbek, user-facing message for a send-failure kind (report-run errors + DM alerts). */
export function humanizeSendError(kind: SendErrorKind, description: string): string {
  switch (kind) {
    case 'forbidden':
      return 'Bot guruhdan chiqarilgan yoki bloklangan.';
    case 'chat_not_found':
      return 'Guruh topilmadi.';
    case 'migrated':
      return "Guruh superguruhga o'zgargan — qayta ulang.";
    case 'rate_limited':
      return "Juda ko'p so'rov — birozdan keyin urinib ko'ring.";
    case 'network':
      return 'Tarmoq xatosi.';
    default:
      return description || "Noma'lum xato.";
  }
}
