import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('mock') }),
    },
    storage: { from: () => ({ upload: vi.fn(), createSignedUrl: vi.fn(), getPublicUrl: vi.fn() }) },
  }),
}));

vi.mock('../services/storage.js', () => ({
  storageService: { uploadDocument: vi.fn(), getSignedUrl: vi.fn() },
}));

vi.mock('../services/queue.js', () => ({
  queueService: { enqueuePdfExtraction: vi.fn() },
}));

vi.mock('../services/document-repo.js', () => ({
  documentRepo: { listByUser: vi.fn(), getById: vi.fn(), create: vi.fn(), getExtraction: vi.fn() },
}));

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({ lpush: vi.fn() })),
}));

const { default: app } = await import('../index.js');

describe('Health routes', () => {
  test('GET /v2/health returns 200 with health info', async () => {
    const res = await app.request('/v2/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'healthy');
    expect(body).toHaveProperty('service', 'KRATOS v2');
    expect(body).toHaveProperty('version', '2.0.0');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');
  });

  test('GET /v2/health/ready returns 200 with checks', async () => {
    const res = await app.request('/v2/health/ready');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'ready');
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('redis');
    expect(body.checks).toHaveProperty('storage');
  });

  test('GET /v2 returns app info', async () => {
    const res = await app.request('/v2');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('name', 'KRATOS v2');
    expect(body).toHaveProperty('version', '2.0.0');
    expect(body).toHaveProperty('status', 'operational');
    expect(body).toHaveProperty('timestamp');
  });

  test('Health routes require no authentication', async () => {
    const res = await app.request('/v2/health');
    expect(res.status).toBe(200);
  });
});
