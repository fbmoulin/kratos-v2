import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ReviewPayload {
  action: string;
  comments: string;
  revisedContent?: Record<string, unknown>;
}

export function useReview(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewPayload) => api.documents.review(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
