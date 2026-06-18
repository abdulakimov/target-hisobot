import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, type Api } from 'grammy';
import type { BotStatus } from '@prisma/client';
import type { AppConfig } from '../common/config/env.validation';
import { UsersService } from '../users/users.service';
import { LOGIN_PAYLOAD_PREFIX, LoginTokenService } from '../auth/login-token.service';
import { GroupsService } from '../groups/groups.service';
import { mapBotStatus } from '../groups/bot-status';

/**
 * grammY long-polling bot. Boots only if TELEGRAM_BOT_TOKEN is set.
 * - Private /start: bot deep-link login (login_<token>) + DM enablement (M1).
 * - Group /start <token>: pairing — binds the group to the token's user (M3).
 * - my_chat_member: tracks add/remove/admin; DMs the owner on removal (M3).
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Bot;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly loginTokens: LoginTokenService,
    private readonly groups: GroupsService,
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
      const payload = (ctx.match ?? '').toString().trim();
      const chat = ctx.chat;

      // Group pairing: /start <token> when the bot is added via a startgroup deep link.
      if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
        if (!payload) return;
        let botStatus: BotStatus = 'member';
        try {
          const me = await ctx.getChatMember(ctx.me.id);
          botStatus = me.status === 'administrator' || me.status === 'creator' ? 'admin' : 'member';
        } catch {
          /* keep default 'member' */
        }
        const result = await this.groups.claimPairing(payload, {
          chatId: BigInt(chat.id),
          title: chat.title ?? 'Guruh',
          chatType: chat.type,
          botStatus,
        });
        await ctx.reply(
          result.ok
            ? '✅ Bu guruh hisobotchingizga ulandi.\n\nBelgilangan vaqtlarda shu yerga hisobotlar yuboriladi.'
            : '❌ Ulanish havolasi eskirgan yoki yaroqsiz.\nDashboarddan "Guruhni ulash"ni qayta bosing.',
        );
        return;
      }

      if (!chat || chat.type !== 'private') return;
      const telegramId = ctx.from?.id;

      // Bot deep-link login: /start login_<token>
      if (payload.startsWith(LOGIN_PAYLOAD_PREFIX) && telegramId != null) {
        const loginToken = payload.slice(LOGIN_PAYLOAD_PREFIX.length);
        const ok = await this.loginTokens.claim(loginToken, {
          id: telegramId,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name,
          username: ctx.from?.username,
          photo_url: await this.fetchProfilePhotoDataUrl(ctx.api, telegramId),
        });
        await ctx.reply(
          ok
            ? '✅ Tizimga muvaffaqiyatli kirdingiz!\n\nSaytga qaytishingiz mumkin — avtomatik kiriladi.'
            : '❌ Login havolasi eskirgan yoki yaroqsiz.\nSaytda "Telegram" tugmasini qayta bosing.',
        );
        return;
      }

      // Plain private /start → greeting (+ DM enable for already-registered users).
      const dashboardUrl = this.config.get('APP_BASE_URL', { infer: true });
      if (telegramId == null) {
        await ctx.reply('Salom! Hisobotchi botiga xush kelibsiz.');
        return;
      }
      const linked = await this.users.setDmEnabled(BigInt(telegramId), true);
      await ctx.reply(
        linked
          ? 'Salom! Bildirishnomalar yoqildi ✅\n\n' +
              'Endi men sizga hisobotlar va xatolik ogohlantirishlarini shu yerga yuboraman.\n\n' +
              `Dashboard: ${dashboardUrl}`
          : 'Salom! Hisobotchi botiga xush kelibsiz.\n\n' +
              `Tizimga kirish uchun saytga o'ting va "Telegram" tugmasini bosing: ${dashboardUrl}`,
      );
    });

    bot.on('my_chat_member', async (ctx) => {
      const chat = ctx.chat;
      if (chat.type !== 'group' && chat.type !== 'supergroup') return;
      const newStatus = mapBotStatus(ctx.myChatMember.new_chat_member.status);
      const changes = await this.groups.updateBotStatus(BigInt(chat.id), newStatus);
      for (const change of changes) {
        if (change.newStatus === 'removed' && change.previousStatus !== 'removed') {
          try {
            await ctx.api.sendMessage(
              Number(change.ownerTelegramUserId),
              `⚠️ "${change.group.title}" guruhidan chiqarildim — unga endi hisobotlar yuborilmaydi.\n\n` +
                'Qayta ulash uchun dashboarddan "Guruhni ulash" tugmasini bosing.',
            );
          } catch (err) {
            this.logger.warn(`Failed to DM owner about group removal: ${String(err)}`);
          }
        }
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

  /**
   * Fetch the user's Telegram profile photo and return it as a `data:` URL so it can be
   * stored on the User and shown in the dashboard. The bytes are downloaded server-side —
   * the bot token never leaves the backend (the raw file URL embeds it). Returns null on
   * any failure (no photo, fetch error, oversized) so login is never blocked.
   */
  private async fetchProfilePhotoDataUrl(api: Api, userId: number): Promise<string | null> {
    try {
      const result = await api.getUserProfilePhotos(userId, { limit: 1 });
      const sizes = result.photos[0];
      if (!sizes?.length) return null;
      // Sizes are ascending; an avatar only needs ~160px. Fall back to the largest available.
      const chosen = sizes.find((s) => s.width >= 160) ?? sizes[sizes.length - 1];
      const file = await api.getFile(chosen.file_id);
      if (!file.file_path) return null;
      const token = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 256 * 1024) return null; // avatars are tiny; guard the row / /me payload
      const mime = /\.png$/i.test(file.file_path) ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (err) {
      this.logger.warn(`Failed to fetch Telegram profile photo: ${String(err)}`);
      return null;
    }
  }
}
