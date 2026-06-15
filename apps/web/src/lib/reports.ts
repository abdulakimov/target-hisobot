import { api } from './api';
import type {
  CreateReportInput,
  ReportFormOptions,
  ReportResponse,
  TestSendResponse,
  UpdateReportInput,
} from '@hisobotchi/shared';

export const reportsApi = {
  list: () => api<ReportResponse[]>('/api/reports'),
  options: () => api<ReportFormOptions>('/api/reports/options'),
  create: (body: CreateReportInput) =>
    api<ReportResponse>('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: UpdateReportInput) =>
    api<ReportResponse>(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => api<void>(`/api/reports/${id}`, { method: 'DELETE' }),
  testSend: (id: string) =>
    api<TestSendResponse>(`/api/reports/${id}/test-send`, { method: 'POST' }),
};
