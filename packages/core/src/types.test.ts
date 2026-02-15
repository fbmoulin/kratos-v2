import { describe, test, expect } from 'vitest';
import {
  DecisionType,
  LegalMatter,
  AIModel,
  DocumentStatus,
  UserRole,
  ReviewAction,
  type RouterResult,
  type RAGContext,
} from './index.js';

describe('DecisionType enum', () => {
  test('has all four decision types', () => {
    expect(DecisionType.LIMINAR).toBe('liminar');
    expect(DecisionType.SENTENCA).toBe('sentenca');
    expect(DecisionType.DESPACHO).toBe('despacho');
    expect(DecisionType.ACORDAO).toBe('acordao');
  });

  test('enum has exactly 4 values', () => {
    const values = Object.values(DecisionType);
    expect(values).toHaveLength(4);
  });
});

describe('Existing enums remain intact', () => {
  test('LegalMatter values', () => {
    expect(LegalMatter.CIVIL).toBe('civil');
    expect(LegalMatter.CRIMINAL).toBe('criminal');
    expect(LegalMatter.LABOR).toBe('labor');
    expect(LegalMatter.TAX).toBe('tax');
  });

  test('AIModel values', () => {
    expect(AIModel.GEMINI_FLASH).toBe('gemini-2.5-flash');
    expect(AIModel.CLAUDE_SONNET).toBe('claude-sonnet-4');
    expect(AIModel.CLAUDE_OPUS).toBe('claude-opus-4');
  });

  test('DocumentStatus values', () => {
    expect(Object.values(DocumentStatus)).toHaveLength(4);
  });

  test('UserRole values', () => {
    expect(Object.values(UserRole)).toHaveLength(3);
  });

  test('ReviewAction values', () => {
    expect(Object.values(ReviewAction)).toHaveLength(3);
  });
});

describe('Phase 2 type shapes', () => {
  test('RouterResult is assignable', () => {
    const result: RouterResult = {
      legalMatter: LegalMatter.CIVIL,
      decisionType: DecisionType.SENTENCA,
      complexity: 65,
      confidence: 0.92,
      selectedModel: AIModel.CLAUDE_SONNET,
      reasoning: 'Standard civil case',
    };
    expect(result.complexity).toBe(65);
  });

  test('RAGContext is assignable', () => {
    const ctx: RAGContext = {
      vectorResults: [{ content: 'test', score: 0.95, source: 'stj' }],
      graphResults: [{ content: 'test', score: 0.8, path: ['e1', 'e2'] }],
      fusedResults: [{ content: 'test', score: 0.9, source: 'stj' }],
    };
    expect(ctx.fusedResults).toHaveLength(1);
  });
});
