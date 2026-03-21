import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import type { AppEnv } from '../types.js';
import { IngestionPayloadSchema, RATE_LIMITS } from '@kratos/core';
import { storageService } from '../services/storage.js';
import { triggerService } from '../services/trigger.js';
import { documentRepo } from '../services/document-repo.js';
import { auditRepo } from '../services/audit-repo.js';
import { rateLimiter } from '../middleware/rate-limit.js';
import { validateIngestionUrl, FETCH_CONFIG } from '../services/url-validator.js';

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function isPdfContent(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return PDF_MAGIC_BYTES.every((byte, i) => buffer[i] === byte);
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, 200);
}

export const ingestionRouter = new Hono<AppEnv>();

ingestionRouter.post('/', rateLimiter(RATE_LIMITS.UPLOAD_PER_MINUTE), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const parsed = IngestionPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: 'Invalid ingestion payload', details: parsed.error.flatten() } }, 400);
  }

  const { source, pdfBase64, pdfUrl, fileName, metadata } = parsed.data;

  // Resolve PDF content from base64 or URL
  let fileBuffer: Buffer;

  if (pdfBase64) {
    fileBuffer = Buffer.from(pdfBase64, 'base64');
  } else if (pdfUrl) {
    // SSRF protection: validate URL before fetching
    const urlValidation = validateIngestionUrl(pdfUrl);
    if (!urlValidation.valid) {
      return c.json({ error: { message: `URL rejected: ${urlValidation.error}` } }, 400);
    }

    // Fetch with timeout and no redirects
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_CONFIG.TIMEOUT_MS);

    try {
      const res = await fetch(pdfUrl, {
        signal: controller.signal,
        redirect: 'error', // Block redirects to prevent SSRF via redirect
        headers: { Accept: 'application/pdf' },
      });

      if (!res.ok) {
        return c.json({ error: { message: `Failed to download PDF from URL: ${res.status}` } }, 400);
      }

      // Validate Content-Length before downloading body
      const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
      if (contentLength > FETCH_CONFIG.MAX_CONTENT_LENGTH) {
        return c.json({ error: { message: 'Remote PDF exceeds 50MB size limit' } }, 400);
      }

      // Validate Content-Type
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
        return c.json({ error: { message: `Remote URL did not return a PDF (Content-Type: ${contentType})` } }, 400);
      }

      fileBuffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return c.json({ error: { message: 'PDF download timed out' } }, 400);
      }
      return c.json({ error: { message: `Failed to download PDF: ${(err as Error).message}` } }, 400);
    } finally {
      clearTimeout(timeout);
    }
  } else {
    return c.json({ error: { message: 'Either pdfBase64 or pdfUrl must be provided' } }, 400);
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return c.json({ error: { message: 'File exceeds 50MB limit' } }, 400);
  }

  if (!isPdfContent(fileBuffer)) {
    return c.json({ error: { message: 'File content is not a valid PDF' } }, 400);
  }

  const safeName = sanitizeFileName(fileName);
  const documentId = crypto.randomUUID();
  const pdfHash = createHash('sha256').update(fileBuffer).digest('hex');

  // Dedup: same PDF for this user
  const existing = await documentRepo.findByHash(userId, pdfHash);
  if (existing) {
    const extraction = await documentRepo.getExtraction(existing.id);
    return c.json({
      data: existing,
      extraction,
      deduplicated: true,
      message: 'Documento identico ja processado anteriormente',
    }, 200);
  }

  const { path } = await storageService.uploadDocument({
    userId,
    documentId,
    fileName: safeName,
    fileBuffer,
    mimeType: 'application/pdf',
  });

  const doc = await documentRepo.create({
    id: documentId,
    userId,
    fileName: safeName,
    filePath: path,
    fileSize: fileBuffer.length,
    mimeType: 'application/pdf',
    pdfHash,
  });

  await triggerService.enqueuePdfExtraction({
    documentId: doc.id,
    userId: doc.userId,
    filePath: doc.filePath!,
    fileName: safeName,
    pdfHash,
  });

  await auditRepo.create({
    entityType: 'document',
    entityId: doc.id,
    action: 'ingest',
    payloadBefore: null,
    payloadAfter: { source, fileName: safeName, metadata: metadata ?? null },
    userId,
  });

  return c.json({ data: doc }, 201);
});
