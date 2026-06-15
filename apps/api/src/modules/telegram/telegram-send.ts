import { classifySendError, type SendOutcome } from './send-error';

/** Minimal structural view of grammY's `bot.api` needed to send a message. */
export interface MessageSender {
  sendMessage(
    chatId: number,
    text: string,
    other?: Record<string, unknown>,
  ): Promise<{ message_id: number }>;
}

const SEND_OPTIONS = {
  parse_mode: 'HTML',
  link_preview_options: { is_disabled: true },
} as const;

/**
 * Send a Telegram-HTML message via a grammY-like API. Never throws — any failure is
 * mapped to a structured SendFailure so callers can record status and react (M5/M6).
 */
export async function sendHtmlVia(
  api: MessageSender,
  chatId: bigint | number,
  html: string,
): Promise<SendOutcome> {
  try {
    const message = await api.sendMessage(Number(chatId), html, { ...SEND_OPTIONS });
    return { ok: true, messageId: message.message_id };
  } catch (error) {
    return classifySendError(error);
  }
}
