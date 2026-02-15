import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import Dashboard from './Dashboard';

vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: vi.fn(() => ({
    data: { data: [{ id: '1', fileName: 'test.pdf', status: 'completed', createdAt: '2026-01-01' }], pagination: { page: 1, limit: 20, total: 1 } },
    isLoading: false,
    isSuccess: true,
  })),
  useUploadDocument: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc },
    createElement(MemoryRouter, null, children));
}

describe('Dashboard', () => {
  test('renders document list', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });
});
