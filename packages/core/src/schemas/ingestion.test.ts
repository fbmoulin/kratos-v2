import { describe, test, expect } from 'vitest';
import { IngestionPayloadSchema } from './ingestion.js';

describe('IngestionPayloadSchema', () => {
  test('accepts valid base64 payload', () => {
    const result = IngestionPayloadSchema.safeParse({
      source: 'lex-intelligentia',
      pdfBase64: 'JVBER...',
      fileName: 'processo.pdf',
    });
    expect(result.success).toBe(true);
  });

  test('accepts valid URL payload', () => {
    const result = IngestionPayloadSchema.safeParse({
      source: 'n8n',
      pdfUrl: 'https://storage.example.com/docs/file.pdf',
      fileName: 'documento.pdf',
    });
    expect(result.success).toBe(true);
  });

  test('rejects when both pdfBase64 and pdfUrl are missing', () => {
    const result = IngestionPayloadSchema.safeParse({
      source: 'api',
      fileName: 'test.pdf',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('pdfBase64 or pdfUrl');
    }
  });

  test('rejects invalid URL format', () => {
    const result = IngestionPayloadSchema.safeParse({
      source: 'api',
      pdfUrl: 'not-a-url',
      fileName: 'test.pdf',
    });
    expect(result.success).toBe(false);
  });

  test('metadata is optional', () => {
    const withMeta = IngestionPayloadSchema.safeParse({
      source: 'lex-intelligentia',
      pdfBase64: 'JVBER...',
      fileName: 'processo.pdf',
      metadata: {
        numeroProcesso: '0001234-56.2024.8.08.0001',
        tribunal: 'TJES',
      },
    });
    expect(withMeta.success).toBe(true);

    const withoutMeta = IngestionPayloadSchema.safeParse({
      source: 'api',
      pdfBase64: 'JVBER...',
      fileName: 'doc.pdf',
    });
    expect(withoutMeta.success).toBe(true);
  });
});
