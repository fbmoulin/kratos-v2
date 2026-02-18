import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock all service dependencies before importing router
vi.mock('../services/storage.js', () => ({
  storageService: {
    uploadDocument: vi.fn().mockResolvedValue({ path: 'user/doc/file.pdf' }),
  },
}));

vi.mock('../services/queue.js', () => ({
  queueService: {
    enqueuePdfExtraction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/document-repo.js', () => ({
  documentRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'doc-123',
      userId: 'user-123',
      fileName: 'test.pdf',
      filePath: 'user/doc/test.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'pending',
    }),
    listByUser: vi.fn(),
    getById: vi.fn(),
    getExtraction: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../services/analysis-repo.js', () => ({
  analysisRepo: { create: vi.fn(), getByExtractionId: vi.fn(), updateResultJson: vi.fn() },
}));

vi.mock('../services/audit-repo.js', () => ({
  auditRepo: { create: vi.fn() },
}));

vi.mock('@kratos/ai', () => ({
  createAnalysisWorkflow: vi.fn(),
  createInitialState: vi.fn(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

import { Hono } from 'hono';
import { documentsRouter } from './documents.js';

function createApp() {
  const app = new Hono();
  // Simulate auth middleware setting userId
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-123');
    await next();
  });
  app.route('/documents', documentsRouter);
  return app;
}

// Helper to create a file with specific bytes
function makeFile(bytes: number[], name: string, type = 'application/pdf'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

// Valid %PDF- header bytes
const VALID_PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]; // %PDF-1.4

describe('PDF upload validation', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  test('rejects file with wrong magic bytes (fake PDF)', async () => {
    const form = new FormData();
    form.append('file', makeFile([0x00, 0x00, 0x00, 0x00, 0x00], 'fake.pdf'));

    const res = await app.request('/documents', { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('not a valid PDF');
  });

  test('rejects file that is too short for magic bytes', async () => {
    const form = new FormData();
    form.append('file', makeFile([0x25, 0x50], 'short.pdf'));

    const res = await app.request('/documents', { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('not a valid PDF');
  });

  test('accepts file with valid PDF magic bytes', async () => {
    const form = new FormData();
    form.append('file', makeFile(VALID_PDF_HEADER, 'valid.pdf'));

    const res = await app.request('/documents', { method: 'POST', body: form });
    expect(res.status).toBe(201);
  });

  test('sanitizes filename — removes special characters', async () => {
    const { storageService } = await import('../services/storage.js');
    const form = new FormData();
    form.append('file', makeFile(VALID_PDF_HEADER, '../../../etc/passwd.pdf'));

    const res = await app.request('/documents', { method: 'POST', body: form });
    expect(res.status).toBe(201);

    // Verify the sanitized name was used (no path traversal chars)
    const uploadCall = vi.mocked(storageService.uploadDocument).mock.calls[0][0];
    expect(uploadCall.fileName).not.toContain('..');
    expect(uploadCall.fileName).not.toContain('/');
    expect(uploadCall.fileName).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  test('rejects non-PDF MIME type', async () => {
    const form = new FormData();
    form.append('file', makeFile(VALID_PDF_HEADER, 'test.exe', 'application/octet-stream'));

    const res = await app.request('/documents', { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('Only PDF files');
  });
});
