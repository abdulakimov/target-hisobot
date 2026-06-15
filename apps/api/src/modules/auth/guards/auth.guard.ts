import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_COOKIE, SessionService } from '../session.service';

/**
 * Global guard: every route is protected unless marked @Public(). On success it attaches
 * the authenticated user to the request — the basis for tenant isolation (all queries must
 * scope by this user's id, read via @CurrentUser()).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    const token = req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.sessions.validate(token);
    if (!user) {
      throw new UnauthorizedException('Session invalid or expired');
    }

    req.user = user;
    return true;
  }
}
