import { describe, test, expect, vi } from 'vitest';

// Mock Supabase before importing app
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
  }),
}));

// Import app after mocks are set up
const { default: app } = await import('../index.js');

describe('Document routes', () => {
  const authHeader = { Authorization: 'Bearer test-token' };

  test('GET /v2/documents returns 401 without auth', async () => {
    const res = await app.request('/v2/documents');
    expect(res.status).toBe(401);
  });

  test('GET /v2/documents returns list structure with auth', async () => {
    const res = await app.request('/v2/documents', { headers: authHeader });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('POST /v2/documents with valid body returns 201', async () => {
    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'test.pdf', fileSize: 1024 }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('fileName', 'test.pdf');
    expect(body).toHaveProperty('fileSize', 1024);
    expect(body).toHaveProperty('status', 'pending');
  });

  test('POST /v2/documents with invalid body returns 400', async () => {
    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: '' }),
    });
    expect(res.status).toBe(400);
  });

  test('GET /v2/documents/:id returns document shape', async () => {
    const res = await app.request('/v2/documents/some-uuid', { headers: authHeader });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('id', 'some-uuid');
    expect(body).toHaveProperty('status');
  });
});
