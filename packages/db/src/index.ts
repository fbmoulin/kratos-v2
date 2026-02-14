// @kratos/db - Módulo de Banco de Dados
// Drizzle ORM + PostgreSQL (Supabase) + pgvector

export {
  documents,
  extractions,
  analyses,
  precedents,
  promptVersions,
  auditLogs,
} from './schema/documents.js';

export const DB_MODULE = '@kratos/db';
