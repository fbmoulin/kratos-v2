import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useExport(documentId: string) {
  return useMutation({
    mutationFn: () => api.documents.exportDocx(documentId),
  });
}
