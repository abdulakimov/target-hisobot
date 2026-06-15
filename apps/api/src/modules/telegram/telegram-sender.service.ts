import { Injectable, Logger } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { sendHtmlVia } from './telegram-send';
import type { SendOutcome } from './send-error';

/**
 * Sends rendered reports (M5) and failure DM alerts (M6) through the grammY bot.
 * Returns a structured SendOutcome instead of throwing, so the scheduler/report-runs
 * can record status and react to failures.
 */
@Injectable()
export class TelegramSenderService {
  private readonly logger = new Logger(TelegramSenderService.name);

  constructor(private readonly telegram: TelegramBotService) {}

  /** Send a Telegram-HTML message to a chat. Never throws. */
  async sendHtml(chatId: bigint | number, html: string): Promise<SendOutcome> {
    const bot = this.telegram.getBot();
    if (!bot) {
      return { ok: false, kind: 'unknown', description: 'Telegram bot is not initialized' };
    }
    const outcome = await sendHtmlVia(bot.api, chatId, html);
    if (!outcome.ok) {
      this.logger.warn(`sendMessage to ${chatId} failed (${outcome.kind}): ${outcome.description}`);
    }
    return outcome;
  }
}
