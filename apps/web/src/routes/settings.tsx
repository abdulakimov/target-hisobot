import { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/providers/auth-provider';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Foydalanuvchi';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <UserAvatar photoUrl={user?.photoUrl} name={name} className="size-12 text-base" />
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            {user?.username && (
              <div className="truncate text-sm text-muted-foreground">@{user.username}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profildan chiqish */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Profildan chiqish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tizimdan chiqasiz va qayta kirish uchun Telegram orqali login qilishingiz kerak bo‘ladi.
          </p>

          {!confirming ? (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              <LogOut />
              Profildan chiqish
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" />
                Rostdan ham chiqmoqchimisiz?
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    await logout();
                  }}
                >
                  <LogOut />
                  Ha, chiqish
                </Button>
                <Button
                  variant="ghost"
                  disabled={loggingOut}
                  onClick={() => setConfirming(false)}
                >
                  Bekor qilish
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
