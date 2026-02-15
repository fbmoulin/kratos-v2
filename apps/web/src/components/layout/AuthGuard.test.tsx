import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, session: null, signIn: vi.fn(), signOut: vi.fn() })),
}));

describe('AuthGuard', () => {
  test('redirects to /login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard><div>Protected</div></AuthGuard>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });
});
