import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

import { ChatAnthropic } from '@langchain/anthropic';
import { specialistNode } from './specialist.js';
import { createInitialState } from '../state.js';
import type { AgentStateType } from '../state.js';

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  vi.mocked(ChatAnthropic).mockImplementation(() => ({
    invoke: mockInvoke,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);
});

function stateWithRouter(): AgentStateType {
  return {
    ...createInitialState({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'usr-1',
      rawText: 'SENTENÇA. Vistos. Trata-se de ação ordinária...',
    }),
    routerResult: {
      legalMatter: LegalMatter.CIVIL,
      decisionType: DecisionType.SENTENCA,
      complexity: 45,
      confidence: 0.9,
      selectedModel: AIModel.CLAUDE_SONNET,
      reasoning: 'Civil sentence',
    },
    ragContext: {
      vectorResults: [{ content: 'Súmula 297 STJ', score: 0.92, source: 'stj' }],
      graphResults: [],
      fusedResults: [{ content: 'Súmula 297 STJ', score: 0.92, source: 'stj' }],
    },
  };
}

describe('specialistNode', () => {
  test('generates FIRAC analysis and tracks token usage', async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        facts: 'O autor celebrou contrato bancário...',
        issue: 'Se há abusividade nas cláusulas contratuais',
        rule: 'CDC Art. 51, Súmula 297 STJ',
        analysis: 'Aplicando o CDC ao contrato bancário...',
        conclusion: 'Procedente o pedido de revisão contratual',
        confidence: 0.88,
        reasoning_trace: 'Análise baseada em precedentes do STJ',
      }),
      usage_metadata: {
        input_tokens: 1500,
        output_tokens: 800,
      },
    });

    const state = stateWithRouter();
    const result = await specialistNode(state);

    expect(result.firacResult).toBeDefined();
    expect(result.firacResult!.facts).toContain('contrato bancário');
    expect(result.firacResult!.issue).toBeTruthy();
    expect(result.firacResult!.rule).toContain('CDC');
    expect(result.firacResult!.analysis).toBeTruthy();
    expect(result.firacResult!.conclusion).toBeTruthy();
    expect(result.currentStep).toBe('drafter'); // BUG FIX #2: routes to drafter, not complete
    expect(result.modelUsed).toBe(AIModel.CLAUDE_SONNET);
    expect(result.tokensInput).toBe(1500);
    expect(result.tokensOutput).toBe(800);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('returns error state when LLM call fails', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const state = stateWithRouter();
    const result = await specialistNode(state);

    expect(result.error).toContain('Rate limit exceeded');
    expect(result.currentStep).toBe('error');
  });
});
