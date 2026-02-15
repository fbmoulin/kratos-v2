import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement } from 'react';
import Login from './Login';

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    user: null,
    session: null,
    loading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, null, children);
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders email and password fields', () => {
    render(<Login />, { wrapper });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  test('renders submit button', () => {
    render(<Login />, { wrapper });
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  test('renders KRATOS v2 heading', () => {
    render(<Login />, { wrapper });
    expect(screen.getByText('KRATOS v2')).toBeInTheDocument();
  });

  test('calls signIn on form submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<Login />, { wrapper });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('navigates to dashboard on successful login', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<Login />, { wrapper });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error message on failed login', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));
    render(<Login />, { wrapper });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('shows loading state while submitting', async () => {
    let resolveSignIn: () => void;
    mockSignIn.mockImplementation(() => new Promise<void>((resolve) => { resolveSignIn = resolve; }));
    render(<Login />, { wrapper });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Entrando...')).toBeInTheDocument();
    resolveSignIn!();
  });
});
