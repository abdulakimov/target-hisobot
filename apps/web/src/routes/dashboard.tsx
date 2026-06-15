import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { METRIC_LABELS, type MetricKey } from '@hisobotchi/shared';

type DemoStatus = 'active' | 'failed' | 'off';

interface DemoReport {
  id: string;
  account: string;
  group: string;
  status: DemoStatus;
  metrics: MetricKey[];
  schedule: string;
}

// Static placeholder data — replaced by real /reports query in M4.
const DEMO_REPORTS: DemoReport[] = [
  {
    id: '1',
    account: 'Ortiqov Shop',
    group: 'Mijoz · Ortiqov',
    status: 'active',
    metrics: ['ad_spend', 'lead_count', 'cost_per_lead', 'unique_ctr'],
    schedule: "09:00 · Har kuni · Kecha",
  },
  {
    id: '2',
    account: 'Glamour Beauty',
    group: 'Mijoz · Glamour',
    status: 'failed',
    metrics: ['ad_spend', 'impressions', 'reach'],
    schedule: "18:00 · Du–Ju · So'nggi 7 kun",
  },
  {
    id: '3',
    account: 'Auto Parts UZ',
    group: 'Mijoz · AutoParts',
    status: 'off',
    metrics: ['ad_spend', 'lead_count'],
    schedule: "10:00 · Du,Cho,Ju · Shu oy",
  },
];

const STATUS: Record<DemoStatus, { label: string; variant: 'success' | 'danger' | 'secondary' }> = {
  active: { label: 'Aktiv', variant: 'success' },
  failed: { label: 'Xato', variant: 'danger' },
  off: { label: "O'chiq", variant: 'secondary' },
};

export function DashboardPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {DEMO_REPORTS.map((r) => {
        const status = STATUS[r.status];
        return (
          <Card key={r.id} className={r.status === 'failed' ? 'border-destructive/40' : undefined}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{r.account}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">→ {r.group}</p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
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
              <p className="text-sm text-muted-foreground">{r.schedule}</p>
              {r.status === 'failed' && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Yuborishda xatolik — ulanishni tekshiring.
                  <Button variant="link" size="sm" className="h-auto px-1 text-destructive">
                    Qayta ulash
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
