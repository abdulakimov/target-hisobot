import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cookie carries the raw token; the DB stores only its SHA-256 hash. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, meta: { userAgent?: string; ip?: string }): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return token;
  }

  /** Returns the user for a valid, unexpired session; touches last_seen_at. */
  async validate(token: string): Promise<User | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return null;
    }
    await this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    return session.user;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: this.hashToken(token) } });
  }
}
