import { Context, Next } from 'hono';

/**
 * Rate limiter simples em memória para o MVP.
 * Em produção, substituir por Redis-based rate limiting.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

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
