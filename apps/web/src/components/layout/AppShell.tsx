import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  BarChart3,
  Users,
  PlugZap,
  History,
  Settings,
  Moon,
  Sun,
  Plus,
  LogOut,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { ReportEditorProvider, useReportEditor } from '@/providers/report-editor-provider';

const NAV = [
  { to: '/', label: 'Hisobotlar', icon: BarChart3, end: true },
  { to: '/groups', label: 'Guruhlar', icon: Users },
  { to: '/connections', label: 'Ulanishlar', icon: PlugZap },
  { to: '/history', label: 'Tarix', icon: History },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];

const TITLES: Record<string, string> = {
  '/': 'Hisobotlar',
  '/groups': 'Guruhlar',
  '/connections': 'Ulanishlar',
  '/history': 'Tarix',
  '/settings': 'Sozlamalar',
};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Mavzuni almashtirish"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

function DmBanner() {
  const { user, botUsername, refresh } = useAuth();
  if (!user || user.dmEnabled) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Bell className="size-4 text-primary" />
        Bildirishnomalarni olish uchun botni Telegram’da Start qiling.
      </div>
      <div className="flex items-center gap-2">
        {botUsername && (
          <Button asChild size="sm">
            <a href={`https://t.me/${botUsername}?start=dm`} target="_blank" rel="noreferrer">
              Botni ochish
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => refresh()}>
          Tekshirish
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <ReportEditorProvider>
      <AppShellLayout />
    </ReportEditorProvider>
  );
}

function AppShellLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { openEditor } = useReportEditor();
  const title = TITLES[pathname] ?? 'Hisobotchi';
  const initial = (user?.firstName ?? user?.username ?? '?').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 px-5 font-semibold">
          <BarChart3 className="size-5 text-primary" />
          Hisobotchi
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openEditor()}>
              <Plus />
              Yangi hisobot
            </Button>
            <ThemeToggle />
            <div className="flex items-center gap-2 pl-1">
              <div
                className="grid size-8 place-items-center rounded-full bg-primary/15 text-sm font-medium text-primary"
                title={user?.firstName ?? user?.username ?? ''}
              >
                {initial}
              </div>
              <Button variant="ghost" size="icon" aria-label="Chiqish" onClick={() => logout()}>
                <LogOut />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <DmBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
