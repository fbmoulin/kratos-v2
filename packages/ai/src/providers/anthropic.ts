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
  const config: Record<string, unknown> = {
    modelName: modelId,
    maxTokens: options?.maxTokens ?? 4096,
  };

  if (options?.thinkingBudget) {
    config.thinking = { type: 'enabled', budget_tokens: options.thinkingBudget };
    // Do NOT set temperature — Anthropic rejects it when thinking is enabled
  } else {
    config.temperature = 0.3;
  }

  return new ChatAnthropic(config);
}
