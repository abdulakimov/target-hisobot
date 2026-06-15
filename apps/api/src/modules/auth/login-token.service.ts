import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService, type TelegramProfile } from '../users/users.service';

export const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const LOGIN_PAYLOAD_PREFIX = 'login_';

type PollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'ok'; userId: string };

/**
 * Bot deep-link login. A pending token is created for the browser; the bot claims it
 * when the user presses Start (identifying them via ctx.from); the browser's poll then
 * exchanges a claimed token for a session (one-time).
 */
@Injectable()
export class LoginTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    await this.prisma.loginToken.create({
      data: { token, status: 'pending', expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS) },
    });
    return token;
  }

  /** Called by the bot on /start login_<token>. Binds the token to the Telegram user. */
  async claim(token: string, profile: TelegramProfile): Promise<boolean> {
    const row = await this.prisma.loginToken.findUnique({ where: { token } });
    if (!row || row.status !== 'pending' || row.expiresAt.getTime() < Date.now()) {
      return false;
    }
    const user = await this.users.upsertFromTelegram(profile);
    // Logging in via the bot implies DM capability.
    await this.prisma.user.update({ where: { id: user.id }, data: { dmEnabled: true } });
    await this.prisma.loginToken.update({
      where: { token },
      data: { status: 'claimed', userId: user.id, claimedAt: new Date() },
    });
    return true;
  }

  /** Called by the browser poll. Consumes a claimed token (one-time) and returns the user id. */
  async poll(token: string): Promise<PollResult> {
    const row = await this.prisma.loginToken.findUnique({ where: { token } });
    if (!row || row.expiresAt.getTime() < Date.now() || row.status === 'consumed') {
      return { status: 'expired' };
    }
    if (row.status === 'pending' || !row.userId) {
      return { status: 'pending' };
    }
    await this.prisma.loginToken.update({ where: { token }, data: { status: 'consumed' } });
    return { status: 'ok', userId: row.userId };
  }
}
