import { describe, test, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useDocuments } from './useDocuments';

vi.mock('@/lib/api', () => ({
  api: {
    documents: {
      list: vi.fn().mockResolvedValue({
        data: [
          { id: '1', fileName: 'test.pdf', status: 'completed', createdAt: '2026-01-01' },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      }),
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDocuments', () => {
  test('fetches documents list', async () => {
    const { result } = renderHook(() => useDocuments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].fileName).toBe('test.pdf');
  });
});
