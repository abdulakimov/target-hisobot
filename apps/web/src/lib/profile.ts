import { api } from './api';
import type { MeResponse, UpdateMeInput } from '@hisobotchi/shared';

export const profileApi = {
  update: (input: UpdateMeInput) =>
    api<MeResponse>('/api/me', { method: 'PATCH', body: JSON.stringify(input) }),
};
