import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';

export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Yuklanmoqda…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
