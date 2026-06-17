import type { User } from '@prisma/client';
import type { MeResponse } from '@hisobotchi/shared';

/** Maps a Prisma User to the API shape (BigInt → string; no secrets). */
export function toMeResponse(user: User): MeResponse {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    // Prefer the Telegram profile photo (streamed via the bot) when we have a file_id;
    // otherwise fall back to any stored URL (e.g. from the legacy login widget).
    photoUrl: user.telegramPhotoFileId ? '/api/me/photo' : user.photoUrl,
    timezone: user.timezone,
    dmEnabled: user.dmEnabled,
  };
}
