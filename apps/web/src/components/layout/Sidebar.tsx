import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
] as const;

export function Sidebar() {
  const location = useLocation();
  const open = useAppStore((s) => s.sidebarOpen);

  if (!open) return null;

  return (
    <aside className="w-60 border-r border-(--color-border) bg-(--color-surface) flex flex-col">
      <div className="p-4 border-b border-(--color-border)">
        <h1 className="text-xl font-bold bg-gradient-to-r from-(--color-primary) to-(--color-primary-light) bg-clip-text text-transparent">
          KRATOS v2
        </h1>
        <p className="text-xs text-(--color-text-secondary) mt-1">Automação Jurídica</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname === to
                ? 'bg-gradient-to-r from-(--color-primary)/20 to-(--color-primary-light)/10 text-(--color-primary)'
                : 'text-(--color-text-secondary) hover:bg-(--color-surface-hover) hover:text-(--color-text)',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
