import { describe, it, expect } from 'vitest';
import {
  ExtractionOutputSchema,
  DedupeCheckRequestSchema,
  DedupeCheckResponseSchema,
} from './extraction.js';

describe('ExtractionOutputSchema', () => {
  it('parses valid complete payload', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      rawText: 'Legal document content...',
      tablesCount: 3,
      pageCount: 10,
      extractionMethod: 'pdfplumber',
      contentJson: { pages: [{ page: 1, text: 'hello' }] },
    });
    expect(result.success).toBe(true);
  });

  it('parses valid minimal payload (status only)', () => {
    const result = ExtractionOutputSchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('parses failed status with error message', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'failed',
      error: 'PDF is corrupted',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('PDF is corrupted');
    }
  });

  it('rejects invalid status value', () => {
    const result = ExtractionOutputSchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects negative tablesCount', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      tablesCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects pageCount of 0 (minimum is 1)', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      pageCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('preserves extra fields in contentJson via record type', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      contentJson: { pages: [], customField: 'preserved' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentJson).toHaveProperty('customField', 'preserved');
    }
  });

  it('rejects missing status field', () => {
    const result = ExtractionOutputSchema.safeParse({
      rawText: 'some text',
    });
    expect(result.success).toBe(false);
  });

  it('parses v1.1.0 provenance fields (fileHash, contentHash, processingTimeMs)', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      rawText: 'content',
      fileHash: 'a'.repeat(64),
      contentHash: 'b'.repeat(64),
      processingTimeMs: 1500,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileHash).toBe('a'.repeat(64));
      expect(result.data.contentHash).toBe('b'.repeat(64));
      expect(result.data.processingTimeMs).toBe(1500);
    }
  });

  it('rejects fileHash with wrong length', () => {
    const result = ExtractionOutputSchema.safeParse({
      status: 'completed',
      fileHash: 'tooshort',
    });
    expect(result.success).toBe(false);
  });
});

describe('DedupeCheckRequestSchema', () => {
  it('parses valid dedup request', () => {
    const result = DedupeCheckRequestSchema.safeParse({
      userId: '00000000-0000-0000-0000-000000000001',
      pdfHash: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid userId', () => {
    const result = DedupeCheckRequestSchema.safeParse({
      userId: 'not-a-uuid',
      pdfHash: 'a'.repeat(64),
    });
    expect(result.success).toBe(false);
  });
});

describe('DedupeCheckResponseSchema', () => {
  it('parses duplicate response', () => {
    const result = DedupeCheckResponseSchema.safeParse({
      isDuplicate: true,
      existingDocumentId: '00000000-0000-0000-0000-000000000001',
      message: 'Documento identico ja processado',
    });
    expect(result.success).toBe(true);
  });

  it('parses non-duplicate response', () => {
    const result = DedupeCheckResponseSchema.safeParse({
      isDuplicate: false,
    });
    expect(result.success).toBe(true);
  });
});
