import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { RequireAuth } from '@/components/RequireAuth';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/routes/login';
import { DashboardPage } from '@/routes/dashboard';
import { GroupsPage } from '@/routes/groups';
import { ConnectionsPage } from '@/routes/connections';
import { HistoryPage } from '@/routes/history';
import { ProfilePage } from '@/routes/profile';
import { AdminPage } from '@/routes/admin';
import { PaywallPage } from '@/routes/paywall';
import { RequireAccess } from '@/components/RequireAccess';
import { PlaceholderPage } from '@/routes/placeholder';
import '@/index.css';

// If this document was opened as the Meta OAuth popup, the backend callback has
// redirected us back to the app with `?meta=...`. Relay the outcome to the opener
// window and close — the SPA itself never renders inside the popup.
const oauthRelayed = (() => {
  if (!window.opener || window.opener === window) return false;
  const sp = new URLSearchParams(window.location.search);
  const meta = sp.get('meta');
  if (!meta) return false;
  window.opener.postMessage(
    { type: 'meta-oauth', meta, reason: sp.get('reason') },
    window.location.origin,
  );
  window.close();
  return true;
})();

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      // Paywall is reachable while logged in but locked (outside RequireAccess).
      { path: '/paywall', element: <PaywallPage /> },
      {
        element: <RequireAccess />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/groups', element: <GroupsPage /> },
              { path: '/connections', element: <ConnectionsPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/profile', element: <ProfilePage /> },
              { path: '/admin', element: <AdminPage /> },
              { path: '/settings', element: <PlaceholderPage title="Sozlamalar" /> },
            ],
          },
        ],
      },
    ],
  },
]);

if (!oauthRelayed) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
