import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Document } from '@kratos/core';

interface DocumentsResponse {
  data: Document[];
  pagination: { page: number; limit: number; total: number };
}

export function useDocuments(params?: { status?: string; page?: number }) {
  return useQuery<DocumentsResponse>({
    queryKey: ['documents', params],
    queryFn: () => api.documents.list(params),
    refetchInterval: (query) => {
      const docs = query.state.data?.data;
      const hasProcessing = docs?.some((d) => d.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.documents.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.documents.get(id),
    enabled: !!id,
  });
}
