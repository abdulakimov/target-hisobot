import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { AccessService } from '../access.service';

/**
 * Controller-level guard: blocks the action for users without an active subscription
 * (superadmins bypass). Runs after the global AuthGuard, so req.user is set.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly access: AccessService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request & { user?: User }>().user;
    if (!user) throw new UnauthorizedException();
    if (!this.access.hasActiveAccess(user)) {
      throw new ForbiddenException({
        code: 'subscription_required',
        message: 'Obuna talab qilinadi',
      });
    }
    return true;
  }
}
