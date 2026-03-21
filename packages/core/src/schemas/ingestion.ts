import { z } from 'zod';

/**
 * Schema for external document ingestion (Lex-Intelligentia, n8n, API).
 * Accepts PDF as base64 or URL — at least one must be provided.
 */
export const IngestionPayloadSchema = z.object({
  /** External source identifier */
  source: z.enum(['lex-intelligentia', 'n8n', 'api']),
  /** PDF file as base64 string */
  pdfBase64: z.string().optional(),
  /** URL to download PDF from */
  pdfUrl: z.string().url().optional(),
  /** Original filename */
  fileName: z.string().min(1),
  /** Optional metadata from external system */
  metadata: z.object({
    numeroProcesso: z.string().optional(),
    tribunal: z.string().optional(),
    classe: z.string().optional(),
    assunto: z.string().optional(),
  }).optional(),
}).refine(
  (d) => d.pdfBase64 || d.pdfUrl,
  { message: 'Either pdfBase64 or pdfUrl must be provided' },
);

export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;
