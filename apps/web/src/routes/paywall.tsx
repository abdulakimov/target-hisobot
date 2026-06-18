import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Lock, LogOut, RefreshCw } from 'lucide-react';
import { deriveAccessStatus } from '@hisobotchi/shared';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';

export function PaywallPage() {
  const { user, botUsername, refresh, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  // Active (and superadmin) users never see the paywall.
  if (user?.accessActive) return <Navigate to="/" replace />;
  if (!user) return null;

  const status = deriveAccessStatus(user.accessExpiresAt);
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Foydalanuvchi';

  const onCheck = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <CardTitle>
              {status === 'expired' ? 'Obuna muddati tugadi' : 'Obuna faollashtirilmagan'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Hisobotchidan foydalanish uchun faol obuna kerak. To‘lovni amalga oshirgach,
            administrator akkauntingizni faollashtiradi — so‘ng quyidagi “Tekshirish” tugmasini
            bossangiz kirasiz.
          </p>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <UserAvatar user={user} className="size-10 text-sm" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">ID: {user.telegramUserId}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {botUsername && (
              <Button asChild>
                <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                  Administrator bilan bog‘lanish
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={onCheck} disabled={checking}>
              {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              To‘lovni tekshirish
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => logout()}>
              <LogOut />
              Chiqish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
