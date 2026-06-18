import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { MeResponse } from '@hisobotchi/shared';
import { UsersService } from '../users/users.service';
import { AccessService } from '../access/access.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { toMeResponse } from './user.mapper';

@Controller()
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly access: AccessService,
  ) {}

  // GET /api/me — current authenticated user (protected by the global AuthGuard).
  @Get('me')
  me(@CurrentUser() user: User): MeResponse {
    return toMeResponse(user, this.access.computeAccess(user));
  }

  // PATCH /api/me — update the user's own editable profile fields.
  @Patch('me')
  async update(@CurrentUser() user: User, @Body() dto: UpdateMeDto): Promise<MeResponse> {
    const updated = await this.users.updateProfile(user.id, dto);
    return toMeResponse(updated, this.access.computeAccess(updated));
  }
}
