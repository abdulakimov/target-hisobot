import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { deriveAccessStatus, type AccessStatus, type AdminUserResponse } from '@hisobotchi/shared';
import { PrismaService } from '../common/prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { GrantAccessDto } from './dto/grant-access.dto';

type UserWithCounts = User & { _count: { reports: number; telegramGroups: number } };

const WITH_COUNTS = { _count: { select: { reports: true, telegramGroups: true } } } as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listUsers(filter: { q?: string; status?: AccessStatus } = {}): Promise<AdminUserResponse[]> {
    const q = filter.q?.trim();
    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' as const } },
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: WITH_COUNTS,
    });
    let mapped = users.map((u) => this.toResponse(u));
    if (filter.status) mapped = mapped.filter((u) => u.accessStatus === filter.status);
    return mapped;
  }

  async grant(userId: string, dto: GrantAccessDto, grantedByTgId: bigint): Promise<AdminUserResponse> {
    await this.access.extendAccess(userId, dto.days, {
      mode: dto.mode ?? 'extend',
      note: dto.note ?? null,
      source: 'manual',
      grantedByTgId,
    });
    return this.getUserResponse(userId);
  }

  async revoke(userId: string, grantedByTgId: bigint): Promise<AdminUserResponse> {
    await this.access.revokeAccess(userId, { grantedByTgId });
    return this.getUserResponse(userId);
  }

  private async getUserResponse(userId: string): Promise<AdminUserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: WITH_COUNTS,
    });
    return this.toResponse(user);
  }

  private toResponse(u: UserWithCounts): AdminUserResponse {
    return {
      id: u.id,
      telegramUserId: u.telegramUserId.toString(),
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      photoUrl: u.photoUrl,
      isSuperadmin: this.access.isSuperadmin(u),
      accessStatus: deriveAccessStatus(u.accessExpiresAt),
      accessExpiresAt: u.accessExpiresAt ? u.accessExpiresAt.toISOString() : null,
      accessGrantedAt: u.accessGrantedAt ? u.accessGrantedAt.toISOString() : null,
      accessNote: u.accessNote,
      reportsCount: u._count.reports,
      groupsCount: u._count.telegramGroups,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    };
  }
}
