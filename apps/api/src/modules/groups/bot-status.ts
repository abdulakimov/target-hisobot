import type { BotStatus } from '@prisma/client';

/** Map a Telegram ChatMember status to our stored BotStatus. */
export function mapBotStatus(status: string): BotStatus {
  if (status === 'administrator' || status === 'creator') return 'admin';
  if (status === 'left' || status === 'kicked') return 'removed';
  return 'member';
}
