-- Audit log triggers for CNJ 615/2025 compliance
-- Auto-insert into audit_logs on INSERT/UPDATE/DELETE of critical tables
-- Ref: packages/db/src/schema/documents.ts (auditLogs table definition)

-- Generic audit trigger function
-- Uses TG_TABLE_NAME as entity_type and TG_OP as action.
-- Records OLD state (before) on UPDATE/DELETE and NEW state (after) on INSERT/UPDATE.
-- user_id is extracted from current_setting if available (set by API middleware).
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Try to read user_id from session variable (set by API via set_config)
  BEGIN
    v_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO audit_logs (
    id,
    entity_type,
    entity_id,
    action,
    payload_before,
    payload_after,
    user_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'INSERT' THEN NULL
      ELSE row_to_json(OLD)
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE row_to_json(NEW)
    END,
    v_user_id,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers on documents table
CREATE TRIGGER audit_documents_insert
  AFTER INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_documents_update
  AFTER UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_documents_delete
  AFTER DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Triggers on extractions table
CREATE TRIGGER audit_extractions_insert
  AFTER INSERT ON extractions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_extractions_update
  AFTER UPDATE ON extractions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_extractions_delete
  AFTER DELETE ON extractions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Triggers on analyses table
CREATE TRIGGER audit_analyses_insert
  AFTER INSERT ON analyses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_analyses_update
  AFTER UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_analyses_delete
  AFTER DELETE ON analyses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
