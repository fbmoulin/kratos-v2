-- HNSW indexes for fast approximate nearest neighbor search
-- Vectors: 1536 dimensions (OpenAI text-embedding-3-small)
-- Distance: cosine (confirmed from packages/ai/src/rag/vector-search.ts)
--
-- HNSW parameters:
--   m = 16 (connections per layer — good balance of speed/recall for 1536d)
--   ef_construction = 64 (build-time accuracy — higher = better recall, slower build)
--
-- NOTE: Not using CONCURRENTLY because Supabase migration runner wraps
-- each file in a transaction, and CREATE INDEX CONCURRENTLY cannot run
-- inside a transaction block. Tables are small (~100 rows) so locking
-- is not a concern. For large tables, run CONCURRENTLY via psql directly.

-- Precedents table — primary RAG search target
CREATE INDEX IF NOT EXISTS idx_precedents_embedding_hnsw
ON precedents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Graph entities table — knowledge graph vector search
CREATE INDEX IF NOT EXISTS idx_graph_entities_embedding_hnsw
ON graph_entities USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
