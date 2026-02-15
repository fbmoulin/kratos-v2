import type { AgentStateType } from '../state.js';
import type { FIRACResult } from '@kratos/core';
import type { AIModel as _AIModel } from '@kratos/core';
import { createAnthropicModel } from '../../providers/anthropic.js';
import { buildFiracEnterprisePrompt } from '../../prompts/firac-enterprise.js';
import { selectModel } from '../../router/model-router.js';

/**
 * Specialist agent node — generates FIRAC analysis using Claude.
 *
 * Uses the model and thinking budget determined by the router's complexity score.
 * Tracks token usage and latency for observability.
 */
export async function specialistNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const startMs = Date.now();

  try {
    const routerResult = state.routerResult!;
    const { model: modelEnum, thinking } = selectModel(routerResult.complexity);

    // Map enum to model ID string
    const modelId = modelEnum;

    const model = createAnthropicModel(modelId, {
      thinkingBudget: thinking ?? undefined,
    });

    // Build RAG context string from fused results
    const ragText = state.ragContext?.fusedResults
      .map((r) => r.content)
      .join('\n\n') || undefined;

    const prompt = buildFiracEnterprisePrompt({
      rawText: state.rawText,
      legalMatter: routerResult.legalMatter,
      decisionType: routerResult.decisionType,
      ragContext: ragText,
    });

    const response = await model.invoke(prompt);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    const parsed = JSON.parse(content);

    const firacResult: FIRACResult = {
      facts: String(parsed.facts || ''),
      issue: String(parsed.issue || ''),
      rule: String(parsed.rule || ''),
      analysis: String(parsed.analysis || ''),
      conclusion: String(parsed.conclusion || ''),
    };

    // Extract token usage from response metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (response as any).usage_metadata;
    const tokensInput = Number(usage?.input_tokens) || 0;
    const tokensOutput = Number(usage?.output_tokens) || 0;

    return {
      firacResult,
      modelUsed: modelId,
      tokensInput,
      tokensOutput,
      latencyMs: Date.now() - startMs,
      currentStep: 'drafter', // BUG FIX #2: was 'complete', should route to drafter
    };
  } catch (err) {
    return {
      error: `Specialist failed: ${err instanceof Error ? err.message : String(err)}`,
      currentStep: 'error',
      latencyMs: Date.now() - startMs,
    };
  }
}
