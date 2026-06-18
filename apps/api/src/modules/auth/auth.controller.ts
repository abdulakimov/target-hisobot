import { Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import type {
  AuthConfigResponse,
  TelegramPollResponse,
  TelegramStartResponse,
} from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { UsersService } from '../users/users.service';
import { AccessService } from '../access/access.service';
import { SESSION_COOKIE, SESSION_TTL_MS, SessionService } from './session.service';
import { LOGIN_PAYLOAD_PREFIX, LoginTokenService } from './login-token.service';
import { Public } from './decorators/public.decorator';
import { toMeResponse } from './user.mapper';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly loginTokens: LoginTokenService,
    private readonly access: AccessService,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      signed: true,
      path: '/',
    };
  }

  @Public()
  @Get('config')
  getConfig(): AuthConfigResponse {
    return { botUsername: this.config.get('TELEGRAM_BOT_USERNAME', { infer: true }) ?? null };
  }

  @Public()
  @Post('telegram/start')
  @HttpCode(200)
  async start(): Promise<TelegramStartResponse> {
    const token = await this.loginTokens.create();
    const botUsername = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true });
    return {
      token,
      deepLink: `https://t.me/${botUsername}?start=${LOGIN_PAYLOAD_PREFIX}${token}`,
    };
  }

  @Public()
  @Get('telegram/poll')
  async poll(
    @Query('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TelegramPollResponse> {
    const result = await this.loginTokens.poll(token ?? '');
    if (result.status !== 'ok') {
      return { status: result.status };
    }
    const sessionToken = await this.sessions.create(result.userId, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    res.cookie(SESSION_COOKIE, sessionToken, { ...this.cookieOptions(), maxAge: SESSION_TTL_MS });
    const user = await this.users.findById(result.userId);
    return { status: 'ok', user: toMeResponse(user!, this.access.computeAccess(user!)) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = req.signedCookies?.[SESSION_COOKIE];
    if (typeof token === 'string') {
      await this.sessions.revoke(token);
    }
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { ok: true };
  }
}
