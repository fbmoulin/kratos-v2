import { describe, test, expect } from 'vitest';
import { classifyComplexity, selectModel, type ComplexityInput } from './model-router.js';
import { AIModel } from '@kratos/core';

describe('classifyComplexity', () => {
  test('scores a simple short text as low complexity', () => {
    const input: ComplexityInput = {
      factLength: 200,
      questionCount: 1,
      pedidoCount: 1,
      domainSpecialization: 0.2,
      entityRichness: 2,
      multiParty: false,
      routerConfidence: 0.95,
    };
    const score = classifyComplexity(input);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(30);
  });

  test('scores a complex multi-party case as high complexity', () => {
    const input: ComplexityInput = {
      factLength: 5000,
      questionCount: 5,
      pedidoCount: 8,
      domainSpecialization: 0.9,
      entityRichness: 15,
      multiParty: true,
      routerConfidence: 0.4,
    };
    const score = classifyComplexity(input);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('scores a medium case in the middle range', () => {
    const input: ComplexityInput = {
      factLength: 1500,
      questionCount: 3,
      pedidoCount: 3,
      domainSpecialization: 0.5,
      entityRichness: 6,
      multiParty: false,
      routerConfidence: 0.7,
    };
    const score = classifyComplexity(input);
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThan(70);
  });
});

describe('selectModel', () => {
  test('score < 30 → Gemini Flash, no thinking', () => {
    const result = selectModel(20);
    expect(result.model).toBe(AIModel.GEMINI_FLASH);
    expect(result.thinking).toBeNull();
  });

  test('score 30-49 → Claude Sonnet, no thinking', () => {
    const result = selectModel(40);
    expect(result.model).toBe(AIModel.CLAUDE_SONNET);
    expect(result.thinking).toBeNull();
  });

  test('score 50-69 → Claude Sonnet + thinking 10K', () => {
    const result = selectModel(55);
    expect(result.model).toBe(AIModel.CLAUDE_SONNET);
    expect(result.thinking).toBe(10_000);
  });

  test('score 70-89 → Claude Opus + thinking 16K', () => {
    const result = selectModel(80);
    expect(result.model).toBe(AIModel.CLAUDE_OPUS);
    expect(result.thinking).toBe(16_000);
  });

  test('score 90+ → Claude Opus + thinking 32K', () => {
    const result = selectModel(95);
    expect(result.model).toBe(AIModel.CLAUDE_OPUS);
    expect(result.thinking).toBe(32_000);
  });
});
