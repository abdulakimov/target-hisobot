import type { TelegramGroup } from '@prisma/client';
import type { GroupResponse } from '@hisobotchi/shared';

/** Maps a Prisma TelegramGroup to the API shape (BigInt → string, dates → ISO). */
export function toGroupResponse(group: TelegramGroup): GroupResponse {
  return {
    id: group.id,
    chatId: group.chatId.toString(),
    title: group.title,
    chatType: group.chatType,
    botStatus: group.botStatus,
    linkedAt: group.linkedAt ? group.linkedAt.toISOString() : null,
    createdAt: group.createdAt.toISOString(),
  };
}
