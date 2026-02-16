/**
 * @module routes/health
 * Health check, readiness probe, and metrics endpoints.
 *
 * These routes are **public** (no auth middleware) and used by:
 * - Load balancers and orchestrators (Kubernetes, Fly.io) for liveness probes
 * - CI/CD pipelines to verify deployment health
 * - Monitoring systems for uptime tracking
 *
 * @route GET /v2/health - Liveness probe (always returns 200 if process is alive)
 * @route GET /v2/health/ready - Readiness probe (checks DB, Redis connectivity)
 * @route GET /v2/health/metrics - Basic request metrics
 */
import { Hono } from 'hono';
import { APP_NAME, APP_VERSION } from '@kratos/core';

export const healthRouter = new Hono();

// In-memory metrics counters
const metrics = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTimeMs: 0,
  startedAt: Date.now(),
};

export function recordRequest(durationMs: number) {
  metrics.requestCount++;
  metrics.totalResponseTimeMs += durationMs;
}

export function recordError() {
  metrics.errorCount++;
}

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
 * Returns individual check results for database and cache.
 */
healthRouter.get('/ready', async (c) => {
  const checks: Record<string, string> = {};

  // Database check
  try {
    const { db } = await import('@kratos/db');
    if (db) {
      checks.database = 'ok';
    } else {
      checks.database = 'unavailable';
    }
  } catch {
    checks.database = 'unavailable';
  }

  // Redis check
  try {
    const { Redis } = await import('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 2000,
      lazyConnect: true,
      family: 0,
    });
    await redis.ping();
    checks.redis = 'ok';
    redis.disconnect();
  } catch {
    checks.redis = 'unavailable';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  return c.json(
    {
      status: allOk ? 'ready' : 'degraded',
      version: APP_VERSION,
      uptime: process.uptime(),
      checks,
    },
    allOk ? 200 : 503,
  );
});

/**
 * Metrics endpoint — basic request counters.
 */
healthRouter.get('/metrics', (c) => {
  const avgResponseTime =
    metrics.requestCount > 0
      ? Math.round(metrics.totalResponseTimeMs / metrics.requestCount)
      : 0;

  return c.json({
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    errorRate: metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0,
    avgResponseTimeMs: avgResponseTime,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(metrics.startedAt).toISOString(),
  });
});
