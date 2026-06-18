import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Check, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { profileApi } from '@/lib/profile';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import type { MeResponse } from '@hisobotchi/shared';

const TIMEZONES = [
  'Asia/Tashkent',
  'Asia/Samarkand',
  'Asia/Almaty',
  'Asia/Dubai',
  'Europe/Moscow',
  'Europe/Istanbul',
  'UTC',
];

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ProfilePage() {
  const { user, setUser, logout, botUsername } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Tashkent');

  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  const dirty =
    (firstName.trim() || '') !== (user?.firstName ?? '') ||
    (lastName.trim() || '') !== (user?.lastName ?? '') ||
    timezone !== (user?.timezone ?? '');

  const save = useMutation({
    mutationFn: () =>
      profileApi.update({ firstName: firstName.trim() || null, lastName: lastName.trim() || null, timezone }),
    onSuccess: (updated: MeResponse) => {
      setUser(updated);
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      setTimezone(updated.timezone);
      toast.success('Profil saqlandi ✅');
    },
    onError: () => toast.error('Profilni saqlab bo‘lmadi.'),
  });

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Foydalanuvchi';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Identity header */}
      <div className="flex items-center gap-4">
        <UserAvatar user={user} className="size-20 text-2xl" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{fullName}</h2>
          {user.username && <p className="truncate text-sm text-muted-foreground">@{user.username}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Ism va rasm Telegram orqali olinadi.</p>
        </div>
      </div>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profil ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" />
            </Field>
            <Field label="Familiya">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" />
            </Field>
          </div>
          <Field label="Vaqt mintaqasi">
            <select className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Yangi hisobotlar uchun standart vaqt mintaqasi.</p>
          </Field>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Saqlash
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account / notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Hisob</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Telegram ID</span>
            <span className="font-mono">{user.telegramUserId}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Bell className="size-4" />
              Bildirishnomalar
            </span>
            {user.dmEnabled ? (
              <Badge variant="success">Yoqilgan</Badge>
            ) : botUsername ? (
              <Button asChild size="sm" variant="outline">
                <a href={`https://t.me/${botUsername}?start=dm`} target="_blank" rel="noreferrer">
                  Botni ochish
                </a>
              </Button>
            ) : (
              <Badge variant="secondary">O'chiq</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Tizimdan chiqish</p>
          <p className="text-xs text-muted-foreground">Bu qurilmadagi seansni tugatadi.</p>
        </div>
        <Button variant="outline" className={cn('text-destructive')} onClick={() => logout()}>
          <LogOut />
          Chiqish
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
