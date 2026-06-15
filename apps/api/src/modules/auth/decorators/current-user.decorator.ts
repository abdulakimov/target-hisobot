import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/** Injects the authenticated user attached by AuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest<{ user: User }>().user;
});
