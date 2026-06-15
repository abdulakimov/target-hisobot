import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import type { AppConfig } from '../common/config/env.validation';
import { UsersService } from '../users/users.service';
import { LOGIN_PAYLOAD_PREFIX, LoginTokenService } from '../auth/login-token.service';

/**
 * grammY long-polling bot. Boots only if TELEGRAM_BOT_TOKEN is set.
 * M1: private /start handles bot deep-link login (login_<token>) and DM enablement.
 * Group pairing (/start <token> in groups) + my_chat_member land in M3.
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Bot;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly loginTokens: LoginTokenService,
  ) {}

  onModuleInit(): void {
    const token = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    const pollingEnabled = this.config.get('TELEGRAM_BOT_POLLING_ENABLED', { infer: true });

    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled (skeleton mode).');
      return;
    }

    const bot = new Bot(token);
    this.bot = bot;
    this.registerHandlers(bot);

    if (!pollingEnabled) {
      this.logger.log('Telegram bot initialized, polling disabled (TELEGRAM_BOT_POLLING_ENABLED=false).');
      return;
    }

    // Do not await: bot.start() resolves only when the bot stops.
    void bot.start({
      onStart: (info) => this.logger.log(`Telegram bot @${info.username} polling started`),
    });
  }

  private registerHandlers(bot: Bot): void {
    bot.command('start', async (ctx) => {
      // Group pairing (/start <token> in groups) is handled in M3.
      if (ctx.chat?.type !== 'private') {
        return;
      }
      const payload = (ctx.match ?? '').toString().trim();
      const telegramId = ctx.from?.id;

      // Bot deep-link login: /start login_<token>
      if (payload.startsWith(LOGIN_PAYLOAD_PREFIX) && telegramId != null) {
        const loginToken = payload.slice(LOGIN_PAYLOAD_PREFIX.length);
        const ok = await this.loginTokens.claim(loginToken, {
          id: telegramId,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name,
          username: ctx.from?.username,
        });
        if (ok) {
          await ctx.reply(
            '✅ Tizimga muvaffaqiyatli kirdingiz!\n\nSaytga qaytishingiz mumkin — avtomatik kiriladi.',
          );
        } else {
          await ctx.reply(
            '❌ Login havolasi eskirgan yoki yaroqsiz.\nSaytda "Telegram" tugmasini qayta bosing.',
          );
        }
        return;
      }

      // Plain private /start → greeting (+ DM enable for already-registered users).
      const dashboardUrl = this.config.get('APP_BASE_URL', { infer: true });
      if (telegramId == null) {
        await ctx.reply('Salom! Hisobotchi botiga xush kelibsiz.');
        return;
      }
      const linked = await this.users.setDmEnabled(BigInt(telegramId), true);
      if (linked) {
        await ctx.reply(
          'Salom! Bildirishnomalar yoqildi ✅\n\n' +
            'Endi men sizga hisobotlar va xatolik ogohlantirishlarini shu yerga yuboraman.\n\n' +
            `Dashboard: ${dashboardUrl}`,
        );
      } else {
        await ctx.reply(
          'Salom! Hisobotchi botiga xush kelibsiz.\n\n' +
            `Tizimga kirish uchun saytga o'ting va "Telegram" tugmasini bosing: ${dashboardUrl}`,
        );
      }
    });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }

  /** Exposed for the report Sender (M5) and DM alerts (M6). */
  getBot(): Bot | undefined {
    return this.bot;
  }
}
