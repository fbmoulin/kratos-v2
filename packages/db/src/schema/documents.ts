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
} from 'drizzle-orm/pg-core';

// ============================================================
// Documents
// ============================================================
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
// Extractions
// ============================================================
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
// Analyses
// ============================================================
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
// Precedents (com pgvector)
// ============================================================
export const precedents = pgTable(
  'precedents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    // embedding é gerenciado via SQL direto (pgvector)
    metadata: jsonb('metadata').default({}),
    category: varchar('category', { length: 50 }).notNull(),
    source: varchar('source', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_precedents_category').on(table.category)],
);

// ============================================================
// Prompt Versions
// ============================================================
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
// Audit Logs
// ============================================================
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
