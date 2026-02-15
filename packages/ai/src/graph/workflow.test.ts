import { describe, test, expect, vi } from 'vitest';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

// Mock all external dependencies that nodes use
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        legalMatter: 'civil',
        decisionType: 'sentenca',
        complexity: 45,
        confidence: 0.9,
        reasoning: 'Civil case',
      }),
    }),
  })),
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        facts: 'Fatos do caso',
        issue: 'Questão jurídica',
        rule: 'CDC Art. 51',
        analysis: 'Aplicação da norma',
        conclusion: 'Procedente',
        confidence: 0.88,
        reasoning_trace: 'Raciocínio',
      }),
      usage_metadata: { input_tokens: 1000, output_tokens: 500 },
    }),
  })),
}));

vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
  })),
}));

vi.mock('@kratos/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('drizzle-orm', () => {
  const makeSql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const obj = { strings, values, getSQL: () => obj, queryChunks: [] };
    return obj;
  };
  makeSql.raw = (s: string) => s;
  return { sql: makeSql };
});

import { createAnalysisWorkflow } from './workflow.js';
import { createInitialState } from './state.js';

describe('createAnalysisWorkflow', () => {
  test('compiles a runnable workflow graph', () => {
    const workflow = createAnalysisWorkflow();
    expect(workflow).toBeDefined();
    expect(typeof workflow.invoke).toBe('function');
  });
});
