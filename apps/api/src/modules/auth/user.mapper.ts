import type { User } from '@prisma/client';
import type { MeResponse } from '@hisobotchi/shared';
import type { AccessSummary } from '../access/access.service';

/** Maps a Prisma User + computed access to the API shape (BigInt → string; no secrets). */
export function toMeResponse(user: User, access: AccessSummary): MeResponse {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    timezone: user.timezone,
    dmEnabled: user.dmEnabled,
    isSuperadmin: access.isSuperadmin,
    accessActive: access.accessActive,
    accessExpiresAt: access.accessExpiresAt ? access.accessExpiresAt.toISOString() : null,
  };
}
