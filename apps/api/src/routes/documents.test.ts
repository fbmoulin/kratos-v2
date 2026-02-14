import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing app
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
        createSignedUrl: vi.fn(),
        getPublicUrl: vi.fn(),
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

vi.mock('../services/queue.js', () => ({
  queueService: {
    enqueuePdfExtraction: vi.fn().mockResolvedValue(undefined),
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
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    listByUser: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    getById: vi.fn().mockResolvedValue(null),
    getExtraction: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    lpush: vi.fn().mockResolvedValue(1),
  })),
}));

const { default: app } = await import('../index.js');

describe('Document routes', () => {
  const authHeader = { Authorization: 'Bearer test-token' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('GET /v2/documents returns 401 without auth', async () => {
    const res = await app.request('/v2/documents');
    expect(res.status).toBe(401);
  });

  test('POST /v2/documents accepts multipart PDF and returns 201', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['%PDF-1.4 fake content'], { type: 'application/pdf' }),
      'peticao.pdf',
    );

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('fileName', 'test.pdf');
    expect(body.data).toHaveProperty('status', 'pending');
  });

  test('POST /v2/documents rejects non-PDF file', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['hello'], { type: 'text/plain' }),
      'readme.txt',
    );

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('PDF');
  });

  test('POST /v2/documents rejects missing file', async () => {
    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: new FormData(),
    });

    expect(res.status).toBe(400);
  });

  test('POST /v2/documents rejects file over 50MB', async () => {
    const formData = new FormData();
    const bigBlob = new Blob([new Uint8Array(51 * 1024 * 1024)], {
      type: 'application/pdf',
    });
    formData.append('file', bigBlob, 'huge.pdf');

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  test('GET /v2/documents returns paginated list from DB', async () => {
    const res = await app.request('/v2/documents', { headers: authHeader });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page', 1);
    expect(body.pagination).toHaveProperty('limit', 20);
    expect(body.pagination).toHaveProperty('total');
  });

  test('GET /v2/documents/:id returns 404 for non-existent doc', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce(null);

    const res = await app.request('/v2/documents/nonexistent', {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
  });

  test('GET /v2/documents/:id returns document when found', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce({
      id: 'doc-1',
      userId: 'test-user-id',
      fileName: 'found.pdf',
      filePath: 'test-user-id/doc-1/found.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      status: 'completed',
      pages: 5,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.request('/v2/documents/doc-1', {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('doc-1');
    expect(body.data.fileName).toBe('found.pdf');
  });

  test('GET /v2/documents/:id/extraction returns extraction data', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce({
      id: 'doc-1',
      userId: 'test-user-id',
      fileName: 'test.pdf',
      filePath: 'path',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'completed',
      pages: 3,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(documentRepo.getExtraction).mockResolvedValueOnce({
      id: 'ext-1',
      documentId: 'doc-1',
      contentJson: { text: 'extracted content' },
      extractionMethod: 'docling+pdfplumber',
      rawText: 'raw text here',
      tablesCount: 2,
      imagesCount: 0,
      createdAt: new Date(),
    });

    const res = await app.request('/v2/documents/doc-1/extraction', {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.contentJson.text).toBe('extracted content');
  });

  test('GET /v2/documents/:id/extraction returns 404 when not ready', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce({
      id: 'doc-1',
      userId: 'test-user-id',
      fileName: 'test.pdf',
      filePath: 'path',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'pending',
      pages: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(documentRepo.getExtraction).mockResolvedValueOnce(null);

    const res = await app.request('/v2/documents/doc-1/extraction', {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
  });
});
