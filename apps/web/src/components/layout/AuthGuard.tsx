import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-(--color-bg) flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-(--color-primary) border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
