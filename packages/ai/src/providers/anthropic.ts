import { ChatAnthropic } from '@langchain/anthropic';

export interface AnthropicOptions {
  thinkingBudget?: number;
  maxTokens?: number;
}

/**
 * Creates a ChatAnthropic instance with proper thinking/temperature handling.
 *
 * When thinking is enabled, temperature MUST be omitted (Anthropic API rejects it).
 */
export function createAnthropicModel(modelId: string, options?: AnthropicOptions) {
  const thinkingBudget = options?.thinkingBudget ?? 0;
  // When thinking is enabled, maxTokens MUST exceed budget_tokens
  const defaultMax = thinkingBudget > 0 ? thinkingBudget + 8192 : 4096;

  const config: Record<string, unknown> = {
    modelName: modelId,
    maxTokens: options?.maxTokens ?? defaultMax,
    clientOptions: {
      timeout: thinkingBudget > 0 ? 300_000 : 120_000,
    },
  };

  if (thinkingBudget > 0) {
    config.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    // Do NOT set temperature — Anthropic rejects it when thinking is enabled
  } else {
    config.temperature = 0.3;
  }

  return new ChatAnthropic(config);
}
