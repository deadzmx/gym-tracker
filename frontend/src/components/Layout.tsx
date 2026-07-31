import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useTheme } from '../lib/theme';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/plans', label: '计划', icon: '📋' },
  { to: '/exercises', label: '动作', icon: '💪' },
  { to: '/workout', label: '训练', icon: '🔥' },
  { to: '/history', label: '历史', icon: '🕐' },
  { to: '/stats', label: '统计', icon: '📈' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
      data-testid="theme-toggle"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

function NavItem({
  to,
  end,
  label,
  icon,
  onClick,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        )
      }
    >
      <span className="text-base shrink-0">{icon}</span>
      {label}
    </NavLink>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white font-bold">
          G
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gym Tracker</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">训练日志 · v0.3</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            label={item.label}
            icon={item.icon}
            onClick={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-slate-100 dark:border-slate-800 p-4 text-xs text-slate-400 dark:text-slate-500 hidden md:block">
        <p>设计:design.md</p>
        <p>API:{import.meta.env.VITE_API_BASE ?? '/api (同源)'}</p>
      </div>
    </>
  );
}

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:flex md:flex-col">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/70" />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-3 md:px-8 md:h-16">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              aria-label="打开菜单"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 md:hidden"
              aria-label="返回首页"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-bold">
                G
              </div>
              <span className="text-sm font-semibold dark:text-slate-100">Gym Tracker</span>
            </button>
            <h1 className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
              训练 · 计划 · 数据
            </h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('/workout')}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white md:hidden"
            >
              🔥 训练
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-3 py-4 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
