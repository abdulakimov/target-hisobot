import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  LEAD_ACTION_OPTIONS,
  type AccountActionTypesResponse,
  type AdAccountResponse,
  type MetaStatusResponse,
  type MetaSyncResponse,
  type UpdateAdAccountRequest,
} from '@hisobotchi/shared';

const META_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Facebook ulandi ✅' },
  sync_failed: { ok: false, text: 'Ulandi, lekin akkauntlarni yuklab bo‘lmadi' },
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

  // Show the OAuth outcome (toast) and refresh the account list. Used both by the
  // popup flow (postMessage) and the full-redirect fallback (query params).
  const showMetaResult = useCallback(
    (meta: string, reason: string | null) => {
      const known = META_MESSAGES[meta];
      if (!known) return;
      const full = reason ? `${known.text}: ${reason}` : known.text;
      if (known.ok) toast.success(full);
      else toast.error(full, { duration: 8000 });
      void qc.invalidateQueries({ queryKey: ['meta-status'] });
    },
    [qc],
  );

  // Popup flow: the OAuth popup relays its result here, then closes itself.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; meta?: string; reason?: string | null };
      if (d?.type === 'meta-oauth' && d.meta) showMetaResult(d.meta, d.reason ?? null);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [showMetaResult]);

  // Fallback: if the popup was blocked we fall back to a full redirect, which
  // returns here with `?meta=...` in the URL.
  useEffect(() => {
    const m = params.get('meta');
    if (m && META_MESSAGES[m]) {
      showMetaResult(m, params.get('reason'));
      params.delete('meta');
      params.delete('reason');
      setParams(params, { replace: true });
    }
  }, [params, setParams, showMetaResult]);

  // Open the Meta OAuth dialog in a popup so the dashboard stays put. Falls back
  // to a full-page redirect if the browser blocks the popup.
  const connectMeta = useCallback(() => {
    const w = 600;
    const h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      '/api/meta/connect',
      'meta_oauth',
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) window.location.href = '/api/meta/connect';
    else popup.focus();
  }, []);

  const sync = useMutation({
    mutationFn: () => api<MetaSyncResponse>('/api/meta/sync', { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(`Yangilandi — ${res.accountCount} ta akkaunt`);
      void qc.invalidateQueries({ queryKey: ['meta-status'] });
    },
    onError: (e) => toast.error((e as Error).message || 'Yangilashda xatolik'),
  });

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
          <Button className="w-full" onClick={connectMeta}>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
            Yangilash
          </Button>
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
  // Action types the account actually produced recently — lets the user pick the real
  // lead event even when it isn't in the curated list. Fetched lazily for enabled accounts.
  const detected = useQuery({
    queryKey: ['account-action-types', account.id],
    queryFn: () => api<AccountActionTypesResponse>(`/api/meta/ad-accounts/${account.id}/action-types`),
    enabled: account.enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const curatedActionTypes = new Set(LEAD_ACTION_OPTIONS.flatMap((o) => o.actionTypes));
  const extra = (detected.data?.actionTypes ?? []).filter((a) => !curatedActionTypes.has(a.actionType));

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
              <optgroup label="Standart turlar">
                {LEAD_ACTION_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
              {extra.length > 0 && (
                <optgroup label="Account'da aniqlangan">
                  {extra.map((a) => (
                    <option key={a.actionType} value={a.actionType}>
                      {(a.label ?? a.actionType) + ` (${a.value})`}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {detected.isError && (
              <p className="text-xs text-muted-foreground">Mavjud turlarni yuklab bo‘lmadi.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
