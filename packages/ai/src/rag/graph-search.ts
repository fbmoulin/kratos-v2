import { db } from '@kratos/db';
import { sql } from 'drizzle-orm';

export interface GraphSearchParams {
  query: string;
  maxDepth?: number;
  entityTypes?: string[];
  limit?: number;
}

export interface GraphSearchResult {
  id: string;
  name: string;
  entityType: string;
  content: string | null;
  metadata: Record<string, unknown>;
}

export interface GraphTraversalResult extends GraphSearchResult {
  depth: number;
  path: string[];
}

/**
 * Search `graph_entities` by keyword using ILIKE pattern matching.
 * Searches both `name` and `content` columns.
 */
export async function graphSearch(params: GraphSearchParams): Promise<GraphSearchResult[]> {
  const { query, entityTypes, limit = 10 } = params;
  const pattern = `%${query}%`;

  const typeClause = entityTypes?.length
    ? sql`AND entity_type = ANY(${entityTypes})`
    : sql``;

  const rows = await db.execute(sql`
    SELECT id, name, entity_type, content, metadata
    FROM graph_entities
    WHERE (name ILIKE ${pattern} OR content ILIKE ${pattern})
    ${typeClause}
    ORDER BY name
    LIMIT ${limit}
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    entityType: row.entity_type as string,
    content: (row.content as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

/**
 * Find entities connected to a starting node via recursive CTE traversal.
 *
 * Uses a PostgreSQL recursive CTE on `graph_relations` to walk the graph
 * up to `maxDepth` hops. Prevents cycles using a `path` array that tracks
 * visited entity IDs.
 */
export async function findRelatedEntities(
  entityId: string,
  maxDepth: number = 2,
): Promise<GraphTraversalResult[]> {
  const rows = await db.execute(sql`
    WITH RECURSIVE traversal AS (
      -- Base case: the starting entity
      SELECT
        ge.id,
        ge.name,
        ge.entity_type,
        ge.content,
        ge.metadata,
        0 AS depth,
        ARRAY[ge.id::text] AS path
      FROM graph_entities ge
      WHERE ge.id = ${entityId}::uuid

      UNION ALL

      -- Recursive case: follow outgoing relations
      SELECT
        target.id,
        target.name,
        target.entity_type,
        target.content,
        target.metadata,
        t.depth + 1,
        t.path || target.id::text
      FROM traversal t
      JOIN graph_relations gr ON gr.source_id = t.id
      JOIN graph_entities target ON target.id = gr.target_id
      WHERE t.depth < ${maxDepth}
        AND NOT (target.id::text = ANY(t.path))  -- cycle prevention
    )
    SELECT id, name, entity_type, content, metadata, depth, path
    FROM traversal
    ORDER BY depth, name
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    entityType: row.entity_type as string,
    content: (row.content as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    depth: row.depth as number,
    path: row.path as string[],
  }));
}
