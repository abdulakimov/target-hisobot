import { useEffect, useState } from 'react';
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
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
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

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return { collapsed, toggle: () => setCollapsed((c) => !c) };
}

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
  const { collapsed, toggle } = useSidebarCollapsed();
  const title = TITLES[pathname] ?? 'Hisobotchi';

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
            'flex h-14 items-center overflow-hidden font-semibold',
            collapsed ? 'justify-center px-0' : 'gap-2 px-5',
          )}
        >
          <BarChart3 className="size-5 shrink-0 text-primary" />
          {!collapsed && <span className="truncate">Hisobotchi</span>}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-md py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            onClick={toggle}
            aria-label={collapsed ? 'Menyuni yoyish' : 'Menyuni yig‘ish'}
            title={collapsed ? 'Yoyish' : 'Yig‘ish'}
            className={cn(
              'w-full text-muted-foreground',
              collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" />
                <span className="truncate">Yig‘ish</span>
              </>
            )}
          </Button>
        </div>
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
            <NavLink
              to="/settings"
              className="pl-1"
              title={user?.firstName ?? user?.username ?? 'Profil'}
              aria-label="Profil va sozlamalar"
            >
              <UserAvatar
                photoUrl={user?.photoUrl}
                name={user?.firstName ?? user?.username}
                className="transition-opacity hover:opacity-80"
              />
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
