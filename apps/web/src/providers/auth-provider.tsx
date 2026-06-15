import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { AuthConfigResponse, MeResponse } from '@hisobotchi/shared';

interface AuthContextValue {
  user: MeResponse | null;
  botUsername: string | null;
  loading: boolean;
  setUser: (user: MeResponse | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api<MeResponse>('/api/me'));
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  useEffect(() => {
    void (async () => {
      const [, cfg] = await Promise.allSettled([refresh(), api<AuthConfigResponse>('/api/auth/config')]);
      if (cfg.status === 'fulfilled') setBotUsername(cfg.value.botUsername);
      setLoading(false);
    })();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, botUsername, loading, setUser, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
