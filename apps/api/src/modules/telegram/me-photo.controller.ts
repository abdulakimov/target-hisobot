import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TelegramBotService } from './telegram-bot.service';

@Controller()
export class MePhotoController {
  constructor(private readonly bot: TelegramBotService) {}

  /**
   * GET /api/me/photo — streams the authenticated user's Telegram profile photo.
   * Scoped to the current user (file_id comes from their own record); the bot token
   * never leaves the server. 404 when the user has no photo.
   */
  @Get('me/photo')
  async photo(@CurrentUser() user: User, @Res() res: Response): Promise<void> {
    if (!user.telegramPhotoFileId) {
      throw new NotFoundException('No profile photo');
    }
    const file = await this.bot.fetchProfilePhoto(user.telegramPhotoFileId);
    if (!file) {
      throw new NotFoundException('Profile photo unavailable');
    }
    res.set({
      'Content-Type': file.contentType,
      'Cache-Control': 'private, max-age=3600',
    });
    res.send(file.buffer);
  }
}
