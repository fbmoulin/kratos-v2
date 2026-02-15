import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state.js';
import { supervisorDecision } from './nodes/supervisor.js';
import { routerNode } from './nodes/router.js';
import { ragNode } from './nodes/rag.js';
import { specialistNode } from './nodes/specialist.js';
import { drafterNode } from './nodes/drafter.js';

const EDGE_MAP = {
  router: 'router',
  rag: 'rag',
  specialist: 'specialist',
  drafter: 'drafter',
  complete: END,
  error: END,
} as const;

/**
 * Creates the compiled LangGraph analysis workflow.
 *
 * Flow: __start__ → supervisor → [router|rag|specialist|drafter|END]
 *
 * Pipeline: router → rag → specialist (FIRAC analysis) → drafter (minuta) → complete
 *
 * The supervisor inspects state and returns the next step.
 * Conditional edges dispatch to the correct node based on the decision.
 */
export function createAnalysisWorkflow() {
  const graph = new StateGraph(AgentState)
    .addNode('router', routerNode)
    .addNode('rag', ragNode)
    .addNode('specialist', specialistNode)
    .addNode('drafter', drafterNode)
    .addConditionalEdges('__start__', supervisorDecision, EDGE_MAP)
    .addConditionalEdges('router', supervisorDecision, EDGE_MAP)
    .addConditionalEdges('rag', supervisorDecision, EDGE_MAP)
    .addConditionalEdges('specialist', supervisorDecision, EDGE_MAP)
    .addConditionalEdges('drafter', supervisorDecision, EDGE_MAP);

  return graph.compile();
}
