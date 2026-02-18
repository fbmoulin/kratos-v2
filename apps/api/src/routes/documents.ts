import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { z } from 'zod';
import { storageService } from '../services/storage.js';
import { queueService } from '../services/queue.js';
import { documentRepo } from '../services/document-repo.js';
import { analysisRepo } from '../services/analysis-repo.js';
import { auditRepo } from '../services/audit-repo.js';
import { rateLimiter } from '../middleware/rate-limit.js';
import { RATE_LIMITS } from '@kratos/core';

const reviewSchema = z.object({
  action: z.enum(['approved', 'revised', 'rejected']),
  comments: z.string().max(5000).default(''),
  revisedContent: z.record(z.unknown()).optional(),
});

export const documentsRouter = new Hono<AppEnv>();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'reviewed']).optional(),
});

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

/** Validate file starts with PDF magic bytes (%PDF) */
function isPdfContent(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return PDF_MAGIC_BYTES.every((byte, i) => buffer[i] === byte);
}

/** Sanitize filename: keep only safe chars, limit length */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, 200);
}

documentsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    status: c.req.query('status'),
  });

  if (!parsed.success) {
    return c.json({ error: { message: 'Invalid query parameters', details: parsed.error.flatten() } }, 400);
  }

  const { page, limit, status } = parsed.data;
  const result = await documentRepo.listByUser(userId, page, limit, status);
  return c.json(result);
});

documentsRouter.post('/', rateLimiter(RATE_LIMITS.UPLOAD_PER_MINUTE), async (c) => {
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

  // Validate PDF magic bytes — prevents spoofed MIME types
  if (!isPdfContent(fileBuffer)) {
    return c.json({ error: { message: 'File content is not a valid PDF' } }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  const { path } = await storageService.uploadDocument({
    userId,
    documentId,
    fileName: safeName,
    fileBuffer,
    mimeType: file.type,
  });

  const doc = await documentRepo.create({
    id: documentId,
    userId,
    fileName: safeName,
    filePath: path,
    fileSize: file.size,
    mimeType: file.type,
  });

  await queueService.enqueuePdfExtraction({
    documentId: doc.id,
    userId: doc.userId,
    filePath: doc.filePath!,
    fileName: safeName,
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

  const extraction = await documentRepo.getExtraction(id);
  const analysis = extraction ? await analysisRepo.getByExtractionId(extraction.id) : null;

  const resultJson = (analysis?.resultJson ?? {}) as Record<string, unknown>;
  const analysisPayload = analysis ? {
    ...analysis,
    resultJson: {
      ...resultJson,
      firac: resultJson.firac ?? resultJson.firacResult ?? null,
      router: resultJson.router ?? resultJson.routerResult ?? null,
      draft: resultJson.reviewedDraft ?? resultJson.draft ?? resultJson.draftResult ?? null,
      rawText: resultJson.rawText ?? extraction?.rawText ?? null,
    },
  } : null;

  return c.json({ data: doc, extraction, analysis: analysisPayload });
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

documentsRouter.post('/:id/analyze', rateLimiter(RATE_LIMITS.ANALYSIS_PER_MINUTE), async (c) => {
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

  const rawText = extraction.rawText || JSON.stringify(extraction.contentJson);
  if (!rawText || rawText.length < 10) {
    return c.json({ error: { message: 'Extraction has no usable text content' } }, 400);
  }

  // Update status to processing
  await documentRepo.updateStatus(userId, id, 'processing');

  // Enqueue for async processing by analysis-worker
  await queueService.enqueueAnalysis({
    documentId: id,
    userId,
    extractionId: extraction.id,
    rawText,
  });

  await auditRepo.create({
    entityType: 'document',
    entityId: id,
    action: 'analysis_queued',
    payloadBefore: { status: doc.status },
    payloadAfter: { status: 'processing' },
    userId,
  });

  return c.json({
    data: {
      documentId: id,
      status: 'processing',
      message: 'Analysis queued. Poll GET /documents/:id for status.',
    },
  }, 202);
});

// ============================================================
// PUT /:id/review — Human-in-the-Loop review action
// ============================================================

documentsRouter.put('/:id/review', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  if (doc.status !== 'completed') {
    return c.json({ error: { message: 'Document must be in completed status to review' } }, 400);
  }

  const body = await c.req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: 'Invalid review payload', details: parsed.error.flatten() } }, 400);
  }

  const { action, comments, revisedContent } = parsed.data;

  const statusMap: Record<string, string> = {
    approved: 'reviewed',
    revised: 'reviewed',
    rejected: 'pending',
  };

  if (action === 'revised' && revisedContent && typeof revisedContent.draft === 'string') {
    const extraction = await documentRepo.getExtraction(id);
    if (extraction) {
      const analysis = await analysisRepo.getByExtractionId(extraction.id);
      if (analysis) {
        await analysisRepo.updateResultJson(analysis.id, {
          ...(analysis.resultJson ?? {}),
          reviewedDraft: revisedContent.draft,
        });
      }
    }
  }

  const updatedDoc = await documentRepo.updateStatus(userId, id, statusMap[action]);

  await auditRepo.create({
    entityType: 'document',
    entityId: id,
    action: `review:${action}`,
    payloadBefore: { status: doc.status },
    payloadAfter: { status: statusMap[action], comments, revisedContent },
    userId,
  });

  return c.json({ data: updatedDoc });
});

// ============================================================
// GET /:id/export — Fetch DOCX signed URL (if ready)
// ============================================================

documentsRouter.get('/:id/export', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  if (doc.status !== 'reviewed') {
    return c.json({ error: { message: 'Document must be reviewed before export' } }, 400);
  }

  const fileName = doc.fileName.replace(/\.pdf$/i, '.docx');
  const path = `${userId}/${id}/${fileName}`;

  try {
    const signedUrl = await storageService.getSignedUrl(path, 600);
    return c.json({ data: { url: signedUrl } });
  } catch {
    return c.json({ error: { message: 'DOCX not ready yet' } }, 404);
  }
});

// ============================================================
// POST /:id/export — Trigger DOCX generation
// ============================================================

documentsRouter.post('/:id/export', rateLimiter(RATE_LIMITS.EXPORT_PER_MINUTE), async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const doc = await documentRepo.getById(userId, id);
  if (!doc) {
    return c.json({ error: { message: 'Document not found' } }, 404);
  }

  if (doc.status !== 'reviewed') {
    return c.json({ error: { message: 'Document must be reviewed before export' } }, 400);
  }

  // Queue DOCX generation job
  await queueService.enqueueDocxExport({
    documentId: id,
    userId,
    fileName: doc.fileName.replace(/\.pdf$/i, '.docx'),
  });

  await auditRepo.create({
    entityType: 'document',
    entityId: id,
    action: 'export:docx',
    payloadBefore: null,
    payloadAfter: { format: 'docx' },
    userId,
  });

  return c.json({ data: { message: 'Export queued', documentId: id } });
});
