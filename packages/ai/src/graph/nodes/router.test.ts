import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { routerNode } from './router.js';
import { createInitialState } from '../state.js';

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  vi.mocked(ChatGoogleGenerativeAI).mockImplementation(() => ({
    invoke: mockInvoke,
  }) as any);
});

describe('routerNode', () => {
  test('classifies document and returns routerResult with model selection', async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        legalMatter: 'civil',
        decisionType: 'sentenca',
        complexity: 45,
        confidence: 0.92,
        reasoning: 'Ação civil ordinária com pedido de indenização',
      }),
    });

    const state = createInitialState({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'usr-1',
      rawText: 'SENTENÇA. Vistos. Trata-se de ação civil...',
    });

    const result = await routerNode(state);

    expect(result.routerResult).toBeDefined();
    expect(result.routerResult!.legalMatter).toBe(LegalMatter.CIVIL);
    expect(result.routerResult!.decisionType).toBe(DecisionType.SENTENCA);
    // Model selection depends on computed complexity score
    expect(Object.values(AIModel)).toContain(result.routerResult!.selectedModel);
    expect(result.routerResult!.complexity).toBeGreaterThanOrEqual(0);
    expect(result.routerResult!.complexity).toBeLessThanOrEqual(100);
    expect(result.currentStep).toBe('rag');
  });

  test('updates currentStep to rag after successful classification', async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        legalMatter: 'labor',
        decisionType: 'liminar',
        complexity: 25,
        confidence: 0.88,
        reasoning: 'Pedido de tutela antecipada trabalhista',
      }),
    });

    const state = createInitialState({
      extractionId: 'ext-2',
      documentId: 'doc-2',
      userId: 'usr-1',
      rawText: 'DECISÃO INTERLOCUTÓRIA. Defiro a liminar...',
    });

    const result = await routerNode(state);

    expect(result.currentStep).toBe('rag');
    expect(result.routerResult!.selectedModel).toBe(AIModel.GEMINI_FLASH);
  });

  test('returns error state when LLM call fails', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('API quota exceeded'));

    const state = createInitialState({
      extractionId: 'ext-3',
      documentId: 'doc-3',
      userId: 'usr-1',
      rawText: 'Texto qualquer...',
    });

    const result = await routerNode(state);

    expect(result.error).toContain('API quota exceeded');
    expect(result.currentStep).toBe('error');
  });
});
