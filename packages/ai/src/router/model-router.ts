import { AIModel } from '@kratos/core';

export interface ComplexityInput {
  /** Length of the facts section in characters */
  factLength: number;
  /** Number of legal questions raised */
  questionCount: number;
  /** Number of pedidos (claims/requests) */
  pedidoCount: number;
  /** Domain specialization score 0-1 (1 = highly specialized) */
  domainSpecialization: number;
  /** Count of distinct legal entities referenced */
  entityRichness: number;
  /** Whether multiple parties are involved beyond plaintiff/defendant */
  multiParty: boolean;
  /** Router classification confidence 0-1 (lower = harder to classify) */
  routerConfidence: number;
}

export interface ModelSelection {
  model: AIModel;
  thinking: number | null;
}

/**
 * Scores case complexity on a 0-100 scale using 7 weighted factors.
 *
 * Factor weights (total = 100):
 * - factLength:           15 (longer facts = more complex)
 * - questionCount:        15 (more questions = more complex)
 * - pedidoCount:          20 (more claims = more complex)
 * - domainSpecialization: 10 (specialized domains are harder)
 * - entityRichness:       15 (more entities = more relationships)
 * - multiParty:           10 (multi-party adds complexity)
 * - routerConfidence:     15 (low confidence = ambiguous = harder)
 */
export function classifyComplexity(input: ComplexityInput): number {
  const factScore = Math.min(input.factLength / 4000, 1) * 15;
  const questionScore = Math.min(input.questionCount / 5, 1) * 15;
  const pedidoScore = Math.min(input.pedidoCount / 6, 1) * 20;
  const domainScore = input.domainSpecialization * 10;
  const entityScore = Math.min(input.entityRichness / 10, 1) * 15;
  const multiPartyScore = input.multiParty ? 10 : 0;
  const confidenceScore = (1 - input.routerConfidence) * 15;

  const total = factScore + questionScore + pedidoScore + domainScore +
    entityScore + multiPartyScore + confidenceScore;

  return Math.round(Math.min(Math.max(total, 0), 100));
}

/**
 * Selects the appropriate AI model and thinking budget based on complexity score.
 *
 * Tiers:
 * - < 30:  Gemini Flash (no thinking) — simple procedural matters
 * - 30-49: Claude Sonnet (no thinking) — standard analysis
 * - 50-69: Claude Sonnet + 10K thinking — complex analysis
 * - 70-89: Claude Opus + 16K thinking — highly complex
 * - 90+:   Claude Opus + 32K thinking — maximum reasoning
 */
export function selectModel(score: number): ModelSelection {
  if (score < 30) {
    return { model: AIModel.GEMINI_FLASH, thinking: null };
  }
  if (score < 50) {
    return { model: AIModel.CLAUDE_SONNET, thinking: null };
  }
  if (score < 70) {
    return { model: AIModel.CLAUDE_SONNET, thinking: 10_000 };
  }
  if (score < 90) {
    return { model: AIModel.CLAUDE_OPUS, thinking: 16_000 };
  }
  return { model: AIModel.CLAUDE_OPUS, thinking: 32_000 };
}
