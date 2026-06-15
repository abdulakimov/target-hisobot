import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { MeResponse } from '@hisobotchi/shared';
import { CurrentUser } from './decorators/current-user.decorator';
import { toMeResponse } from './user.mapper';

@Controller()
export class MeController {
  // GET /api/me — current authenticated user (protected by the global AuthGuard).
  @Get('me')
  me(@CurrentUser() user: User): MeResponse {
    return toMeResponse(user);
  }
}
