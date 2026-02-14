/**
 * @module routes/documents
 * Document management endpoints — upload, list, detail, extraction, and analysis.
 *
 * All routes require authentication via `authMiddleware` (applied in index.ts).
 * The `userId` from the JWT is available via `c.get('userId')` in all handlers.
 *
 * Current implementation returns scaffold responses. Phase 1 will integrate
 * Supabase Storage for uploads and the Celery worker for PDF processing.
 *
 * @route GET  /v2/documents          - List user's documents (paginated)
 * @route POST /v2/documents          - Upload new document (JSON metadata)
 * @route GET  /v2/documents/:id      - Get document details
 * @route GET  /v2/documents/:id/extraction - Get extraction results
 * @route POST /v2/documents/:id/analyze    - Queue AI analysis
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DocumentStatus } from '@kratos/core';

export const documentsRouter = new Hono();

/**
 * Zod schema for document upload request body.
 * Validates file metadata before processing.
 *
 * @property fileName - Original file name (1-255 chars)
 * @property fileSize - File size in bytes (max 50MB)
 */
const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(50 * 1024 * 1024), // Max 50MB
});

/**
 * List all documents for the authenticated user.
 * Returns paginated results with metadata.
 *
 * @todo Query `documents` table filtered by `c.get('userId')`
 * @todo Add query params for page, limit, status filter
 */
documentsRouter.get('/', async (c) => {
  return c.json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

/**
 * Upload a new document for processing.
 * Validates metadata via Zod, returns 201 with document stub.
 *
 * @todo Upload PDF to Supabase Storage
 * @todo Insert row into `documents` table
 * @todo Enqueue Celery job for PDF extraction
 */
documentsRouter.post('/', zValidator('json', uploadSchema), async (c) => {
  const body = c.req.valid('json');

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

/**
 * Get details for a specific document by ID.
 *
 * @todo Query `documents` table by ID + userId
 * @todo Return 404 if not found or not owned by user
 */
documentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  return c.json({
    id,
    status: DocumentStatus.PENDING,
    message: 'Document endpoint scaffold - implementation pending',
  });
});

/**
 * Get extraction results for a processed document.
 * Returns the structured content extracted by the PDF pipeline.
 *
 * @todo Query `extractions` table by documentId
 * @todo Return 404 if document not found or extraction not complete
 */
documentsRouter.get('/:id/extraction', async (c) => {
  const id = c.req.param('id');

  return c.json({
    documentId: id,
    extraction: null,
    message: 'Extraction endpoint scaffold - implementation pending',
  });
});

/**
 * Initiate AI analysis on a processed document.
 * Queues the document for LangGraph agent processing.
 * Returns 202 Accepted with analysis tracking ID.
 *
 * @todo Validate document exists and extraction is complete
 * @todo Invoke LangGraph agent orchestration
 * @todo Return analysis tracking ID for polling
 */
documentsRouter.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');

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
