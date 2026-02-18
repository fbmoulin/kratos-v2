import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const MAX_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useExport(documentId: string) {
  return useMutation({
    mutationFn: async () => {
      const popup = window.open('', '_blank');
      await api.documents.exportDocx(documentId);

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const res = await api.documents.getExport(documentId);
          const url = res?.data?.url as string | undefined;
          if (url) {
            if (popup) {
              popup.location.href = url;
            } else {
              window.location.href = url;
            }
            return url;
          }
        } catch (err) {
          if (attempt === MAX_ATTEMPTS) throw err;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error('DOCX export timed out');
    },
  });
}
