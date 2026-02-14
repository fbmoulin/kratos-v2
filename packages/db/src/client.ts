/**
 * @module client
 * Drizzle ORM database client singleton.
 *
 * Creates a single `postgres` connection pool and wraps it with Drizzle ORM.
 * Schema-aware queries are enabled by passing the full schema definition.
 *
 * @example
 * import { db } from '@kratos/db';
 * const docs = await db.select().from(documents).where(eq(documents.userId, id));
 *
 * @example
 * // Graceful shutdown:
 * import { queryClient } from '@kratos/db';
 * process.on('SIGTERM', () => queryClient.end());
 *
 * @requires DATABASE_URL - PostgreSQL connection string (Supabase pooler recommended)
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/documents.js';

/** Raw postgres.js connection — use for graceful shutdown via `queryClient.end()`. */
const queryClient = postgres(process.env.DATABASE_URL!);

/** Drizzle ORM instance with full schema awareness for type-safe queries. */
export const db = drizzle(queryClient, { schema });
export { queryClient };
