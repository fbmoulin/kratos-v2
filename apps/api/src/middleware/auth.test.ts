import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }),
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test('rejects auth bypass when NODE_ENV=production even with TEST_USER_ID', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TEST_USER_ID', 'bypass-user');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/', { headers: {} });
    expect(res.status).toBe(401);
  });

  test('rejects auth bypass when NODE_ENV=staging', async () => {
    vi.stubEnv('NODE_ENV', 'staging');
    vi.stubEnv('TEST_USER_ID', 'bypass-user');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/', { headers: {} });
    expect(res.status).toBe(401);
  });

  test('allows auth bypass in development with TEST_USER_ID', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TEST_USER_ID', 'dev-user-456');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.userId).toBe('dev-user-456');
  });

  test('returns 401 when no Authorization header in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ ok: true }));

    const res = await app.request('/', { headers: {} });
    expect(res.status).toBe(401);
  });

  test('authenticates valid Bearer token', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.userId).toBe('user-123');
  });
});
