-- Migration: Add provenance and governance columns (v1.1.0 contracts)
-- Adds hash/timing fields to extractions, prompt governance to analyses and prompt_versions.

-- Extractions: provenance fields
ALTER TABLE extractions ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
ALTER TABLE extractions ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE extractions ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;

-- Analyses: prompt governance fields
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS prompt_key VARCHAR(100);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS prompt_version INTEGER;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS prompt_hash VARCHAR(64);

-- Prompt versions: lifecycle status and content hash
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Backfill existing active prompts to 'active' status
UPDATE prompt_versions SET status = 'active' WHERE is_active = true AND status = 'draft';
