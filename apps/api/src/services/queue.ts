import { Redis } from 'ioredis';
import { logger } from '../lib/logger.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  family: 0, // dual-stack: try IPv6 first, fallback to IPv4 (Railway private networking is IPv6)
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

redis.on('error', (err) => {
  logger.error({ err: err.message }, '[Redis] Connection error');
});

const QUEUE_KEY = 'kratos:jobs:pdf';
const DOCX_QUEUE_KEY = 'kratos:jobs:docx';
const ANALYSIS_QUEUE_KEY = 'kratos:jobs:analysis';

export interface PdfJob {
  documentId: string;
  userId: string;
  filePath: string;
  fileName: string;
}

export interface DocxJob {
  documentId: string;
  userId: string;
  fileName: string;
}

export interface AnalysisJob {
  documentId: string;
  userId: string;
  extractionId: string;
  rawText: string;
}

export const queueService = {
  async enqueuePdfExtraction(job: PdfJob) {
    try {
      await redis.lpush(QUEUE_KEY, JSON.stringify(job));
    } catch (err) {
      throw new Error(`Queue enqueue failed: ${(err as Error).message}`);
    }
  },

  async enqueueDocxExport(job: DocxJob) {
    try {
      await redis.lpush(DOCX_QUEUE_KEY, JSON.stringify(job));
    } catch (err) {
      throw new Error(`DOCX queue enqueue failed: ${(err as Error).message}`);
    }
  },

  async enqueueAnalysis(job: AnalysisJob) {
    try {
      await redis.lpush(ANALYSIS_QUEUE_KEY, JSON.stringify(job));
    } catch (err) {
      throw new Error(`Analysis queue enqueue failed: ${(err as Error).message}`);
    }
  },
};

export { redis as redisClient };
