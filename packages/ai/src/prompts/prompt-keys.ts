/**
 * Canonical prompt keys matching prompt_versions.prompt_key column.
 * Each key corresponds to one prompt template function.
 */
export const PROMPT_KEYS = {
  /** Router classification prompt */
  ROUTER: 'router',
  /** FIRAC+ Enterprise v3.0 analysis prompt */
  FIRAC_ENTERPRISE: 'firac-enterprise',
  /** Drafter system prompt — generic fallback */
  DRAFTER_GENERICO: 'drafter-generico',
  /** Drafter system prompt — banking law */
  DRAFTER_BANCARIO: 'drafter-bancario',
  /** Drafter system prompt — consumer law */
  DRAFTER_CONSUMIDOR: 'drafter-consumidor',
} as const;

export type PromptKey = (typeof PROMPT_KEYS)[keyof typeof PROMPT_KEYS];
