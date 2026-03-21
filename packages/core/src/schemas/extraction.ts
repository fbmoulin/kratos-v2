import { z } from 'zod';

/**
 * Official contract for PDF extraction pipeline output.
 * Validated at the boundary between Python subprocess (pdf_runner.py)
 * and TypeScript consumer (workers/trigger/src/pdf.ts).
 */
export const ExtractionOutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  rawText: z.string().optional(),
  tablesCount: z.number().int().min(0).optional(),
  pageCount: z.number().int().min(1).optional(),
  extractionMethod: z.string().optional(),
  contentJson: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;
