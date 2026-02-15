import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { user, signOut } = useAuth();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <header className="h-14 border-b border-(--color-border) bg-(--color-surface) flex items-center justify-between px-4">
      <button onClick={toggleSidebar} className="p-2 hover:bg-(--color-surface-hover) rounded-lg" aria-label="Toggle sidebar">
        <Menu className="h-5 w-5 text-(--color-text)" />
      </button>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm text-(--color-text-secondary)">{user?.email}</span>
        <button onClick={signOut} className="p-2 hover:bg-(--color-surface-hover) rounded-lg" aria-label="Sign out">
          <LogOut className="h-5 w-5 text-(--color-text)" />
        </button>
      </div>
    </header>
  );
}
