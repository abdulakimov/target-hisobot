import { escapeHtml } from '@hisobotchi/shared';

/** Owner DM sent when a Meta token expired / couldn't be refreshed (M2). Telegram HTML. */
export function buildReconnectDmMessage(reason: string): string {
  return (
    '⚠️ <b>Facebook ulanishi yangilanishi kerak</b>\n\n' +
    `Sabab: ${escapeHtml(reason)}\n\n` +
    "Hisobotlar yuborilishi davom etishi uchun dashboardda <b>Ulanishlar</b> bo'limidan " +
    'Facebook akkauntingizni qayta ulang.'
  );
}
