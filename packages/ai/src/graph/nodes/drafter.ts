import type { AgentStateType } from '../state.js';
import { AIModel } from '@kratos/core';
import { createAnthropicModel } from '../../providers/anthropic.js';
import { createGoogleModel } from '../../providers/google.js';
import { selectModel } from '../../router/model-router.js';
import { buildDrafterXml, getDomainPrompt } from '../../prompts/drafter.js';

/**
 * Drafter agent node — generates minuta (draft decision/sentence)
 * using domain-specific specialist prompts.
 *
 * Receives the full pipeline context:
 * - rawText (complete PDF extraction)
 * - firacResult (from specialist/analyst node)
 * - ragContext (from RAG node)
 *
 * Selects the appropriate domain prompt (BANCARIO, CONSUMIDOR, GENERICO, etc.)
 * based on the router's classification, formats the XML `<case>` input,
 * and invokes the appropriate model to produce a Relatório-Fundamentação-Dispositivo minuta.
 */
export async function drafterNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const startMs = Date.now();

  try {
    const routerResult = state.routerResult!;
    const firacResult = state.firacResult!;

    // Select model based on complexity (same tier as analyst)
    const { model: modelEnum, thinking } = selectModel(routerResult.complexity);

    const model = modelEnum === AIModel.GEMINI_FLASH
      ? createGoogleModel(modelEnum as string)
      : createAnthropicModel(modelEnum as string, {
          thinkingBudget: thinking ?? undefined,
        });

    // Select domain-specific specialist prompt
    const systemPrompt = getDomainPrompt(routerResult.legalMatter);

    // Build XML <case> input with full context
    const xmlInput = buildDrafterXml({
      rawText: state.rawText,
      firacResult,
      ragContext: state.ragContext,
    });

    // Invoke model with system prompt + XML input
    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'human', content: xmlInput },
    ]);

    const draftResult = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Extract token usage
    const usage = (response as any).usage_metadata;
    const drafterTokensIn = Number(usage?.input_tokens) || 0;
    const drafterTokensOut = Number(usage?.output_tokens) || 0;

    return {
      draftResult,
      tokensInput: state.tokensInput + drafterTokensIn,
      tokensOutput: state.tokensOutput + drafterTokensOut,
      latencyMs: state.latencyMs + (Date.now() - startMs),
      currentStep: 'complete',
    };
  } catch (err) {
    return {
      error: `Drafter failed: ${err instanceof Error ? err.message : String(err)}`,
      currentStep: 'error',
      latencyMs: state.latencyMs + (Date.now() - startMs),
    };
  }
}
