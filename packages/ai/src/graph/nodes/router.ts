import type { AgentStateType } from '../state.js';
import type { RouterResult } from '@kratos/core';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';
import { createGoogleModel } from '../../providers/google.js';
import { buildRouterPrompt } from '../../prompts/templates.js';
import { classifyComplexity, selectModel } from '../../router/model-router.js';

const VALID_LEGAL_MATTERS = new Set(Object.values(LegalMatter));
const VALID_DECISION_TYPES = new Set(Object.values(DecisionType));

/**
 * Router agent node — classifies LegalMatter + DecisionType using Gemini Flash.
 *
 * Parses JSON response, validates enum values with fallbacks,
 * then runs complexity scoring and model selection.
 */
export async function routerNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    const model = createGoogleModel(AIModel.GEMINI_FLASH);
    const prompt = buildRouterPrompt(state.rawText);
    const response = await model.invoke(prompt);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    const parsed = JSON.parse(content);

    // Validate enum values with fallbacks
    const legalMatter = VALID_LEGAL_MATTERS.has(parsed.legalMatter)
      ? (parsed.legalMatter as LegalMatter)
      : LegalMatter.CIVIL;

    const decisionType = VALID_DECISION_TYPES.has(parsed.decisionType)
      ? (parsed.decisionType as DecisionType)
      : DecisionType.DESPACHO;

    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));

    // Run complexity scoring with router output
    const complexity = classifyComplexity({
      factLength: state.rawText.length,
      questionCount: Math.max(1, Number(parsed.complexity) > 50 ? 3 : 1),
      pedidoCount: Math.max(1, Number(parsed.complexity) > 70 ? 4 : 1),
      domainSpecialization: Number(parsed.complexity) > 60 ? 0.8 : 0.3,
      entityRichness: Math.min(10, Math.floor(state.rawText.length / 500)),
      multiParty: state.rawText.length > 3000,
      routerConfidence: confidence,
    });

    const { model: selectedModel, thinking: _thinking } = selectModel(complexity);

    const routerResult: RouterResult = {
      legalMatter,
      decisionType,
      complexity,
      confidence,
      selectedModel,
      reasoning: String(parsed.reasoning || 'Classificação automática'),
    };

    return {
      routerResult,
      currentStep: 'rag',
    };
  } catch (err) {
    return {
      error: `Router failed: ${err instanceof Error ? err.message : String(err)}`,
      currentStep: 'error',
    };
  }
}
