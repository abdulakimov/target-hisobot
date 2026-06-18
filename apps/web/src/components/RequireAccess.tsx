import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';

/**
 * Paywall gate, nested inside RequireAuth: a logged-in user without an active subscription
 * is sent to /paywall. Superadmins always have accessActive=true (computed server-side).
 */
export function RequireAccess() {
  const { user } = useAuth();
  if (user && !user.accessActive) return <Navigate to="/paywall" replace />;
  return <Outlet />;
}
