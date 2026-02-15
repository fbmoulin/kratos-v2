/**
 * @module @kratos/ai
 * AI intelligence layer — LangGraph agent orchestration, RAG engine,
 * complexity-based model routing, and FIRAC legal analysis.
 */

// Workflow
export { createAnalysisWorkflow } from './graph/workflow.js';
export { AgentState, createInitialState, type AgentStateType } from './graph/state.js';

// Nodes
export { supervisorDecision } from './graph/nodes/supervisor.js';
export { routerNode } from './graph/nodes/router.js';
export { ragNode } from './graph/nodes/rag.js';
export { specialistNode } from './graph/nodes/specialist.js';

// Model Router
export { classifyComplexity, selectModel, type ComplexityInput, type ModelSelection } from './router/model-router.js';

// RAG
export { vectorSearch, type VectorSearchParams, type VectorSearchResult } from './rag/vector-search.js';
export { graphSearch, findRelatedEntities, type GraphSearchParams, type GraphSearchResult, type GraphTraversalResult } from './rag/graph-search.js';
export { fusionRRF, type RankedItem, type FusedResult } from './rag/hybrid-search.js';
export { embedText, embedBatch } from './rag/embeddings.js';

// Providers
export { createAnthropicModel, type AnthropicOptions } from './providers/anthropic.js';
export { createGoogleModel } from './providers/google.js';

// Prompts
export { buildRouterPrompt, buildSpecialistPrompt, type SpecialistPromptInput } from './prompts/templates.js';
export { buildFiracEnterprisePrompt, type FiracEnterpriseInput } from './prompts/firac-enterprise.js';
