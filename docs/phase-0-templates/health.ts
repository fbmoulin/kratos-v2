import { Hono } from 'hono';
import { APP_NAME, APP_VERSION } from '@kratos/core';

export const healthRouter = new Hono();

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

healthRouter.get('/ready', (c) => {
  // TODO: Verificar conexão com DB e Redis
  return c.json({
    status: 'ready',
    checks: {
      database: 'pending',
      redis: 'pending',
      storage: 'pending',
    },
  });
});
