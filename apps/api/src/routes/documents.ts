import { Hono } from 'hono';
import { storageService } from '../services/storage.js';
import { queueService } from '../services/queue.js';
import { documentRepo } from '../services/document-repo.js';
import { analysisRepo } from '../services/analysis-repo.js';
import { createAnalysisWorkflow, createInitialState } from '@kratos/ai';

export const documentsRouter = new Hono();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

documentsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');

  const result = await documentRepo.listByUser(userId, page, limit, status);
  return c.json(result);
});

documentsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.parseBody();

  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: { message: 'File is required' } }, 400);
  }

  if (file.type !== 'application/pdf') {
    return c.json({ error: { message: 'Only PDF files are allowed' } }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: { message: 'File exceeds 50MB limit' } }, 400);
  }

  const documentId = crypto.randomUUID();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { path } = await storageService.uploadDocument({
    userId,
    documentId,
    fileName: file.name,
    fileBuffer,
    mimeType: file.type,
  });

  const doc = await documentRepo.create({
    id: documentId,
    userId,
    fileName: file.name,
    filePath: path,
    fileSize: file.size,
    mimeType: file.type,
  });

  await queueService.enqueuePdfExtraction({
    documentId: doc.id,
    userId: doc.userId,
    filePath: doc.filePath!,
    fileName: doc.fileName,
  });

  return c.json({ data: doc }, 201);
});

documentsRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  return c.json({ data: doc });
});

documentsRouter.get('/:id/extraction', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  const extraction = await documentRepo.getExtraction(id);
  if (!extraction) {
    return c.json({ error: { message: 'Extraction not available' } }, 404);
  }

  return c.json({ data: extraction });
});

documentsRouter.post('/:id/analyze', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  // Validate document exists and belongs to user
  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  // Validate extraction exists
  const extraction = await documentRepo.getExtraction(id);
  if (!extraction) {
    return c.json({ error: { message: 'Extraction not available. Document must be processed first.' } }, 400);
  }

  // Run LangGraph analysis workflow
  const rawText = extraction.rawText || JSON.stringify(extraction.contentJson);
  const workflow = createAnalysisWorkflow();
  const initialState = createInitialState({
    extractionId: extraction.id,
    documentId: id,
    userId,
    rawText,
  });

  const finalState = await workflow.invoke(initialState);

  // Check for workflow errors
  if (finalState.error) {
    return c.json({ error: { message: `Analysis failed: ${finalState.error}` } }, 500);
  }

  // Persist analysis
  const analysis = await analysisRepo.create({
    extractionId: extraction.id,
    agentChain: 'supervisor→router→rag→specialist',
    reasoningTrace: finalState.routerResult?.reasoning ?? null,
    resultJson: {
      firacResult: finalState.firacResult,
      draftResult: finalState.draftResult,
      routerResult: finalState.routerResult,
    },
    modelUsed: finalState.modelUsed ?? 'unknown',
    tokensInput: finalState.tokensInput,
    tokensOutput: finalState.tokensOutput,
    latencyMs: finalState.latencyMs,
  });

  return c.json({
    data: {
      analysisId: analysis.id,
      firacResult: finalState.firacResult,
      draftResult: finalState.draftResult,
      routerResult: finalState.routerResult,
      modelUsed: finalState.modelUsed,
      tokens: {
        input: finalState.tokensInput,
        output: finalState.tokensOutput,
      },
      latencyMs: finalState.latencyMs,
    },
  });
});
