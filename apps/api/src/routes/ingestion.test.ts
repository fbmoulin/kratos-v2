import { describe, test, expect, vi, beforeEach } from 'vitest';

// Reuse same mock pattern as documents.test.ts
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      }),
    },
  }),
}));

vi.mock('../services/storage.js', () => ({
  storageService: {
    uploadDocument: vi.fn().mockResolvedValue({ path: 'test-user-id/doc-id/test.pdf' }),
    getSignedUrl: vi.fn().mockResolvedValue('https://signed-url'),
  },
}));

vi.mock('../services/trigger.js', () => ({
  triggerService: {
    enqueuePdfExtraction: vi.fn().mockResolvedValue(undefined),
    enqueueAnalysis: vi.fn().mockResolvedValue(undefined),
    enqueueDocxExport: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/document-repo.js', () => ({
  documentRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'new-doc-id',
      userId: 'test-user-id',
      fileName: 'test.pdf',
      filePath: 'test-user-id/new-doc-id/test.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'pending',
      pages: null,
      pdfHash: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    listByUser: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getById: vi.fn().mockResolvedValue(null),
    getExtraction: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue(null),
    findByHash: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../services/audit-repo.js', () => ({
  auditRepo: {
    create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  },
}));

vi.mock('../services/analysis-repo.js', () => ({
  analysisRepo: {
    create: vi.fn(),
    getByExtractionId: vi.fn().mockResolvedValue(null),
    updateResultJson: vi.fn(),
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('@kratos/ai', () => ({
  createAnalysisWorkflow: vi.fn(),
  createInitialState: vi.fn(),
}));

vi.mock('@kratos/db', () => ({
  db: { execute: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

const { default: app } = await import('../index.js');

// Helper: create a minimal valid PDF buffer encoded as base64
function makePdfBase64(): string {
  const header = Buffer.from('%PDF-1.4 minimal content for testing');
  return header.toString('base64');
}

describe('Ingestion routes', () => {
  const authHeader = { Authorization: 'Bearer test-token' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('POST /v2/ingest with base64 creates document and enqueues extraction', async () => {
    const { triggerService } = await import('../services/trigger.js');
    const { auditRepo } = await import('../services/audit-repo.js');

    const res = await app.request('/v2/ingest', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'lex-intelligentia',
        pdfBase64: makePdfBase64(),
        fileName: 'processo.pdf',
        metadata: { numeroProcesso: '0001234-56.2024.8.08.0001' },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toHaveProperty('id');
    expect(vi.mocked(triggerService.enqueuePdfExtraction)).toHaveBeenCalled();
    expect(vi.mocked(auditRepo.create)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ingest' }),
    );
  });

  test('POST /v2/ingest with duplicate hash returns existing doc', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.findByHash).mockResolvedValueOnce({
      id: 'existing-doc',
      userId: 'test-user-id',
      fileName: 'original.pdf',
      filePath: 'test-user-id/existing-doc/original.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'completed',
      pages: 5,
      pdfHash: 'abc123',
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.request('/v2/ingest', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'api',
        pdfBase64: makePdfBase64(),
        fileName: 'duplicate.pdf',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deduplicated).toBe(true);
    expect(body.data.id).toBe('existing-doc');
  });

  test('POST /v2/ingest rejects missing PDF payload', async () => {
    const res = await app.request('/v2/ingest', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'api',
        fileName: 'test.pdf',
        // No pdfBase64 or pdfUrl
      }),
    });

    expect(res.status).toBe(400);
  });

  test('POST /v2/ingest rejects invalid base64 that is not a PDF', async () => {
    const res = await app.request('/v2/ingest', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'api',
        pdfBase64: Buffer.from('not a pdf file').toString('base64'),
        fileName: 'fake.pdf',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('not a valid PDF');
  });
});
