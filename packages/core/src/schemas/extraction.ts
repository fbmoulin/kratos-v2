import { z } from 'zod';

/**
 * Official contract for PDF extraction pipeline output (v1.1.0).
 * Validated at the boundary between Python subprocess (pdf_runner.py)
 * and TypeScript consumer (workers/trigger/src/pdf.ts).
 *
 * v1.1.0 additions: fileHash, contentHash, processingTimeMs for
 * provenance tracking and idempotency.
 */
export const ExtractionOutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  rawText: z.string().optional(),
  tablesCount: z.number().int().min(0).optional(),
  pageCount: z.number().int().min(1).optional(),
  extractionMethod: z.string().optional(),
  contentJson: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  /** SHA-256 of the original PDF file bytes */
  fileHash: z.string().length(64).optional(),
  /** SHA-256 of the extracted raw text content */
  contentHash: z.string().length(64).optional(),
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: z.number().int().min(0).optional(),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * Contract for deduplication check request.
 * Used by both /v2/documents and /v2/ingest routes.
 */
export const DedupeCheckRequestSchema = z.object({
  userId: z.string().uuid(),
  pdfHash: z.string().length(64),
});

export type DedupeCheckRequest = z.infer<typeof DedupeCheckRequestSchema>;

/**
 * Contract for deduplication check response.
 */
export const DedupeCheckResponseSchema = z.object({
  isDuplicate: z.boolean(),
  existingDocumentId: z.string().uuid().optional(),
  existingExtractionId: z.string().uuid().optional(),
  message: z.string().optional(),
});

export type DedupeCheckResponse = z.infer<typeof DedupeCheckResponseSchema>;
