import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface TelegramProfile {
  id: number | bigint;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
  /** Telegram profile photo file_id, resolved by the bot via getUserProfilePhotos. */
  photo_file_id?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert a user from Telegram login data, keyed by telegram_user_id. */
  async upsertFromTelegram(data: TelegramProfile): Promise<User> {
    const telegramUserId = BigInt(data.id);
    const now = new Date();
    return this.prisma.user.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        username: data.username ?? null,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        photoUrl: data.photo_url ?? null,
        telegramPhotoFileId: data.photo_file_id ?? null,
        lastLoginAt: now,
      },
      update: {
        username: data.username ?? undefined,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        photoUrl: data.photo_url ?? undefined,
        // Refresh on each login; explicit null clears a removed photo.
        telegramPhotoFileId: data.photo_file_id ?? null,
        lastLoginAt: now,
      },
    });
  }

  /** Toggle DM capability when the user starts the bot privately. Returns true if a user matched. */
  async setDmEnabled(telegramUserId: bigint, enabled: boolean): Promise<boolean> {
    const res = await this.prisma.user.updateMany({
      where: { telegramUserId },
      data: { dmEnabled: enabled },
    });
    return res.count > 0;
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
