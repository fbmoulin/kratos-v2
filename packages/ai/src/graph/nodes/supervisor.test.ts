import { describe, test, expect } from 'vitest';
import { supervisorDecision } from './supervisor.js';
import { createInitialState } from '../state.js';
import type { AgentStateType } from '../state.js';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

describe('supervisorDecision', () => {
  test('routes to "router" when state has no routerResult', () => {
    const state = createInitialState({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'usr-1',
      rawText: 'Texto juridico...',
    });

    expect(supervisorDecision(state)).toBe('router');
  });

  test('routes to "complete" when firacResult is present', () => {
    const state: AgentStateType = {
      ...createInitialState({
        extractionId: 'ext-1',
        documentId: 'doc-1',
        userId: 'usr-1',
        rawText: 'Texto juridico...',
      }),
      routerResult: {
        legalMatter: LegalMatter.CIVIL,
        decisionType: DecisionType.SENTENCA,
        complexity: 45,
        confidence: 0.9,
        selectedModel: AIModel.CLAUDE_SONNET,
        reasoning: 'Standard civil',
      },
      ragContext: {
        vectorResults: [],
        graphResults: [],
        fusedResults: [],
      },
      firacResult: {
        facts: 'Fatos',
        issue: 'Questao',
        rule: 'Regra',
        analysis: 'Analise',
        conclusion: 'Conclusao',
      },
    };

    expect(supervisorDecision(state)).toBe('complete');
  });

  test('routes to "error" when error is present', () => {
    const state: AgentStateType = {
      ...createInitialState({
        extractionId: 'ext-1',
        documentId: 'doc-1',
        userId: 'usr-1',
        rawText: 'Texto juridico...',
      }),
      error: 'Something went wrong',
    };

    expect(supervisorDecision(state)).toBe('error');
  });

  test('routes to "rag" when routerResult present but no ragContext', () => {
    const state: AgentStateType = {
      ...createInitialState({
        extractionId: 'ext-1',
        documentId: 'doc-1',
        userId: 'usr-1',
        rawText: 'Texto juridico...',
      }),
      routerResult: {
        legalMatter: LegalMatter.LABOR,
        decisionType: DecisionType.LIMINAR,
        complexity: 30,
        confidence: 0.85,
        selectedModel: AIModel.CLAUDE_SONNET,
        reasoning: 'Labor injunction',
      },
    };

    expect(supervisorDecision(state)).toBe('rag');
  });

  test('routes to "specialist" when routerResult and ragContext present', () => {
    const state: AgentStateType = {
      ...createInitialState({
        extractionId: 'ext-1',
        documentId: 'doc-1',
        userId: 'usr-1',
        rawText: 'Texto juridico...',
      }),
      routerResult: {
        legalMatter: LegalMatter.CIVIL,
        decisionType: DecisionType.SENTENCA,
        complexity: 55,
        confidence: 0.9,
        selectedModel: AIModel.CLAUDE_SONNET,
        reasoning: 'Civil sentence',
      },
      ragContext: {
        vectorResults: [{ content: 'test', score: 0.9, source: 'stj' }],
        graphResults: [],
        fusedResults: [{ content: 'test', score: 0.9, source: 'stj' }],
      },
    };

    expect(supervisorDecision(state)).toBe('specialist');
  });
});
