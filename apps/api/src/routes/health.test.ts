import { describe, test, expect, vi } from 'vitest';
import { APP_VERSION } from '@kratos/core';

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

vi.mock('../services/analysis-repo.js', () => ({
  analysisRepo: { create: vi.fn(), getByExtractionId: vi.fn(), updateResultJson: vi.fn() },
}));

vi.mock('@kratos/ai', () => ({
  createAnalysisWorkflow: vi.fn(),
  createInitialState: vi.fn(),
}));

const { default: app } = await import('../index.js');

describe('Health routes', () => {
  test('GET /v2/health returns 200 with health info', async () => {
    const res = await app.request('/v2/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'healthy');
    expect(body).toHaveProperty('service', 'KRATOS v2');
    expect(body).toHaveProperty('version', APP_VERSION);
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');
  });

  test('GET /v2/health/ready returns checks with degraded status when deps unavailable', async () => {
    const res = await app.request('/v2/health/ready');

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('redis');
    expect(body).toHaveProperty('version', APP_VERSION);
    expect(body).toHaveProperty('uptime');
  });

  test('GET /v2/health/metrics returns metrics', async () => {
    const res = await app.request('/v2/health/metrics');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('requestCount');
    expect(body).toHaveProperty('errorCount');
    expect(body).toHaveProperty('errorRate');
    expect(body).toHaveProperty('avgResponseTimeMs');
    expect(body).toHaveProperty('uptimeSeconds');
    expect(body).toHaveProperty('startedAt');
  });

  test('GET /v2 returns app info', async () => {
    const res = await app.request('/v2');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('name', 'KRATOS v2');
    expect(body).toHaveProperty('version', APP_VERSION);
    expect(body).toHaveProperty('status', 'operational');
    expect(body).toHaveProperty('timestamp');
  });

  test('Health routes require no authentication', async () => {
    const res = await app.request('/v2/health');
    expect(res.status).toBe(200);
  });
});
