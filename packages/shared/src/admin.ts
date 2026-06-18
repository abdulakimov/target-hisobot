import type { AccessStatus } from './access.js';

/** A user row in the superadmin panel — GET /api/admin/users. */
export interface AdminUserResponse {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  isSuperadmin: boolean;
  accessStatus: AccessStatus;
  accessExpiresAt: string | null;
  accessGrantedAt: string | null;
  accessNote: string | null;
  reportsCount: number;
  groupsCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

/** POST /api/admin/users/:id/grant — extend (add to remaining) or set (from now) N days. */
export interface GrantAccessInput {
  days: number;
  note?: string | null;
  mode?: 'extend' | 'set';
}
