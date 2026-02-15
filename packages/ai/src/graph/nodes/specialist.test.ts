import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { specialistNode } from './specialist.js';
import { createInitialState } from '../state.js';
import type { AgentStateType } from '../state.js';

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  vi.mocked(ChatAnthropic).mockReset();
  vi.mocked(ChatAnthropic).mockImplementation(() => ({
    invoke: mockInvoke,
  }) as any);
  vi.mocked(ChatGoogleGenerativeAI).mockReset();
  vi.mocked(ChatGoogleGenerativeAI).mockImplementation(() => ({
    invoke: mockInvoke,
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
    expect(result.currentStep).toBe('complete');
    expect(result.modelUsed).toBe('claude-sonnet-4-5-20250929');
    expect(result.tokensInput).toBe(1500);
    expect(result.tokensOutput).toBe(800);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('uses Gemini model for low-complexity cases (< 30)', async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        facts: 'Fatos simples.',
        issue: 'Questão processual.',
        rule: 'CPC Art. 330.',
        analysis: 'Caso simples de despacho.',
        conclusion: 'Indeferido.',
      }),
      usage_metadata: { input_tokens: 500, output_tokens: 300 },
    });

    const state: AgentStateType = {
      ...createInitialState({
        extractionId: 'ext-2',
        documentId: 'doc-2',
        userId: 'usr-2',
        rawText: 'DESPACHO. Indefiro o pedido.',
      }),
      routerResult: {
        legalMatter: LegalMatter.CIVIL,
        decisionType: DecisionType.DESPACHO,
        complexity: 15,
        confidence: 0.95,
        selectedModel: AIModel.GEMINI_FLASH,
        reasoning: 'Simple procedural dispatch',
      },
      ragContext: {
        vectorResults: [],
        graphResults: [],
        fusedResults: [],
      },
    };

    const result = await specialistNode(state);

    expect(result.firacResult).toBeDefined();
    expect(result.currentStep).toBe('complete');
    expect(result.modelUsed).toBe(AIModel.GEMINI_FLASH);
    // Gemini provider should be used, not Anthropic
    expect(ChatGoogleGenerativeAI).toHaveBeenCalled();
    expect(ChatAnthropic).not.toHaveBeenCalled();
  });

  test('returns error state when LLM call fails', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const state = stateWithRouter();
    const result = await specialistNode(state);

    expect(result.error).toContain('Rate limit exceeded');
    expect(result.currentStep).toBe('error');
  });
});
