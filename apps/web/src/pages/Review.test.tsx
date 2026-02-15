import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import Review from './Review';

const mockMutate = vi.fn();
const mockExportMutate = vi.fn();

vi.mock('react-diff-viewer-continued', () => ({
  default: ({ oldValue, newValue: _newValue }: { oldValue: string; newValue: string }) =>
    createElement('div', { 'data-testid': 'mock-diff' }, `${oldValue.slice(0, 20)}...`),
  DiffMethod: { WORDS: 'words' },
}));

vi.mock('@/hooks/useDocuments', () => ({
  useDocument: vi.fn(() => ({
    data: {
      data: { id: '1', fileName: 'test.pdf', status: 'completed', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      analysis: {
        agentChain: 'supervisor → router → specialist',
        resultJson: {
          firac: { facts: 'Fatos do caso', issue: 'Questão jurídica', rule: 'Art. 389 CC', analysis: 'Análise', conclusion: 'Procedente' },
          router: { legalMatter: 'civil', decisionType: 'sentenca', complexity: 40, confidence: 90, selectedModel: 'claude-sonnet-4-5-20250929', reasoning: '' },
          rawText: 'Texto original do documento',
          draft: 'Minuta gerada pela IA',
        },
      },
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useReview', () => ({
  useReview: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

vi.mock('@/hooks/useExport', () => ({
  useExport: vi.fn(() => ({
    mutate: mockExportMutate,
    isPending: false,
  })),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc },
    createElement(MemoryRouter, { initialEntries: ['/documents/1/review'] },
      createElement(Routes, null,
        createElement(Route, { path: '/documents/:id/review', element: children })
      )
    )
  );
}

describe('Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders 3-panel HITL layout', () => {
    render(<Review />, { wrapper });
    expect(screen.getByText(/revisão: test\.pdf/i)).toBeInTheDocument();
    expect(screen.getByTestId('reasoning-panel')).toBeInTheDocument();
    expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('minuta-editor')).toBeInTheDocument();
    expect(screen.getByTestId('approval-bar')).toBeInTheDocument();
  });

  test('renders all three approval buttons', () => {
    render(<Review />, { wrapper });
    expect(screen.getByText('Aprovar')).toBeInTheDocument();
    expect(screen.getByText('Revisar')).toBeInTheDocument();
    expect(screen.getByText('Rejeitar')).toBeInTheDocument();
  });

  test('approve button calls review mutate with approved action', () => {
    render(<Review />, { wrapper });
    fireEvent.click(screen.getByText('Aprovar'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approved' }),
      expect.anything(),
    );
  });

  test('reject button calls review mutate with rejected action', () => {
    render(<Review />, { wrapper });
    fireEvent.click(screen.getByText('Rejeitar'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rejected' }),
      expect.anything(),
    );
  });

  test('revise button calls review mutate with revised action', () => {
    render(<Review />, { wrapper });
    fireEvent.click(screen.getByText('Revisar'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'revised' }),
      expect.anything(),
    );
  });

  test('comments textarea is available', () => {
    render(<Review />, { wrapper });
    const textarea = screen.getByPlaceholderText(/comentários/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Precisa revisão no item 3' } });
    expect(textarea).toHaveValue('Precisa revisão no item 3');
  });

  test('export button is NOT shown when status is not reviewed', () => {
    render(<Review />, { wrapper });
    expect(screen.queryByText('Exportar DOCX')).not.toBeInTheDocument();
  });
});
