import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUserResponse } from '@hisobotchi/shared';
import { adminApi } from '@/lib/admin';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  active: 'Faol',
  expired: 'Muddati tugagan',
  none: 'Faollashtirilmagan',
};

function displayName(u: AdminUserResponse): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Foydalanuvchi';
}

function statusBadge(u: AdminUserResponse) {
  if (u.isSuperadmin) return <Badge variant="secondary">Superadmin</Badge>;
  const variant =
    u.accessStatus === 'active' ? 'success' : u.accessStatus === 'expired' ? 'danger' : 'secondary';
  return <Badge variant={variant}>{STATUS_LABEL[u.accessStatus]}</Badge>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [granting, setGranting] = useState<AdminUserResponse | null>(null);

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers() });
  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.revoke(id),
    onSuccess: () => {
      toast.success('Obuna bekor qilindi.');
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Bekor qilib bo‘lmadi.'),
  });

  // Frontend guard (backend SuperadminGuard is the real one); run after all hooks.
  if (user && !user.isSuperadmin) return <Navigate to="/" replace />;

  const needle = q.trim().toLowerCase();
  const users = (usersQuery.data ?? []).filter((u) => {
    if (!needle) return true;
    const hay = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.username ?? ''} ${u.telegramUserId}`.toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Qidirish (ism, username, ID)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {usersQuery.isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Yuklanmoqda…</div>
      ) : usersQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-destructive">
            Foydalanuvchilarni yuklab bo‘lmadi.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar user={u} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{displayName(u)}</span>
                    {statusBadge(u)}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {u.username ? `@${u.username} · ` : ''}ID: {u.telegramUserId} · {u.reportsCount} hisobot ·{' '}
                    {u.groupsCount} guruh
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-muted-foreground">Muddat</p>
                  <p className="text-sm">{formatDate(u.accessExpiresAt)}</p>
                </div>
                {!u.isSuperadmin && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setGranting(u)}>
                      {u.accessStatus === 'active' ? 'Uzaytirish' : 'Faollashtirish'}
                    </Button>
                    {u.accessStatus === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (window.confirm('Obunani bekor qilasizmi?')) revoke.mutate(u.id);
                        }}
                      >
                        Bekor
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">Foydalanuvchi topilmadi.</div>
            )}
          </CardContent>
        </Card>
      )}

      {granting && <GrantModal target={granting} onClose={() => setGranting(null)} />}
    </div>
  );
}

function GrantModal({ target, onClose }: { target: AdminUserResponse; onClose: () => void }) {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');
  const mode: 'extend' | 'set' = target.accessStatus === 'active' ? 'extend' : 'set';

  const grant = useMutation({
    mutationFn: () => adminApi.grant(target.id, { days, note: note.trim() || null, mode }),
    onSuccess: () => {
      toast.success(mode === 'extend' ? 'Obuna uzaytirildi.' : 'Obuna faollashtirildi.');
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: () => toast.error('Bajarib bo‘lmadi.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
        <h2 className="font-semibold">
          {mode === 'extend' ? 'Obunani uzaytirish' : 'Obunani faollashtirish'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{displayName(target)}</p>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[30, 90, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  days === d
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {d} kun
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <span className="text-sm">Kun soni</span>
            <Input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm">Izoh (ixtiyoriy)</span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Payme orqali to‘ladi"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={() => grant.mutate()} disabled={grant.isPending || days < 1}>
            {grant.isPending && <Loader2 className="animate-spin" />}
            {mode === 'extend' ? 'Uzaytirish' : 'Faollashtirish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
