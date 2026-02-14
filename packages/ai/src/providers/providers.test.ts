import { describe, test, expect, vi } from 'vitest';

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    _type: 'ChatAnthropic',
    ...config,
  })),
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    _type: 'ChatGoogleGenerativeAI',
    ...config,
  })),
}));

import { createAnthropicModel } from './anthropic.js';
import { createGoogleModel } from './google.js';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

describe('createAnthropicModel', () => {
  test('creates Sonnet model without thinking', () => {
    const model = createAnthropicModel('claude-sonnet-4');
    expect(ChatAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'claude-sonnet-4',
      }),
    );
    expect(model).toBeDefined();
  });

  test('creates Opus model with thinking — omits temperature', () => {
    const model = createAnthropicModel('claude-opus-4', { thinkingBudget: 16_000 });
    expect(ChatAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'claude-opus-4',
        thinking: { type: 'enabled', budget_tokens: 16_000 },
      }),
    );
    // Temperature must NOT be in the config when thinking is enabled
    const lastCall = vi.mocked(ChatAnthropic).mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    expect(lastCall).not.toHaveProperty('temperature');
  });
});

describe('createGoogleModel', () => {
  test('creates Gemini Flash model', () => {
    const model = createGoogleModel('gemini-2.5-flash');
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'gemini-2.5-flash',
      }),
    );
    expect(model).toBeDefined();
  });
});
