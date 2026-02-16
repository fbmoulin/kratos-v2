import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import DocumentDetail from './DocumentDetail';

const mockDoc = {
  id: 'doc-1',
  fileName: 'peticao_inicial.pdf',
  fileSize: 2048000,
  status: 'pending',
  pages: 12,
  createdAt: '2026-02-14T20:00:00.000Z',
  updatedAt: '2026-02-14T20:01:00.000Z',
};

vi.mock('@/hooks/useDocuments', () => ({
  useDocument: vi.fn((id: string) => ({
    data: id === 'doc-1' ? { data: mockDoc } : null,
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/lib/api', () => ({
  api: {
    documents: {
      analyze: vi.fn(),
    },
  },
}));

function renderWithRoute(docId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, { initialEntries: [`/documents/${docId}`] },
        createElement(Routes, null,
          createElement(Route, { path: '/documents/:id', element: createElement(DocumentDetail) })
        )
      )
    )
  );
}

describe('DocumentDetail', () => {
  test('renders document file name', () => {
    renderWithRoute('doc-1');
    expect(screen.getByText('peticao_inicial.pdf')).toBeInTheDocument();
  });

  test('renders page heading', () => {
    renderWithRoute('doc-1');
    expect(screen.getByText('Detalhes do Documento')).toBeInTheDocument();
  });

  test('renders file size and pages', () => {
    renderWithRoute('doc-1');
    expect(screen.getByText(/2000\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/12 páginas/)).toBeInTheDocument();
  });

  test('renders analyze button for pending documents', () => {
    renderWithRoute('doc-1');
    expect(screen.getByText('Iniciar Análise')).toBeInTheDocument();
  });

  test('shows not found message for invalid document', () => {
    renderWithRoute('nonexistent');
    expect(screen.getByText('Documento não encontrado.')).toBeInTheDocument();
  });

  test('renders back link to dashboard', () => {
    renderWithRoute('doc-1');
    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });
});
