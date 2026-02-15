import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state.js';
import { supervisorDecision } from './nodes/supervisor.js';
import { routerNode } from './nodes/router.js';
import { ragNode } from './nodes/rag.js';
import { specialistNode } from './nodes/specialist.js';

/**
 * Creates the compiled LangGraph analysis workflow.
 *
 * Flow: __start__ → supervisor → [router|rag|specialist|END]
 *
 * The supervisor inspects state and returns the next step.
 * Conditional edges dispatch to the correct node based on the decision.
 */
export function createAnalysisWorkflow() {
  const graph = new StateGraph(AgentState)
    .addNode('router', routerNode)
    .addNode('rag', ragNode)
    .addNode('specialist', specialistNode)
    .addConditionalEdges('__start__', supervisorDecision, {
      router: 'router',
      rag: 'rag',
      specialist: 'specialist',
      complete: END,
      error: END,
    })
    .addConditionalEdges('router', supervisorDecision, {
      router: 'router',
      rag: 'rag',
      specialist: 'specialist',
      complete: END,
      error: END,
    })
    .addConditionalEdges('rag', supervisorDecision, {
      router: 'router',
      rag: 'rag',
      specialist: 'specialist',
      complete: END,
      error: END,
    })
    .addConditionalEdges('specialist', supervisorDecision, {
      router: 'router',
      rag: 'rag',
      specialist: 'specialist',
      complete: END,
      error: END,
    });

  return graph.compile();
}
