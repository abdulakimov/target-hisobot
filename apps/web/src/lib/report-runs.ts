import { api } from './api';
import type { LatestRunSummary, ReportRunResponse } from '@hisobotchi/shared';

export const reportRunsApi = {
  list: (params: { reportId?: string; status?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.reportId) q.set('reportId', params.reportId);
    if (params.status) q.set('status', params.status);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return api<ReportRunResponse[]>(`/api/report-runs${qs ? `?${qs}` : ''}`);
  },
  latest: () => api<LatestRunSummary[]>('/api/report-runs/latest'),
};
