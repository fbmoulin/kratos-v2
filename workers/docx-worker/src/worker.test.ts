import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('@kratos/db', () => ({
  db: {
    select: mockSelect,
  },
  documents: { id: 'documents.id' },
  extractions: { documentId: 'extractions.documentId', id: 'extractions.id' },
  analyses: { extractionId: 'analyses.extractionId', createdAt: 'analyses.createdAt' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  desc: vi.fn((col: unknown) => col),
}));

vi.mock('@kratos/tools', () => ({
  buildDocxBuffer: vi.fn().mockResolvedValue(Buffer.from('docx-content')),
}));

const { processDocxJob } = await import('./worker.js');

describe('processDocxJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
  });

  test('uploads DOCX when draft is available', async () => {
    const queue = [
      [{ id: 'doc-1', userId: 'user-1', fileName: 'case.pdf', status: 'reviewed' }],
      [{ id: 'ext-1', documentId: 'doc-1' }],
      [{ id: 'analysis-1', extractionId: 'ext-1', resultJson: { draftResult: 'Hello' }, createdAt: new Date() }],
    ];
    mockLimit.mockImplementation(() => Promise.resolve(queue.shift() ?? []));

    const upload = vi.fn().mockResolvedValue({ error: null });
    const supabase = { storage: { from: vi.fn(() => ({ upload })) } };

    await processDocxJob(
      { documentId: 'doc-1', userId: 'user-1', fileName: 'case.docx' },
      supabase as unknown as never,
    );

    expect(upload).toHaveBeenCalledWith(
      'user-1/doc-1/case.docx',
      expect.any(Buffer),
      expect.objectContaining({ contentType: expect.stringContaining('officedocument') }),
    );
  });

  test('does not upload when draft is missing', async () => {
    const queue = [
      [{ id: 'doc-2', userId: 'user-2', fileName: 'case.pdf', status: 'reviewed' }],
      [{ id: 'ext-2', documentId: 'doc-2' }],
      [{ id: 'analysis-2', extractionId: 'ext-2', resultJson: {}, createdAt: new Date() }],
    ];
    mockLimit.mockImplementation(() => Promise.resolve(queue.shift() ?? []));

    const upload = vi.fn().mockResolvedValue({ error: null });
    const supabase = { storage: { from: vi.fn(() => ({ upload })) } };

    await processDocxJob(
      { documentId: 'doc-2', userId: 'user-2', fileName: 'case.docx' },
      supabase as unknown as never,
    );

    expect(upload).not.toHaveBeenCalled();
  });
});
