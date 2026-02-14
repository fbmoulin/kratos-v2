import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DocumentStatus } from '@kratos/core';

export const documentsRouter = new Hono();

// Schema de validação para upload
const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(50 * 1024 * 1024), // Max 50MB
});

// GET /v2/documents - Listar documentos do usuário
documentsRouter.get('/', async (c) => {
  // TODO: Implementar com autenticação e query ao DB
  return c.json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

// POST /v2/documents - Upload de novo documento
documentsRouter.post('/', zValidator('json', uploadSchema), async (c) => {
  const body = c.req.valid('json');

  // TODO: Implementar upload para Supabase Storage e enfileiramento
  return c.json(
    {
      id: crypto.randomUUID(),
      fileName: body.fileName,
      fileSize: body.fileSize,
      status: DocumentStatus.PENDING,
      createdAt: new Date().toISOString(),
    },
    201,
  );
});

// GET /v2/documents/:id - Detalhes de um documento
documentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  // TODO: Implementar query ao DB
  return c.json({
    id,
    status: DocumentStatus.PENDING,
    message: 'Document endpoint scaffold - implementation pending',
  });
});

// GET /v2/documents/:id/extraction - Resultado da extração
documentsRouter.get('/:id/extraction', async (c) => {
  const id = c.req.param('id');

  // TODO: Implementar query ao DB
  return c.json({
    documentId: id,
    extraction: null,
    message: 'Extraction endpoint scaffold - implementation pending',
  });
});

// POST /v2/documents/:id/analyze - Iniciar análise com IA
documentsRouter.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');

  // TODO: Implementar invocação do LangGraph
  return c.json(
    {
      documentId: id,
      analysisId: crypto.randomUUID(),
      status: 'queued',
      message: 'Analysis endpoint scaffold - implementation pending',
    },
    202,
  );
});
