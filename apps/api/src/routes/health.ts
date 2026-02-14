/**
 * @module routes/health
 * Health check and readiness probe endpoints.
 *
 * These routes are **public** (no auth middleware) and used by:
 * - Load balancers and orchestrators (Kubernetes, Fly.io) for liveness probes
 * - CI/CD pipelines to verify deployment health
 * - Monitoring systems for uptime tracking
 *
 * @route GET /v2/health - Liveness probe (always returns 200 if process is alive)
 * @route GET /v2/health/ready - Readiness probe (checks DB, Redis, Storage connectivity)
 */
import { Hono } from 'hono';
import { APP_NAME, APP_VERSION } from '@kratos/core';

export const healthRouter = new Hono();

/**
 * Liveness probe — confirms the API process is running.
 * Returns service metadata and uptime. Always returns 200 if reachable.
 */
healthRouter.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: APP_NAME,
    version: APP_VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Readiness probe — checks downstream dependency connectivity.
 * Returns individual check results for database, cache, and storage.
 *
 * @todo Connect to actual DB, Redis, and Supabase Storage health checks
 */
healthRouter.get('/ready', (c) => {
  return c.json({
    status: 'ready',
    checks: {
      database: 'pending',
      redis: 'pending',
      storage: 'pending',
    },
  });
});
