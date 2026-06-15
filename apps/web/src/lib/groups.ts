import { api } from './api';
import type { GroupResponse, PairingLinkResponse } from '@hisobotchi/shared';

export const groupsApi = {
  list: () => api<GroupResponse[]>('/api/groups'),
  createPairingLink: () =>
    api<PairingLinkResponse>('/api/groups/pairing-link', { method: 'POST' }),
  remove: (id: string) => api<void>(`/api/groups/${id}`, { method: 'DELETE' }),
};
