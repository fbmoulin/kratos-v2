-- Sprint 3, Task 10: Add PDF hash for upload deduplication
-- Per-user dedup: same PDF for different users creates separate documents
-- Only status IN ('completed', 'processing') is checked — failed extractions can be retried

ALTER TABLE "documents" ADD COLUMN "pdf_hash" varchar(64);

CREATE INDEX "idx_documents_pdf_hash_user" ON "documents" ("pdf_hash", "user_id");
