/**
 * @module @kratos/api
 * Main entry point for the KRATOS v2 REST API.
 *
 * Built on Hono (ultrafast web framework) with Node.js adapter.
 * All routes are under the `/v2` base path.
 *
 * **Middleware chain** (applied in order):
 * 1. `logger()` — request/response logging to stdout
 * 2. `secureHeaders()` — security headers (X-Content-Type-Options, etc.)
 * 3. `cors()` — CORS with configurable origin
 * 4. `authMiddleware` — Supabase JWT (only on `/documents/*`)
 *
 * **Route groups:**
 * - `/v2/` — Root info (public)
 * - `/v2/health` — Health probes (public)
 * - `/v2/documents` — Document CRUD (authenticated)
 *
 * @example
 * // Run in dev mode:
 * pnpm --filter @kratos/api dev
 *
 * // Test with curl:
 * curl http://localhost:3001/v2/health
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { AppEnv } from './types.js';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { APP_NAME, APP_VERSION } from '@kratos/core';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';
import { authMiddleware } from './middleware/auth.js';
import { initSentry, captureError } from './middleware/sentry.js';
import { logger } from './lib/logger.js';

initSentry();

// Validate critical env vars in production — fail fast
if (process.env.NODE_ENV === 'production') {
  const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
    throw new Error('CORS_ORIGIN must be set to a non-localhost URL in production');
  }
}

const app = new Hono<AppEnv>().basePath('/v2');

// Global middleware — applied to all routes
app.use('*', honoLogger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Auth middleware — only applied to document routes
app.use('/documents/*', authMiddleware);

// Route registration
app.route('/health', healthRouter);
app.route('/documents', documentsRouter);

/** Root endpoint — returns API metadata. Public, no auth required. */
app.get('/', (c) => {
  return c.json({
    name: APP_NAME,
    version: APP_VERSION,
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler — captures to Sentry and returns a generic 500
app.onError((err, c) => {
  captureError(err, { path: c.req.path, method: c.req.method });
  logger.error({ err, method: c.req.method, path: c.req.path }, 'Unhandled error');
  return c.json({ error: 'Internal server error' }, 500);
});

// Start server (skipped during tests to allow `app.request()` testing)
const port = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port }, `${APP_NAME} API running on http://localhost:${info.port}/v2`);
    },
  );

  const shutdown = () => {
    logger.info('Graceful shutdown initiated...');
    server.close(() => {
      logger.info('Server closed. Exiting.');
      process.exit(0);
    });
    // Force exit after 10s if connections hang
    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
