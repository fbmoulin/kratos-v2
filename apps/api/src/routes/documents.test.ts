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
    enqueueAnalysis: vi.fn().mockResolvedValue(undefined),
  },
  redisClient: { quit: vi.fn().mockResolvedValue('OK') },
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
    updateStatus: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../services/audit-repo.js', () => ({
  auditRepo: {
    create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    lpush: vi.fn().mockResolvedValue(1),
  })),
}));

vi.mock('../services/analysis-repo.js', () => ({
  analysisRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'analysis-1',
      extractionId: 'ext-1',
      agentChain: 'supervisor→router→rag→specialist',
      resultJson: {},
      modelUsed: 'claude-sonnet-4-5-20250929',
      tokensInput: 1000,
      tokensOutput: 500,
      latencyMs: 3000,
      createdAt: new Date(),
    }),
    getByExtractionId: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@kratos/ai', () => ({
  createAnalysisWorkflow: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'test-user-id',
      rawText: 'texto',
      currentStep: 'complete',
      routerResult: {
        legalMatter: 'civil',
        decisionType: 'sentenca',
        complexity: 45,
        confidence: 0.9,
        selectedModel: 'claude-sonnet-4-5-20250929',
        reasoning: 'Civil case',
      },
      ragContext: { vectorResults: [], graphResults: [], fusedResults: [] },
      firacResult: {
        facts: 'Fatos do caso',
        issue: 'Questão jurídica',
        rule: 'CDC Art. 51',
        analysis: 'Análise',
        conclusion: 'Conclusão',
      },
      draftResult: '# I - RELATORIO\n\nMinuta completa...',
      modelUsed: 'claude-sonnet-4-5-20250929',
      tokensInput: 1000,
      tokensOutput: 500,
      latencyMs: 3000,
      error: null,
    }),
  }),
  createInitialState: vi.fn().mockImplementation((input: Record<string, unknown>) => ({
    ...input,
    currentStep: 'router',
    routerResult: null,
    ragContext: null,
    firacResult: null,
    draftResult: null,
    modelUsed: null,
    tokensInput: 0,
    tokensOutput: 0,
    latencyMs: 0,
    error: null,
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
    const bigContent = new Uint8Array(51 * 1024 * 1024);
    // Set PDF magic bytes so it doesn't fail on content check first
    bigContent[0] = 0x25; bigContent[1] = 0x50; bigContent[2] = 0x44; bigContent[3] = 0x46;
    const bigBlob = new Blob([bigContent], { type: 'application/pdf' });
    formData.append('file', bigBlob, 'huge.pdf');

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  test('POST /v2/documents rejects file with invalid magic bytes', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['not a real pdf'], { type: 'application/pdf' }),
      'fake.pdf',
    );

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('not a valid PDF');
  });

  test('POST /v2/documents sanitizes filename', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['%PDF-1.4 content'], { type: 'application/pdf' }),
      '../../../etc/passwd.pdf',
    );

    const res = await app.request('/v2/documents', {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    // Filename should be sanitized — no path traversal chars
    expect(body.data.fileName).not.toContain('..');
    expect(body.data.fileName).not.toContain('/');
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

  // ---- POST /:id/analyze ----

  test('POST /v2/documents/:id/analyze enqueues analysis and returns 202', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    const { queueService } = await import('../services/queue.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce({
      id: 'doc-1',
      userId: 'test-user-id',
      fileName: 'processo.pdf',
      filePath: 'path',
      fileSize: 2048,
      mimeType: 'application/pdf',
      status: 'completed',
      pages: 10,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(documentRepo.getExtraction).mockResolvedValueOnce({
      id: 'ext-1',
      documentId: 'doc-1',
      contentJson: { text: 'Conteúdo extraído' },
      extractionMethod: 'docling+pdfplumber',
      rawText: 'SENTENÇA. Vistos. Trata-se de ação civil...',
      tablesCount: 0,
      imagesCount: 0,
      createdAt: new Date(),
    });

    const res = await app.request('/v2/documents/doc-1/analyze', {
      method: 'POST',
      headers: authHeader,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.data.documentId).toBe('doc-1');
    expect(body.data.status).toBe('processing');
    expect(body.data.message).toContain('queued');
    expect(vi.mocked(documentRepo.updateStatus)).toHaveBeenCalledWith('test-user-id', 'doc-1', 'processing');
    expect(vi.mocked(queueService.enqueueAnalysis)).toHaveBeenCalledWith({
      documentId: 'doc-1',
      userId: 'test-user-id',
      extractionId: 'ext-1',
      rawText: 'SENTENÇA. Vistos. Trata-se de ação civil...',
    });
  });

  test('POST /v2/documents/:id/analyze returns 404 for non-existent document', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce(null);

    const res = await app.request('/v2/documents/nonexistent/analyze', {
      method: 'POST',
      headers: authHeader,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toContain('not found');
  });

  test('POST /v2/documents/:id/analyze returns 400 when extraction not ready', async () => {
    const { documentRepo } = await import('../services/document-repo.js');
    vi.mocked(documentRepo.getById).mockResolvedValueOnce({
      id: 'doc-1',
      userId: 'test-user-id',
      fileName: 'pending.pdf',
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

    const res = await app.request('/v2/documents/doc-1/analyze', {
      method: 'POST',
      headers: authHeader,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('Extraction not available');
  });
});
