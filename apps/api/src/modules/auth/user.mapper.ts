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
    photoUrl: user.photoUrl,
    timezone: user.timezone,
    dmEnabled: user.dmEnabled,
  };
}
