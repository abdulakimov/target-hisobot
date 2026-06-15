import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlugZap, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  LEAD_ACTION_OPTIONS,
  type AdAccountResponse,
  type MetaStatusResponse,
  type UpdateAdAccountRequest,
} from '@hisobotchi/shared';

const META_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Facebook ulandi ✅' },
  error: { ok: false, text: 'Ulanishda xatolik yuz berdi' },
  denied: { ok: false, text: 'Ruxsat berilmadi' },
  unconfigured: { ok: false, text: 'Meta app sozlanmagan (server)' },
};

export function ConnectionsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ['meta-status'],
    queryFn: () => api<MetaStatusResponse>('/api/meta/ad-accounts'),
  });

  useEffect(() => {
    const m = params.get('meta');
    if (m && META_MESSAGES[m]) {
      const { ok, text } = META_MESSAGES[m];
      if (ok) toast.success(text);
      else toast.error(text);
      params.delete('meta');
      setParams(params, { replace: true });
      void qc.invalidateQueries({ queryKey: ['meta-status'] });
    }
  }, [params, setParams, qc]);

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdAccountRequest }) =>
      api(`/api/meta/ad-accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meta-status'] }),
    onError: () => toast.error('Saqlashda xatolik'),
  });

  const disconnect = useMutation({
    mutationFn: () => api('/api/meta/connection', { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Facebook uzildi');
      void qc.invalidateQueries({ queryKey: ['meta-status'] });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Yuklanmoqda…</div>;
  }

  const connection = data?.connection ?? null;
  const accounts = data?.adAccounts ?? [];
  const active = connection?.status === 'active';

  if (!active) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="items-center text-center">
          <PlugZap className="size-8 text-primary" />
          <CardTitle>Facebook reklama akkauntini ulang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Hisobotlar olish uchun Meta (Facebook) reklama akkauntingizni ulang.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = '/api/meta/connect';
            }}
          >
            Facebook ulash
          </Button>
          {connection?.status === 'expired' && (
            <p className="text-sm text-destructive">Ulanish muddati tugagan — qayta ulang.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Badge variant="success">Ulangan</Badge>
          <span className="text-sm text-muted-foreground">
            {accounts.length} ta reklama akkaunti
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
        >
          <Trash2 />
          Uzish
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Bu akkauntda reklama akkauntlari topilmadi.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onChange={(body) => update.mutate({ id: a.id, body })} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({
  account,
  onChange,
}: {
  account: AdAccountResponse;
  onChange: (body: UpdateAdAccountRequest) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{account.name}</div>
            <div className="text-xs text-muted-foreground">
              {account.actId} · {account.currency || '—'}
            </div>
          </div>
          <Switch
            checked={account.enabled}
            onCheckedChange={(v) => onChange({ enabled: v })}
            aria-label="Yoqish"
          />
        </div>
        {account.enabled && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lead turi</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={account.defaultLeadActionType ?? ''}
              onChange={(e) => onChange({ defaultLeadActionType: e.target.value || null })}
            >
              <option value="">Tanlanmagan</option>
              {LEAD_ACTION_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
