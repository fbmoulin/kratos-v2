import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_BASE_URL || '/v2';

async function fetchWithAuth(path: string, init?: RequestInit) {
  // getSession returns cached token; refreshSession handles expiry
  let { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }

  if (!session) throw new Error('Not authenticated');

  const headers: HeadersInit = {
    ...init?.headers,
    'Authorization': `Bearer ${session.access_token}`,
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
    getExport: (id: string) =>
      fetchWithAuth(`/documents/${id}/export`),
  },
};
