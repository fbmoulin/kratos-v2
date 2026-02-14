/**
 * @module rate-limit
 * In-memory sliding-window rate limiter for the MVP.
 *
 * Tracks request counts per user (or IP for unauthenticated requests)
 * in a Map with automatic cleanup of expired entries every 60 seconds.
 *
 * Sets standard rate-limit headers on every response:
 * - `X-RateLimit-Limit` — maximum requests per window
 * - `X-RateLimit-Remaining` — requests left in current window
 * - `Retry-After` — seconds until window resets (only on 429)
 *
 * @example
 * import { rateLimiter } from './middleware/rate-limit.js';
 * app.use('/documents/*', rateLimiter(10, 60_000)); // 10 req/min
 *
 * @note Replace with Redis-based rate limiting for production (multi-instance).
 */
import { Context, Next } from 'hono';

/** Stores per-key request counts and window expiry timestamps. */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 60s to prevent memory leak.
// `unref()` ensures this timer doesn't prevent Node.js process exit.
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts) {
    if (now > record.resetAt) requestCounts.delete(key);
  }
}, 60_000).unref();

/**
 * Creates a rate-limiting middleware with configurable limits.
 *
 * Rate limit key priority: `userId` (from auth) > `x-forwarded-for` header > `'anonymous'`.
 *
 * @param maxRequests - Maximum number of requests allowed per window
 * @param windowMs - Window duration in milliseconds (default: 60,000 = 1 minute)
 * @returns Hono middleware function
 */
export function rateLimiter(maxRequests: number, windowMs: number = 60_000) {
  return async (c: Context, next: Next) => {
    const key = c.get('userId') || c.req.header('x-forwarded-for') || 'anonymous';
    const now = Date.now();

    const record = requestCounts.get(key);

    if (!record || now > record.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - 1).toString());
      await next();
      return;
    }

    if (record.count >= maxRequests) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
      return c.json({ error: 'Too many requests' }, 429);
    }

    record.count++;
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    await next();
  };
}
