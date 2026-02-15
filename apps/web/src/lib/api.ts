import { supabase } from './supabase';

const BASE = '/v2';

async function fetchWithAuth(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    ...init?.headers,
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
  if (!(init?.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  documents: {
    list: (params?: { status?: string; page?: number }) =>
      fetchWithAuth(`/documents?${new URLSearchParams(params as Record<string, string>).toString()}`),
    get: (id: string) => fetchWithAuth(`/documents/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return fetchWithAuth('/documents', { method: 'POST', body: form });
    },
    analyze: (id: string) =>
      fetchWithAuth(`/documents/${id}/analyze`, { method: 'POST' }),
    review: (id: string, payload: { action: string; comments: string; revisedContent?: Record<string, unknown> }) =>
      fetchWithAuth(`/documents/${id}/review`, { method: 'PUT', body: JSON.stringify(payload) }),
    exportDocx: (id: string) =>
      fetchWithAuth(`/documents/${id}/export`, { method: 'POST' }),
  },
};
