import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { BotStatus, TelegramGroup } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export const PAIRING_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Chat facts captured when a group claims a pairing token. */
export interface PairingChat {
  chatId: bigint;
  title: string;
  chatType: string;
  botStatus: BotStatus;
}

export interface PairingResult {
  ok: boolean;
  group?: TelegramGroup;
}

/** A bot-status transition for one linked group (returned to the bot for follow-up DMs). */
export interface BotStatusChange {
  group: TelegramGroup;
  ownerTelegramUserId: bigint;
  previousStatus: BotStatus;
  newStatus: BotStatus;
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a one-time pairing token for the startgroup deep link. */
  async createPairingToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS);
    await this.prisma.groupPairingToken.create({ data: { userId, token, expiresAt } });
    return { token, expiresAt };
  }

  /**
   * Claim a pairing token from a group /start <token>: bind the group to the token's user.
   * Idempotent on (userId, chatId) — re-pairing refreshes title/status and re-marks linked.
   */
  async claimPairing(token: string, chat: PairingChat): Promise<PairingResult> {
    const row = await this.prisma.groupPairingToken.findUnique({ where: { token } });
    if (!row || row.used || row.expiresAt.getTime() < Date.now()) {
      return { ok: false };
    }
    const group = await this.prisma.telegramGroup.upsert({
      where: { userId_chatId: { userId: row.userId, chatId: chat.chatId } },
      create: {
        userId: row.userId,
        chatId: chat.chatId,
        title: chat.title,
        chatType: chat.chatType,
        botStatus: chat.botStatus,
        linkedAt: new Date(),
      },
      update: {
        title: chat.title,
        chatType: chat.chatType,
        botStatus: chat.botStatus,
        linkedAt: new Date(),
      },
    });
    await this.prisma.groupPairingToken.update({ where: { token }, data: { used: true } });
    return { ok: true, group };
  }

  /** List the user's groups, newest first. */
  list(userId: string): Promise<TelegramGroup[]> {
    return this.prisma.telegramGroup.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** Remove a group (tenant-scoped). */
  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.telegramGroup.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new NotFoundException('Group not found');
  }

  /**
   * Apply a my_chat_member status change to every linked group for this chat. Unlinked chats
   * are ignored (we can't attribute them to a user). Returns the per-group transitions so the
   * bot can DM owners (e.g. on removal).
   */
  async updateBotStatus(chatId: bigint, newStatus: BotStatus): Promise<BotStatusChange[]> {
    const groups = await this.prisma.telegramGroup.findMany({
      where: { chatId },
      include: { user: { select: { telegramUserId: true } } },
    });
    const changes: BotStatusChange[] = [];
    for (const group of groups) {
      const previousStatus = group.botStatus;
      if (previousStatus !== newStatus) {
        await this.prisma.telegramGroup.update({
          where: { id: group.id },
          data: { botStatus: newStatus },
        });
      }
      changes.push({
        group,
        ownerTelegramUserId: group.user.telegramUserId,
        previousStatus,
        newStatus,
      });
    }
    return changes;
  }
}
