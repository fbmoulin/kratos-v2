/**
 * @module @kratos/db
 * Database layer — Drizzle ORM + PostgreSQL (Supabase) + pgvector.
 *
 * Exports:
 * - **Schema tables**: `documents`, `extractions`, `analyses`, `precedents`, `promptVersions`, `auditLogs`
 * - **DB client**: `db` (Drizzle instance), `queryClient` (raw postgres.js for shutdown)
 *
 * @example
 * import { db, documents } from '@kratos/db';
 * import { eq } from 'drizzle-orm';
 * const docs = await db.select().from(documents).where(eq(documents.userId, userId));
 */

export {
  documents,
  extractions,
  analyses,
  precedents,
  promptVersions,
  auditLogs,
} from './schema/documents.js';

export { db, queryClient } from './client.js';

export const DB_MODULE = '@kratos/db';
