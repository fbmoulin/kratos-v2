import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const QUEUE_KEY = 'kratos:jobs:pdf';

export interface PdfJob {
  documentId: string;
  userId: string;
  filePath: string;
  fileName: string;
}

export const queueService = {
  async enqueuePdfExtraction(job: PdfJob) {
    try {
      await redis.lpush(QUEUE_KEY, JSON.stringify(job));
    } catch (err) {
      throw new Error(`Queue enqueue failed: ${(err as Error).message}`);
    }
  },
};
