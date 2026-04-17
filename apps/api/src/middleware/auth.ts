/**
 * @module auth
 * Supabase JWT authentication middleware for Hono.
 *
 * Uses a module-level Supabase client singleton to avoid creating
 * a new client per request. Token validation is done via
 * `supabase.auth.getUser(token)` which verifies the JWT server-side.
 *
 * @example
 * // Apply to all document routes:
 * app.use('/documents/*', authMiddleware);
 *
 * // Access user in route handlers:
 * app.get('/documents', (c) => {
 *   const userId = c.get('userId'); // string (UUID)
 *   const user = c.get('user');     // Supabase User object
 * });
 *
 * @requires SUPABASE_URL - Supabase project URL
 * @requires SUPABASE_KEY - Supabase anon/public key
 */
import { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { db } from '@kratos/db';
import { sql } from 'drizzle-orm';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

/** Singleton Supabase client — shared across all requests. */
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validates a Supabase JWT from the Authorization header.
 *
 * On success, sets `user` (full Supabase User) and `userId` (UUID string)
 * on the Hono context for downstream route handlers.
 *
 * @param c - Hono request context
 * @param next - Next middleware in chain
 * @returns 401 if token is missing, invalid, or expired; 500 on unexpected errors
 */
export async function authMiddleware(c: Context, next: Next) {
  // Dev-only auth bypass for E2E testing.
  //
  // Allowlist (NOT denylist): the bypass activates ONLY when NODE_ENV is
  // explicitly "development" or "test" AND TEST_USER_ID is set.
  //
  // The previous implementation was a denylist
  // (NODE_ENV !== 'production' && NODE_ENV !== 'staging'), which let
  // any unexpected env name through — "preview", "hotfix", empty
  // string, undefined, etc. A misconfigured Vercel preview deploy or a
  // hotfix-staging container with TEST_USER_ID inherited from CI would
  // expose every authenticated route unauthenticated.
  if (
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    process.env.TEST_USER_ID
  ) {
    c.set('userId', process.env.TEST_USER_ID);
    return next();
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    c.set('user', user);
    c.set('userId', user.id);

    // Set user context for SQL audit triggers (transaction-local)
    try {
      await db.execute(sql`SELECT set_config('app.current_user_id', ${user.id}::text, true)`);
    } catch {
      // Non-fatal: audit triggers work without this, just with null user_id
    }

    await next();
  } catch {
    return c.json({ error: 'Authentication failed' }, 500);
  }
}
