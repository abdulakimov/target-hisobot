import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import type { GroupResponse, PairingLinkResponse } from '@hisobotchi/shared';
import type { AppConfig } from '../common/config/env.validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { toGroupResponse } from './group.mapper';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post('pairing-link')
  @HttpCode(200)
  async createPairingLink(@CurrentUser() user: User): Promise<PairingLinkResponse> {
    const { token, expiresAt } = await this.groups.createPairingToken(user.id);
    const botUsername = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true });
    return {
      token,
      deepLink: `https://t.me/${botUsername}?startgroup=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Get()
  async list(@CurrentUser() user: User): Promise<GroupResponse[]> {
    const groups = await this.groups.list(user.id);
    return groups.map(toGroupResponse);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.groups.remove(user.id, id);
  }
}
