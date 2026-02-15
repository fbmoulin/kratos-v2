/**
 * @module schema/documents
 * Drizzle ORM schema definitions for all KRATOS v2 database tables.
 *
 * Tables:
 * - {@link documents} — Uploaded PDF files and their processing status
 * - {@link extractions} — Structured content extracted from PDFs
 * - {@link analyses} — AI-generated legal analyses (FIRAC framework)
 * - {@link precedents} — Legal precedents with pgvector embeddings for RAG
 * - {@link promptVersions} — Versioned prompt templates for AI agents
 * - {@link auditLogs} — Immutable audit trail (CNJ 615/2025 compliance)
 *
 * All tables use UUID primary keys with `defaultRandom()` and
 * timezone-aware timestamps with `defaultNow()`.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
  unique,
  customType,
} from 'drizzle-orm/pg-core';

/**
 * Custom Drizzle type for pgvector `vector(1536)` columns.
 * Matches OpenAI text-embedding-3-small default dimension.
 *
 * Serialization: `number[]` in TS ↔ `vector(1536)` in PostgreSQL.
 * - `toDriver`: JSON.stringify (pgvector accepts JSON array strings)
 * - `fromDriver`: JSON.parse or passthrough (depends on driver format)
 *
 * @requires pgvector extension enabled in PostgreSQL
 */
const vector = customType<{ data: number[]; dpiType: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown) {
    if (typeof value === 'string') return JSON.parse(value);
    return value as number[];
  },
});

// ============================================================
// Documents — uploaded PDFs and their lifecycle
// ============================================================

/**
 * Core document table tracking uploaded PDF files through their processing lifecycle.
 *
 * Status flow: `pending` → `processing` → `completed` | `failed`
 *
 * @index idx_documents_user_id — fast lookup by owner
 * @index idx_documents_status — filter by processing stage
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: text('file_path'),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).default('application/pdf'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    pages: integer('pages'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_documents_user_id').on(table.userId),
    index('idx_documents_status').on(table.status),
  ],
);

// ============================================================
// Extractions — structured content from PDF pipeline
// ============================================================

/**
 * Stores structured content extracted from documents by the PDF pipeline.
 * Each document has exactly one extraction (1:1 via `documentId` FK).
 *
 * Pipeline: Docling (structural) → pdfplumber (tables) → Gemini 2.5 Flash (OCR)
 *
 * @cascade Deleting a document cascades to its extraction
 */
export const extractions = pgTable(
  'extractions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    contentJson: jsonb('content_json').notNull().default({}),
    extractionMethod: varchar('extraction_method', { length: 100 })
      .notNull()
      .default('docling+pdfplumber+gemini'),
    rawText: text('raw_text'),
    tablesCount: integer('tables_count').default(0),
    imagesCount: integer('images_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_extractions_document_id').on(table.documentId)],
);

// ============================================================
// Analyses — AI-generated legal analysis (FIRAC)
// ============================================================

/**
 * Stores LangGraph agent analysis results.
 * Tracks the full agent chain, reasoning trace, and token usage for cost monitoring.
 *
 * @cascade Deleting an extraction cascades to its analyses
 */
export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    extractionId: uuid('extraction_id')
      .notNull()
      .references(() => extractions.id, { onDelete: 'cascade' }),
    agentChain: varchar('agent_chain', { length: 255 }).notNull(),
    reasoningTrace: text('reasoning_trace'),
    resultJson: jsonb('result_json').notNull().default({}),
    modelUsed: varchar('model_used', { length: 100 }).notNull(),
    tokensInput: integer('tokens_input').default(0),
    tokensOutput: integer('tokens_output').default(0),
    latencyMs: integer('latency_ms').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_analyses_extraction_id').on(table.extractionId)],
);

// ============================================================
// Precedents — legal precedents with pgvector embeddings
// ============================================================

/**
 * Legal precedent knowledge base for RAG (Retrieval-Augmented Generation).
 *
 * The `embedding` column stores 1536-dimensional vectors (OpenAI text-embedding-3-small)
 * for similarity search via pgvector's HNSW index.
 *
 * Categories map to `LegalMatter` enum in `@kratos/core`.
 */
export const precedents = pgTable(
  'precedents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    metadata: jsonb('metadata').default({}),
    category: varchar('category', { length: 50 }).notNull(),
    source: varchar('source', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_precedents_category').on(table.category)],
);

// ============================================================
// Prompt Versions — versioned AI prompt templates
// ============================================================

/**
 * Versioned prompt templates for AI agent instructions.
 * Supports A/B testing by toggling `isActive` across versions.
 *
 * @unique (promptKey, version) — each prompt can have multiple versions
 */
export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promptKey: varchar('prompt_key', { length: 100 }).notNull(),
    version: integer('version').notNull().default(1),
    content: text('content').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('prompt_versions_key_version').on(table.promptKey, table.version),
    index('idx_prompt_versions_key_active').on(table.promptKey, table.isActive),
  ],
);

// ============================================================
// Graph Entities — knowledge graph nodes for GraphRAG
// ============================================================

/**
 * Nodes in the PostgreSQL-native knowledge graph.
 * Entity types: lei, artigo, sumula, principio, tribunal, tema.
 * Optional pgvector embedding for hybrid vector+graph search.
 */
export const graphEntities = pgTable(
  'graph_entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    entityType: text('entity_type').notNull(),
    content: text('content'),
    embedding: vector('embedding'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_graph_entities_type').on(table.entityType),
    index('idx_graph_entities_name').on(table.name),
  ],
);

// ============================================================
// Graph Relations — knowledge graph edges for GraphRAG
// ============================================================

/**
 * Directed edges connecting graph entities.
 * Relation types: cita, fundamenta, revoga, complementa, contraria, regulamenta.
 * Weight (0-1) indicates relation strength for ranked retrieval.
 *
 * @cascade Deleting a source or target entity cascades to its relations
 */
export const graphRelations = pgTable(
  'graph_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => graphEntities.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => graphEntities.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    weight: integer('weight').default(1),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_graph_relations_source').on(table.sourceId),
    index('idx_graph_relations_target').on(table.targetId),
    index('idx_graph_relations_type').on(table.relationType),
  ],
);

// ============================================================
// Audit Logs — immutable compliance trail
// ============================================================

/**
 * Immutable audit log for all system actions.
 * Required for CNJ Resolution 615/2025 compliance — every AI decision
 * must have a traceable, non-editable record.
 *
 * Records before/after state for entity mutations.
 * `userId` is nullable to support system-initiated actions.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    payloadBefore: jsonb('payload_before'),
    payloadAfter: jsonb('payload_after'),
    userId: uuid('user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_user').on(table.userId),
  ],
);
