import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import type { User } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type {
  AccountActionTypesResponse,
  MetaStatusResponse,
  MetaSyncResponse,
} from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MetaService } from './meta.service';
import { MetaGraphService } from './meta-graph.service';
import { UpdateAdAccountDto } from './dto/update-ad-account.dto';

const STATE_COOKIE = 'meta_oauth_state';

@Controller('meta')
export class MetaController {
  private readonly logger = new Logger(MetaController.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly meta: MetaService,
    private readonly graph: MetaGraphService,
  ) {}

  private get frontend(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  private stateCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      signed: true,
      path: '/',
    };
  }

  // GET /api/meta/connect — start OAuth (top-level redirect to Facebook).
  @Get('connect')
  connect(@CurrentUser() _user: User, @Res({ passthrough: true }) res: Response): void {
    if (!this.graph.isConfigured()) {
      res.redirect(`${this.frontend}/connections?meta=unconfigured`);
      return;
    }
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, { ...this.stateCookieOptions(), maxAge: 10 * 60 * 1000 });
    res.redirect(this.graph.authDialogUrl(state));
  }

  // GET /api/meta/callback — Facebook redirects here with code + state.
  @Get('callback')
  async callback(
    @CurrentUser() user: User,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const stateCookie = req.signedCookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, this.stateCookieOptions());

    if (error || !code) {
      res.redirect(`${this.frontend}/connections?meta=denied`);
      return;
    }
    if (!stateCookie || stateCookie !== state) {
      res.redirect(`${this.frontend}/connections?meta=error`);
      return;
    }
    try {
      const { syncError } = await this.meta.handleCallback(user.id, code);
      if (syncError) {
        // Connected, but accounts couldn't load — show the real reason so the user can act.
        res.redirect(
          `${this.frontend}/connections?meta=sync_failed&reason=${encodeURIComponent(truncate(syncError))}`,
        );
        return;
      }
      res.redirect(`${this.frontend}/connections?meta=connected`);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Meta callback failed: ${message}`);
      res.redirect(`${this.frontend}/connections?meta=error&reason=${encodeURIComponent(truncate(message))}`);
    }
  }

  // POST /api/meta/sync — re-sync ad accounts for the existing connection.
  @Post('sync')
  async sync(@CurrentUser() user: User): Promise<MetaSyncResponse> {
    const accountCount = await this.meta.resync(user.id);
    return { accountCount };
  }

  // GET /api/meta/ad-accounts — connection status + synced accounts.
  @Get('ad-accounts')
  status(@CurrentUser() user: User): Promise<MetaStatusResponse> {
    return this.meta.getStatus(user.id);
  }

  // GET /api/meta/ad-accounts/:id/action-types — action types the account actually produced.
  @Get('ad-accounts/:id/action-types')
  actionTypes(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<AccountActionTypesResponse> {
    return this.meta.getAccountActionTypes(user.id, id);
  }

  @Patch('ad-accounts/:id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAdAccountDto,
  ): Promise<{ ok: true }> {
    await this.meta.updateAdAccount(user.id, id, dto);
    return { ok: true };
  }

  @Delete('connection')
  async disconnect(@CurrentUser() user: User): Promise<{ ok: true }> {
    await this.meta.disconnect(user.id);
    return { ok: true };
  }
}

/** Keep the user-facing reason short enough for a redirect URL + toast. */
function truncate(message: string, max = 180): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}
