-- HNSW indexes for fast approximate nearest neighbor search
-- Vectors: 1536 dimensions (OpenAI text-embedding-3-small)
-- Distance: cosine (confirmed from packages/ai/src/rag/vector-search.ts)
--
-- HNSW parameters:
--   m = 16 (connections per layer — good balance of speed/recall for 1536d)
--   ef_construction = 64 (build-time accuracy — higher = better recall, slower build)
--
-- Using CONCURRENTLY to avoid locking tables during index creation.

-- Precedents table — primary RAG search target
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_precedents_embedding_hnsw
ON precedents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Graph entities table — knowledge graph vector search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_entities_embedding_hnsw
ON graph_entities USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
