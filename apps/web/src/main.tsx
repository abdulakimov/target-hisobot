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
import { ConnectionsPage } from '@/routes/connections';
import { PlaceholderPage } from '@/routes/placeholder';
import '@/index.css';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/groups', element: <PlaceholderPage title="Guruhlar" /> },
          { path: '/connections', element: <ConnectionsPage /> },
          { path: '/history', element: <PlaceholderPage title="Tarix" /> },
          { path: '/settings', element: <PlaceholderPage title="Sozlamalar" /> },
        ],
      },
    ],
  },
]);

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
