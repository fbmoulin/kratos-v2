import { describe, it, expect } from 'vitest';
import { ExtractionOutputSchema } from './extraction.js';

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
});
