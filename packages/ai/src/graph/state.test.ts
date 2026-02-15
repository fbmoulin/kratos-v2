import { describe, test, expect } from 'vitest';
import { AgentState, createInitialState } from './state.js';

describe('AgentState', () => {
  test('Annotation.Root defines all expected channels', () => {
    const state = createInitialState({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'usr-1',
      rawText: 'Sample legal text',
    });

    expect(state.extractionId).toBe('ext-1');
    expect(state.documentId).toBe('doc-1');
    expect(state.userId).toBe('usr-1');
    expect(state.rawText).toBe('Sample legal text');
    expect(state.currentStep).toBe('router');
    expect(state.routerResult).toBeNull();
    expect(state.ragContext).toBeNull();
    expect(state.firacResult).toBeNull();
    expect(state.modelUsed).toBeNull();
    expect(state.tokensInput).toBe(0);
    expect(state.tokensOutput).toBe(0);
    expect(state.latencyMs).toBe(0);
    expect(state.error).toBeNull();
  });

  test('State type is extractable from Annotation', () => {
    type S = typeof AgentState.State;
    // Type-level check: ensure the shape is correct at compile time
    const partial: Partial<S> = {
      extractionId: 'x',
      currentStep: 'specialist',
      tokensInput: 500,
    };
    expect(partial.currentStep).toBe('specialist');
  });
});
