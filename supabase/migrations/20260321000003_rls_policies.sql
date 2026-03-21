-- Row Level Security (RLS) policies
-- Users can only access their own data through the document ownership chain:
--   documents.user_id = auth.uid()
--   extractions.document_id → documents
--   analyses.extraction_id → extractions → documents
--
-- Service role key (SUPABASE_SERVICE_ROLE_KEY) automatically bypasses RLS.
-- Workers and admin operations use service role.

-- ============================================================
-- Enable RLS on tables with user data
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Documents: direct user_id ownership
-- ============================================================

CREATE POLICY "users_select_own_documents" ON documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_documents" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_documents" ON documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_documents" ON documents
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Extractions: ownership via parent document
-- ============================================================

CREATE POLICY "users_select_own_extractions" ON extractions
  FOR SELECT USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "users_insert_own_extractions" ON extractions
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "users_update_own_extractions" ON extractions
  FOR UPDATE USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "users_delete_own_extractions" ON extractions
  FOR DELETE USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- ============================================================
-- Analyses: ownership via extraction → document chain
-- ============================================================

CREATE POLICY "users_select_own_analyses" ON analyses
  FOR SELECT USING (
    extraction_id IN (
      SELECT e.id FROM extractions e
      JOIN documents d ON e.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_analyses" ON analyses
  FOR INSERT WITH CHECK (
    extraction_id IN (
      SELECT e.id FROM extractions e
      JOIN documents d ON e.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_analyses" ON analyses
  FOR UPDATE USING (
    extraction_id IN (
      SELECT e.id FROM extractions e
      JOIN documents d ON e.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_analyses" ON analyses
  FOR DELETE USING (
    extraction_id IN (
      SELECT e.id FROM extractions e
      JOIN documents d ON e.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================
-- Precedents and graph tables: public read, no user writes
-- (These are system-managed reference data, not user content)
-- ============================================================

-- precedents: anyone authenticated can search (RAG queries)
ALTER TABLE precedents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_precedents" ON precedents
  FOR SELECT TO authenticated USING (true);

-- graph_entities: anyone authenticated can search
ALTER TABLE graph_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_graph_entities" ON graph_entities
  FOR SELECT TO authenticated USING (true);

-- graph_relations: anyone authenticated can search
ALTER TABLE graph_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_graph_relations" ON graph_relations
  FOR SELECT TO authenticated USING (true);
