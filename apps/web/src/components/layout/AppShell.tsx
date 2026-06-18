import { useState } from 'react';
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
  PanelLeft,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
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
  '/profile': 'Profil',
  '/admin': 'Admin',
  '/settings': 'Sozlamalar',
};

const COLLAPSE_KEY = 'sidebar-collapsed';

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
  const { user } = useAuth();
  const { openEditor } = useReportEditor();
  const title = TITLES[pathname] ?? 'Hisobotchi';
  const nav = user?.isSuperadmin
    ? [...NAV, { to: '/admin', label: 'Admin', icon: ShieldCheck, end: false }]
    : NAV;

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center gap-2 font-semibold',
            collapsed ? 'justify-center px-0' : 'px-5',
          )}
        >
          <BarChart3 className="size-5 shrink-0 text-primary" />
          {!collapsed && 'Hisobotchi'}
        </div>
        <nav className={cn('flex flex-1 flex-col gap-1 py-2', collapsed ? 'px-2' : 'px-3')}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-3',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={collapsed ? 'Yon panelni ochish' : 'Yon panelni yig‘ish'}
              onClick={toggleCollapsed}
            >
              <PanelLeft />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openEditor()}>
              <Plus />
              Yangi hisobot
            </Button>
            <ThemeToggle />
            <NavLink
              to="/profile"
              title="Profil"
              aria-label="Profil"
              className="rounded-full ring-offset-background transition hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <UserAvatar user={user} className="size-8 text-sm" />
            </NavLink>
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
