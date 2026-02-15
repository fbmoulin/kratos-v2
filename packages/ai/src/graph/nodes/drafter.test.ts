import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';
import type { AgentStateType } from '../state.js';
import { createInitialState } from '../state.js';

// Mock providers
vi.mock('../../providers/anthropic.js', () => ({
  createAnthropicModel: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      content: '# I - RELATORIO\n\nMinuta completa de sentenca...\n\n# II - FUNDAMENTACAO\n\n...\n\n# III - DISPOSITIVO\n\n...',
      usage_metadata: { input_tokens: 2000, output_tokens: 1500 },
    }),
  }),
}));

const { drafterNode } = await import('./drafter.js');

describe('drafterNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeState(overrides?: Partial<AgentStateType>): AgentStateType {
    return {
      ...createInitialState({
        extractionId: 'ext-1',
        documentId: 'doc-1',
        userId: 'usr-1',
        rawText: 'SENTENCA. Vistos, etc. Autor celebrou contrato bancario com Banco X...',
      }),
      routerResult: {
        legalMatter: LegalMatter.CIVIL,
        decisionType: DecisionType.SENTENCA,
        complexity: 55,
        confidence: 0.88,
        selectedModel: AIModel.CLAUDE_SONNET,
        reasoning: 'Bancario civil case',
      },
      ragContext: {
        vectorResults: [{ content: 'Sumula 297/STJ', score: 0.9, source: 'stj' }],
        graphResults: [],
        fusedResults: [{ content: 'Sumula 297/STJ', score: 0.9, source: 'stj' }],
      },
      firacResult: {
        facts: 'Autor celebrou contrato bancario.',
        issue: 'Abusividade contratual.',
        rule: 'CDC Art. 51.',
        analysis: 'Clausulas abusivas identificadas.',
        conclusion: 'Parcial procedencia.',
      },
      ...overrides,
    };
  }

  test('produces draftResult from specialist prompt + XML input', async () => {
    const state = makeState();
    const result = await drafterNode(state);

    expect(result.draftResult).toBeDefined();
    expect(result.draftResult).toContain('RELATORIO');
    expect(result.currentStep).toBe('complete');
  });

  test('tracks token usage and latency', async () => {
    const state = makeState();
    const result = await drafterNode(state);

    expect(result.tokensInput).toBeGreaterThan(0);
    expect(result.tokensOutput).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('returns error state when model fails', async () => {
    const { createAnthropicModel } = await import('../../providers/anthropic.js');
    vi.mocked(createAnthropicModel).mockReturnValueOnce({
      invoke: vi.fn().mockRejectedValueOnce(new Error('API timeout')),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const state = makeState();
    const result = await drafterNode(state);

    expect(result.error).toContain('Drafter failed');
    expect(result.error).toContain('API timeout');
    expect(result.currentStep).toBe('error');
  });

  test('accumulates tokens from specialist node', async () => {
    const state = makeState({
      tokensInput: 1000,
      tokensOutput: 500,
    });
    const result = await drafterNode(state);

    // Drafter adds its own tokens on top
    expect(result.tokensInput).toBe(1000 + 2000);
    expect(result.tokensOutput).toBe(500 + 1500);
  });
});
