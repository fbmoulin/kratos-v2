/**
 * Reciprocal Rank Fusion (RRF) for combining multiple ranked result lists.
 *
 * RRF formula: score(d) = Σ 1 / (k + rank + 1)
 * where k is a smoothing constant (default 60) and rank is 0-indexed position.
 *
 * Adapted from superagents-judge lib/hybrid_search.js for TypeScript + PostgreSQL.
 */

export interface RankedItem {
  id: string;
  content: string;
  score: number;
  source: string;
}

export interface FusedResult {
  id: string;
  content: string;
  score: number;
  source: string;
  sources: string[];
}

/**
 * Merge multiple ranked lists using Reciprocal Rank Fusion.
 *
 * @param rankedLists - Array of ranked result lists (each sorted by relevance)
 * @param k - Smoothing constant (default 60). Smaller k amplifies rank differences.
 * @returns Fused list sorted by combined RRF score, normalized to [0, 1].
 */
export function fusionRRF(rankedLists: RankedItem[][], k: number = 60): FusedResult[] {
  const scores = new Map<string, { item: RankedItem; score: number; sources: Set<string> }>();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      const rrfScore = 1 / (k + rank + 1);

      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrfScore;
        existing.sources.add(item.source);
      } else {
        scores.set(item.id, {
          item,
          score: rrfScore,
          sources: new Set([item.source]),
        });
      }
    }
  }

  if (scores.size === 0) return [];

  // Normalize scores to [0, 1]
  const entries = Array.from(scores.values());
  const maxScore = Math.max(...entries.map((e) => e.score));

  return entries
    .map((entry) => ({
      id: entry.item.id,
      content: entry.item.content,
      score: maxScore > 0 ? entry.score / maxScore : 0,
      source: entry.item.source,
      sources: Array.from(entry.sources),
    }))
    .sort((a, b) => b.score - a.score);
}
