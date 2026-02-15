import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, session: null, signIn: vi.fn(), signOut: vi.fn() })),
}));

describe('App', () => {
  test('renders login page when not authenticated', async () => {
    render(<App />);
    expect(await screen.findByText(/entrar/i)).toBeInTheDocument();
  });
});
