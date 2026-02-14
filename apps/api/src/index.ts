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
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { APP_NAME, APP_VERSION } from '@kratos/core';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono().basePath('/v2');

// Global middleware — applied to all routes
app.use('*', logger());
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

// Start server (skipped during tests to allow `app.request()` testing)
const port = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`🚀 ${APP_NAME} API running on http://localhost:${info.port}/v2`);
    },
  );
}

export default app;
