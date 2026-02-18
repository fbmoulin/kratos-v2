import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock pino before anything else
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock ioredis (imported by worker.ts at module level)
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    brpop: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
}));

// Mock @kratos/ai
const mockInvoke = vi.fn();
vi.mock('@kratos/ai', () => ({
  createAnalysisWorkflow: vi.fn(() => ({ invoke: mockInvoke })),
  createInitialState: vi.fn((input: Record<string, unknown>) => ({
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

// Mock @kratos/db
const mockValues = vi.fn().mockResolvedValue([{ id: 'analysis-1' }]);
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
const mockWhere = vi.fn().mockResolvedValue([{ id: 'doc-1' }]);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock('@kratos/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
  },
  analyses: { extractionId: 'analyses.extractionId' },
  documents: { id: 'documents.id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const { processAnalysisJob } = await import('./worker.js');

describe('processAnalysisJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set the default mock return values after clearAllMocks
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([{ id: 'analysis-1' }]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: 'doc-1' }]);
  });

  test('runs workflow, persists result, and updates document to completed', async () => {
    mockInvoke.mockResolvedValueOnce({
      firacResult: { facts: 'Fatos', issue: 'Questão', rule: 'CDC', analysis: 'Análise', conclusion: 'Conclusão' },
      draftResult: '# RELATORIO\nMinuta...',
      routerResult: { legalMatter: 'civil', reasoning: 'civil case' },
      modelUsed: 'claude-sonnet-4-5-20250929',
      tokensInput: 1000,
      tokensOutput: 500,
      error: null,
    });

    await processAnalysisJob({
      documentId: 'doc-1',
      userId: 'user-1',
      extractionId: 'ext-1',
      rawText: 'SENTENÇA. Vistos. Trata-se de ação civil...',
    });

    // Should persist analysis
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionId: 'ext-1',
        agentChain: 'supervisor→router→rag→specialist→drafter',
        modelUsed: 'claude-sonnet-4-5-20250929',
      }),
    );

    // Should update document status to completed
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });

  test('marks document as failed when workflow throws', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('LLM API rate limited'));

    await processAnalysisJob({
      documentId: 'doc-2',
      userId: 'user-1',
      extractionId: 'ext-2',
      rawText: 'Legal text...',
    });

    // Should NOT persist analysis
    expect(mockInsert).not.toHaveBeenCalled();

    // Should update document status to failed
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  test('persists correct result shape with all fields', async () => {
    mockInvoke.mockResolvedValueOnce({
      firacResult: { facts: 'F', issue: 'I', rule: 'R', analysis: 'A', conclusion: 'C' },
      draftResult: 'Draft text',
      routerResult: { legalMatter: 'bancario', reasoning: 'bank dispute' },
      modelUsed: 'gemini-2.5-flash',
      tokensInput: 2000,
      tokensOutput: 800,
      error: null,
    });

    await processAnalysisJob({
      documentId: 'doc-3',
      userId: 'user-2',
      extractionId: 'ext-3',
      rawText: 'Contrato bancário...',
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionId: 'ext-3',
        modelUsed: 'gemini-2.5-flash',
        tokensInput: 2000,
        tokensOutput: 800,
        resultJson: expect.objectContaining({
          firacResult: expect.objectContaining({ facts: 'F' }),
          draftResult: 'Draft text',
          routerResult: expect.objectContaining({ legalMatter: 'bancario' }),
        }),
      }),
    );
  });
});
