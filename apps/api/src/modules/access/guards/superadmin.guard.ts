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

/** Controller-level guard: restricts a route to platform superadmins (SUPERADMIN_TELEGRAM_IDS). */
@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly access: AccessService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request & { user?: User }>().user;
    if (!user) throw new UnauthorizedException();
    if (!this.access.isSuperadmin(user)) throw new ForbiddenException('forbidden');
    return true;
  }
}
