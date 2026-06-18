import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { AccessStatus, AdminUserResponse } from '@hisobotchi/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SuperadminGuard } from '../access/guards/superadmin.guard';
import { AdminService } from './admin.service';
import { GrantAccessDto } from './dto/grant-access.dto';

// Platform-owner panel (/api/admin) — superadmin-only (SUPERADMIN_TELEGRAM_IDS).
@Controller('admin')
@UseGuards(SuperadminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  list(
    @Query('q') q?: string,
    @Query('status') status?: AccessStatus,
  ): Promise<AdminUserResponse[]> {
    return this.admin.listUsers({ q, status });
  }

  @Post('users/:id/grant')
  @HttpCode(200)
  grant(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: GrantAccessDto,
  ): Promise<AdminUserResponse> {
    return this.admin.grant(id, dto, user.telegramUserId);
  }

  @Post('users/:id/revoke')
  @HttpCode(200)
  revoke(@CurrentUser() user: User, @Param('id') id: string): Promise<AdminUserResponse> {
    return this.admin.revoke(id, user.telegramUserId);
  }
}
