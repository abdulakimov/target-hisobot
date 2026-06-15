import { escapeHtml } from '@hisobotchi/shared';

/** Owner DM sent when a report send fails (M6). Telegram HTML. */
export function buildFailureDmMessage(reportLabel: string, groupTitle: string, reason: string): string {
  return (
    '⚠️ <b>Hisobot yuborilmadi</b>\n\n' +
    `Hisobot: ${escapeHtml(reportLabel)}\n` +
    `Guruh: ${escapeHtml(groupTitle)}\n` +
    `Sabab: ${escapeHtml(reason)}\n\n` +
    "Ulanishni tekshirib, qayta urinib ko'ring."
  );
}
