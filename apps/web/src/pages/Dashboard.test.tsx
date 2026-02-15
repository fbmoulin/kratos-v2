import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import Dashboard from './Dashboard';

const mockDocuments = [
  { id: '1', fileName: 'contrato.pdf', status: 'completed', createdAt: '2026-01-01' },
  { id: '2', fileName: 'peticao.pdf', status: 'processing', createdAt: '2026-01-02' },
  { id: '3', fileName: 'sentenca.pdf', status: 'failed', createdAt: '2026-01-03' },
];

vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: vi.fn(() => ({
    data: { data: mockDocuments, pagination: { page: 1, limit: 20, total: 3 } },
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
  test('renders heading', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  test('renders multiple documents in table', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('peticao.pdf')).toBeInTheDocument();
    expect(screen.getByText('sentenca.pdf')).toBeInTheDocument();
  });

  test('renders stats bar with correct labels', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Total')).toBeInTheDocument();
    // "Processando" appears in both StatsBar label and StatusBadge
    expect(screen.getAllByText('Processando').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
    expect(screen.getByText('Erros')).toBeInTheDocument();
  });

  test('renders upload zone', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText(/arraste pdfs aqui/i)).toBeInTheDocument();
  });

  test('upload zone accepts only PDF files', () => {
    render(<Dashboard />, { wrapper });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toBe('.pdf');
  });
});
