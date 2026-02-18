import Redis from 'ioredis';
import pino from 'pino';
import { createAnalysisWorkflow, createInitialState } from '@kratos/ai';
import { db, analyses, documents } from '@kratos/db';
import { eq } from 'drizzle-orm';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const QUEUE_KEY = 'kratos:jobs:analysis';
const TIMEOUT_MS = 270_000; // 4.5 min (under Railway's 5min limit)

let shutdown = false;

export async function startWorker() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    family: 0,
    maxRetriesPerRequest: 3,
  });

  logger.info({ queue: QUEUE_KEY }, 'Analysis worker started');

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
      const job = JSON.parse(jobJson);
      logger.info({ documentId: job.documentId }, 'Processing analysis job');

      await processAnalysisJob(job);
    } catch (err) {
      logger.error({ err }, 'Worker loop error');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await redis.quit();
  logger.info('Worker shutdown complete');
}

export interface AnalysisJob {
  documentId: string;
  userId: string;
  extractionId: string;
  rawText: string;
}

export async function processAnalysisJob(job: AnalysisJob) {
  const startMs = Date.now();

  try {
    const workflow = createAnalysisWorkflow();
    const initialState = createInitialState({
      extractionId: job.extractionId,
      documentId: job.documentId,
      userId: job.userId,
      rawText: job.rawText,
    });

    // Race against timeout
    const finalState = await Promise.race([
      workflow.invoke(initialState),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout (4.5min)')), TIMEOUT_MS)
      ),
    ]);

    const latencyMs = Date.now() - startMs;

    // Persist analysis result
    await db.insert(analyses).values({
      extractionId: job.extractionId,
      agentChain: 'supervisor→router→rag→specialist→drafter',
      reasoningTrace: finalState.routerResult?.reasoning ?? null,
      resultJson: {
        firacResult: finalState.firacResult,
        draftResult: finalState.draftResult,
        routerResult: finalState.routerResult,
      },
      modelUsed: finalState.modelUsed ?? 'unknown',
      tokensInput: finalState.tokensInput ?? 0,
      tokensOutput: finalState.tokensOutput ?? 0,
      latencyMs,
    });

    // Update document status to completed
    await db.update(documents)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(documents.id, job.documentId));

    logger.info({ documentId: job.documentId, latencyMs, model: finalState.modelUsed }, 'Analysis complete');
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    logger.error({ err, documentId: job.documentId, latencyMs }, 'Analysis failed');

    // Update document status to failed
    await db.update(documents)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(documents.id, job.documentId));
  }
}
