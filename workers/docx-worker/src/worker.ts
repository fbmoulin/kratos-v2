import Redis from 'ioredis';
import pino from 'pino';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db, analyses, documents, extractions } from '@kratos/db';
import { buildDocxBuffer } from '@kratos/tools';
import { desc, eq } from 'drizzle-orm';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const QUEUE_KEY = 'kratos:jobs:docx';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_BUCKET = process.env.SUPABASE_DOCX_BUCKET || 'documents';
const PENDING_SLEEP_MS = 1000;

let shutdown = false;

export interface DocxJob {
  documentId: string;
  userId: string;
  fileName: string;
}

function pickDraft(resultJson: Record<string, unknown> | null | undefined): string {
  if (!resultJson) return '';
  const payload = resultJson as Record<string, unknown>;
  const reviewedDraft = payload.reviewedDraft as string | undefined;
  const draft = payload.draft as string | undefined;
  const draftResult = payload.draftResult as string | undefined;
  const revisedContent = payload.revisedContent as Record<string, unknown> | undefined;
  const revisedDraft = revisedContent?.draft as string | undefined;
  return reviewedDraft || revisedDraft || draft || draftResult || '';
}

export async function startWorker() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    family: 0,
    maxRetriesPerRequest: 3,
  });

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );

  logger.info({ queue: QUEUE_KEY }, 'DOCX worker started');

  const handleShutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — finishing current job');
    shutdown = true;
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  while (!shutdown) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 5);
      if (!result) continue;

      const [, jobJson] = result;
      const job = JSON.parse(jobJson) as DocxJob;
      logger.info({ documentId: job.documentId }, 'Processing DOCX export job');

      await processDocxJob(job, supabase);
    } catch (err) {
      logger.error({ err }, 'Worker loop error');
      await new Promise((r) => setTimeout(r, PENDING_SLEEP_MS));
    }
  }

  await redis.quit();
  logger.info('DOCX worker shutdown complete');
}

export async function processDocxJob(job: DocxJob, supabase?: SupabaseClient) {
  const client = supabase ?? createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, job.documentId))
      .limit(1);

    if (!doc) {
      logger.warn({ documentId: job.documentId }, 'Document not found for DOCX export');
      return;
    }

    if (doc.userId !== job.userId) {
      logger.warn({ documentId: job.documentId }, 'DOCX job user mismatch');
      return;
    }

    if (doc.status !== 'reviewed') {
      logger.warn({ documentId: job.documentId }, 'Document is not reviewed for DOCX export');
      return;
    }

    const [extraction] = await db
      .select()
      .from(extractions)
      .where(eq(extractions.documentId, job.documentId))
      .limit(1);

    if (!extraction) {
      logger.warn({ documentId: job.documentId }, 'Extraction not found for DOCX export');
      return;
    }

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.extractionId, extraction.id))
      .orderBy(desc(analyses.createdAt))
      .limit(1);

    if (!analysis) {
      logger.warn({ documentId: job.documentId }, 'Analysis not found for DOCX export');
      return;
    }

    const draft = pickDraft(analysis.resultJson as Record<string, unknown>);
    if (!draft) {
      logger.warn({ documentId: job.documentId }, 'No draft content available for DOCX export');
      return;
    }

    const title = doc.fileName.replace(/\.pdf$/i, '');
    const buffer = await buildDocxBuffer(draft, { title });
    const path = `${job.userId}/${job.documentId}/${job.fileName}`;

    const { error } = await client.storage
      .from(DOCX_BUCKET)
      .upload(path, buffer, { contentType: DOCX_MIME, upsert: true });

    if (error) {
      throw new Error(`DOCX upload failed: ${error.message}`);
    }

    logger.info({ documentId: job.documentId, path }, 'DOCX export completed');
  } catch (err) {
    logger.error({ err, documentId: job.documentId }, 'DOCX export failed');
  }
}
