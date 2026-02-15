import type { AgentStateType } from '../state.js';

/**
 * Supervisor decision function — pure logic, no LLM calls.
 *
 * Inspects the current agent state and returns the next step:
 * - `'error'`      — an error occurred, abort pipeline
 * - `'complete'`   — FIRAC result exists, pipeline finished
 * - `'specialist'` — RAG context ready, generate FIRAC analysis
 * - `'rag'`        — router classified, fetch RAG context
 * - `'router'`     — initial state, classify the document
 */
export function supervisorDecision(state: AgentStateType): string {
  if (state.error) return 'error';
  if (state.firacResult) return 'complete';
  if (state.ragContext && state.routerResult) return 'specialist';
  if (state.routerResult) return 'rag';
  return 'router';
}
