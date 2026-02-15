import { Annotation } from '@langchain/langgraph';
import type { RouterResult, RAGContext, FIRACResult } from '@kratos/core';

/**
 * LangGraph agent state definition using Annotation.Root.
 *
 * Channels track the full lifecycle of a legal document analysis:
 * identifiers → router classification → RAG context → FIRAC generation → metrics.
 */
export const AgentState = Annotation.Root({
  /** Extraction record ID */
  extractionId: Annotation<string>,
  /** Source document ID */
  documentId: Annotation<string>,
  /** Requesting user ID */
  userId: Annotation<string>,
  /** Raw text extracted from PDF */
  rawText: Annotation<string>,
  /** Current pipeline step: router | rag | specialist | complete | error */
  currentStep: Annotation<string>,
  /** Router classification result (null until router node runs) */
  routerResult: Annotation<RouterResult | null>,
  /** Combined RAG context from vector + graph search (null until RAG node runs) */
  ragContext: Annotation<RAGContext | null>,
  /** FIRAC analysis result (null until specialist node runs) */
  firacResult: Annotation<FIRACResult | null>,
  /** Draft minuta text (null until drafter node runs) */
  draftResult: Annotation<string | null>,
  /** AI model used for the final analysis */
  modelUsed: Annotation<string | null>,
  /** Input tokens consumed */
  tokensInput: Annotation<number>,
  /** Output tokens generated */
  tokensOutput: Annotation<number>,
  /** End-to-end latency in milliseconds */
  latencyMs: Annotation<number>,
  /** Error message if pipeline failed */
  error: Annotation<string | null>,
});

export type AgentStateType = typeof AgentState.State;

/**
 * Factory to create an initial agent state with sensible defaults.
 */
export function createInitialState(input: {
  extractionId: string;
  documentId: string;
  userId: string;
  rawText: string;
}): AgentStateType {
  return {
    extractionId: input.extractionId,
    documentId: input.documentId,
    userId: input.userId,
    rawText: input.rawText,
    currentStep: 'router',
    routerResult: null,
    ragContext: null,
    firacResult: null,
    draftResult: null,
    modelUsed: null,
    tokensInput: 0,
    tokensOutput: 0,
    latencyMs: 0,
    error: null,
  };
}
