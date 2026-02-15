import type { AgentStateType } from '../state.js';
import type { RAGContext } from '@kratos/core';
import { embedText } from '../../rag/embeddings.js';
import { vectorSearch } from '../../rag/vector-search.js';
import { graphSearch } from '../../rag/graph-search.js';
import { fusionRRF, type RankedItem } from '../../rag/hybrid-search.js';

/**
 * RAG node — retrieves context via vector + graph search with RRF fusion.
 *
 * Non-fatal: on error, returns empty ragContext so the pipeline can
 * continue with the specialist node using only the raw text.
 */
export async function ragNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    const legalMatter = state.routerResult?.legalMatter;

    // Embed the query text for vector search
    const embedding = await embedText(state.rawText.slice(0, 2000));

    // Run vector and graph searches in parallel
    const [vectorResults, graphResults] = await Promise.all([
      vectorSearch({
        embedding,
        limit: 5,
        category: legalMatter,
      }),
      graphSearch({
        query: state.rawText.slice(0, 200),
        limit: 5,
      }),
    ]);

    // Convert to RankedItem format for RRF fusion
    const vectorRanked: RankedItem[] = vectorResults.map((r) => ({
      id: r.id,
      content: r.content,
      score: r.score,
      source: 'vector',
    }));

    const graphRanked: RankedItem[] = graphResults.map((r) => ({
      id: r.id,
      content: r.content ?? '',
      score: 1, // Graph results are already relevance-ordered
      source: 'graph',
    }));

    const fused = fusionRRF([vectorRanked, graphRanked]);

    const ragContext: RAGContext = {
      vectorResults: vectorResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: r.source,
      })),
      graphResults: graphResults.map((r) => ({
        content: r.content ?? '',
        score: 1,
        path: [],
      })),
      fusedResults: fused.map((r) => ({
        content: r.content,
        score: r.score,
        source: r.source,
      })),
    };

    return {
      ragContext,
      currentStep: 'specialist',
    };
  } catch {
    // Non-fatal: proceed without RAG context
    return {
      ragContext: {
        vectorResults: [],
        graphResults: [],
        fusedResults: [],
      },
      currentStep: 'specialist',
    };
  }
}
