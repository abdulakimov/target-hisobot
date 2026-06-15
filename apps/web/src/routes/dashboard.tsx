import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reportsApi } from '@/lib/reports';
import { reportRunsApi } from '@/lib/report-runs';
import { useReportEditor } from '@/providers/report-editor-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { METRIC_LABELS, WEEKDAY_LABELS, WINDOW_LABELS, type LatestRunSummary } from '@hisobotchi/shared';

const GROUP_ERROR_CODES = ['forbidden', 'chat_not_found', 'migrated'];

function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Har kuni';
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return 'Du–Ju';
  return sorted.map((d) => WEEKDAY_LABELS[d as 1 | 2 | 3 | 4 | 5 | 6 | 7]).join(', ');
}

export function DashboardPage() {
  const qc = useQueryClient();
  const { openEditor } = useReportEditor();
  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list });
  const latestQuery = useQuery({ queryKey: ['report-runs-latest'], queryFn: reportRunsApi.latest });

  const latestByReport = useMemo(() => {
    const map = new Map<string, LatestRunSummary>();
    for (const summary of latestQuery.data ?? []) map.set(summary.reportId, summary);
    return map;
  }, [latestQuery.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['reports'] });
    void qc.invalidateQueries({ queryKey: ['report-runs-latest'] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => reportsApi.update(id, { enabled }),
    onSuccess: invalidate,
    onError: () => toast.error('Holatni o‘zgartirib bo‘lmadi.'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => reportsApi.remove(id),
    onSuccess: () => {
      toast.success('Hisobot o‘chirildi.');
      invalidate();
    },
    onError: () => toast.error('O‘chirib bo‘lmadi.'),
  });
  const test = useMutation({
    mutationFn: (id: string) => reportsApi.testSend(id),
    onSuccess: (res) => {
      if (res.ok) toast.success('Sinov xabari yuborildi ✅');
      else toast.error(res.error);
      invalidate();
    },
    onError: () => toast.error('Sinov xabarini yuborib bo‘lmadi.'),
  });

  if (reportsQuery.isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Yuklanmoqda…</div>;
  }

  const reports = reportsQuery.data ?? [];

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-medium">Hali hisobot yo‘q</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Reklama akkaunti va guruhni bog‘lab, birinchi avtomatik hisobotni sozlang.
          </p>
          <Button onClick={() => openEditor()}>
            <Plus />
            Yangi hisobot
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((r) => {
        const last = latestByReport.get(r.id);
        const failed = last?.status === 'failed';
        const reconnectTo = GROUP_ERROR_CODES.includes(last?.errorCode ?? '') ? '/groups' : '/connections';
        return (
          <Card key={r.id} className={failed ? 'border-destructive/40' : r.enabled ? undefined : 'opacity-70'}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate">{r.name || r.adAccountName}</CardTitle>
                  <p className="mt-1 truncate text-sm text-muted-foreground">→ {r.telegramGroupTitle}</p>
                </div>
                <Badge variant={r.enabled ? 'success' : 'secondary'}>{r.enabled ? 'Aktiv' : "O'chiq"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {r.metrics.map((m) => (
                  <Badge key={m} variant="outline">
                    {METRIC_LABELS[m]}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {r.sendTimes.join(', ')} · {formatWeekdays(r.weekdays)} · {WINDOW_LABELS[r.windowPreset]}
              </p>
              {failed && (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span className="min-w-0 flex-1 truncate">
                    Yuborishda xatolik{last?.errorMessage ? `: ${last.errorMessage}` : ''}
                  </span>
                  <Button asChild variant="link" size="sm" className="h-auto px-1 text-destructive">
                    <Link to={reconnectTo}>Qayta ulash</Link>
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEditor(r)}>
                  <Pencil />
                  Tahrirlash
                </Button>
                <Button variant="ghost" size="sm" onClick={() => test.mutate(r.id)} disabled={test.isPending}>
                  <Send />
                  Sinov
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle.mutate({ id: r.id, enabled: !r.enabled })}
                  disabled={toggle.isPending}
                >
                  {r.enabled ? 'To‘xtatish' : 'Yoqish'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="O‘chirish"
                  className="ml-auto text-destructive"
                  onClick={() => {
                    if (window.confirm('Hisobotni o‘chirasizmi?')) remove.mutate(r.id);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
