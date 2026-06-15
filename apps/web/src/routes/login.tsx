import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TelegramPollResponse, TelegramStartResponse } from '@hisobotchi/shared';

const POLL_INTERVAL_MS = 2000;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);
  const timerRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setWaiting(false);
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const startLogin = async () => {
    setWaiting(true);
    try {
      const { token, deepLink } = await api<TelegramStartResponse>('/api/auth/telegram/start', {
        method: 'POST',
      });
      window.open(deepLink, '_blank', 'noopener');

      const deadline = Date.now() + LOGIN_TIMEOUT_MS;
      timerRef.current = window.setInterval(async () => {
        if (Date.now() > deadline) {
          stopPolling();
          toast.error('Vaqt tugadi. Qayta urinib ko‘ring.');
          return;
        }
        try {
          const res = await api<TelegramPollResponse>(
            `/api/auth/telegram/poll?token=${encodeURIComponent(token)}`,
          );
          if (res.status === 'ok') {
            stopPolling();
            setUser(res.user);
            navigate('/', { replace: true });
          } else if (res.status === 'expired') {
            stopPolling();
            toast.error('Havola eskirdi. Qayta urinib ko‘ring.');
          }
        } catch {
          /* network blip — keep polling */
        }
      }, POLL_INTERVAL_MS);
    } catch {
      stopPolling();
      toast.error('Xatolik yuz berdi. Qayta urinib ko‘ring.');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="size-5 text-primary" />
            Hisobotchi
          </div>
          <CardTitle className="text-base font-normal text-muted-foreground">
            Telegram orqali tizimga kiring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={startLogin} disabled={waiting}>
            {waiting ? <Loader2 className="animate-spin" /> : <Send />}
            {waiting ? 'Kutilyapti…' : 'Telegram'}
          </Button>
          {waiting && (
            <p className="text-center text-sm text-muted-foreground">
              Ochilgan Telegram chatda <span className="font-medium text-foreground">Start</span> tugmasini
              bosing — keyin avtomatik kiritiladi.
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Davom etish orqali botga Start berasiz va bildirishnomalar yoqiladi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
