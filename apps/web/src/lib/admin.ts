import { api } from './api';
import type { AdminUserResponse, GrantAccessInput } from '@hisobotchi/shared';

export const adminApi = {
  listUsers: (params?: { q?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api<AdminUserResponse[]>(`/api/admin/users${suffix}`);
  },
  grant: (id: string, body: GrantAccessInput) =>
    api<AdminUserResponse>(`/api/admin/users/${id}/grant`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revoke: (id: string) =>
    api<AdminUserResponse>(`/api/admin/users/${id}/revoke`, { method: 'POST' }),
};
