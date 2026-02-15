import { db } from '@kratos/db';
import { sql } from 'drizzle-orm';

export interface VectorSearchParams {
  embedding: number[];
  limit?: number;
  category?: string;
  threshold?: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  category: string;
  source: string;
  metadata: Record<string, unknown>;
}

/**
 * Search the `precedents` table using pgvector cosine similarity.
 *
 * Uses `1 - (embedding <=> $vector::vector)` for cosine similarity scoring.
 * Optionally filters by category and minimum similarity threshold.
 */
export async function vectorSearch(params: VectorSearchParams): Promise<VectorSearchResult[]> {
  const { embedding, limit = 5, category, threshold = 0.0 } = params;
  const vectorStr = JSON.stringify(embedding);

  const categoryClause = category
    ? sql`AND category = ${category}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      id,
      content,
      1 - (embedding <=> ${vectorStr}::vector) AS score,
      category,
      source,
      metadata
    FROM precedents
    WHERE embedding IS NOT NULL
    ${categoryClause}
    HAVING 1 - (embedding <=> ${vectorStr}::vector) >= ${threshold}
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  return (rows as unknown as VectorSearchResult[]).map((row) => ({
    id: row.id,
    content: row.content,
    score: Number(row.score),
    category: row.category,
    source: row.source,
    metadata: row.metadata ?? {},
  }));
}
