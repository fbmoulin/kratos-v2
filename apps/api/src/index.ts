import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { APP_NAME, APP_VERSION } from '@kratos/core';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';

const app = new Hono().basePath('/v2');

// Middleware global
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

// Rotas
app.route('/health', healthRouter);
app.route('/documents', documentsRouter);

// Root
app.get('/', (c) => {
  return c.json({
    name: APP_NAME,
    version: APP_VERSION,
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Iniciar servidor
const port = parseInt(process.env.PORT || '3001', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 ${APP_NAME} API running on http://localhost:${info.port}/v2`);
  },
);

export default app;
