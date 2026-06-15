import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportRunsApi } from '@/lib/report-runs';
import { reportsApi } from '@/lib/reports';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@hisobotchi/shared';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function HistoryPage() {
  const [reportId, setReportId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list });
  const runsQuery = useQuery({
    queryKey: ['report-runs', { reportId, status, from, to }],
    queryFn: () => reportRunsApi.list({ reportId, status, from, to }),
  });

  const reports = reportsQuery.data ?? [];
  const runs = runsQuery.data ?? [];
  const hasFilters = Boolean(reportId || status || from || to);
  const reset = () => {
    setReportId('');
    setStatus('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <select className={selectClass} value={reportId} onChange={(e) => setReportId(e.target.value)}>
          <option value="">Barcha hisobotlar</option>
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || r.adAccountName}
            </option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Barcha holatlar</option>
          <option value="success">Muvaffaqiyatli</option>
          <option value="failed">Xato</option>
        </select>
        <input type="date" className={selectClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)} />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Tozalash
          </Button>
        )}
      </div>

      {runsQuery.isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Yuklanmoqda…</div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Hozircha yozuv yo‘q.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={run.status === 'success' ? 'success' : 'danger'}>
                      {run.status === 'success' ? 'Muvaffaqiyatli' : 'Xato'}
                    </Badge>
                    {run.isTest && <Badge variant="secondary">Sinov</Badge>}
                    <span className="truncate text-sm font-medium">{run.reportLabel}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    → {run.telegramGroupTitle}
                    {run.errorMessage ? ` · ${run.errorMessage}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm">
                    {run.spend != null ? formatMoney(run.spend, run.currency ?? 'UZS') : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(run.ranAt ?? run.scheduledFor)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
