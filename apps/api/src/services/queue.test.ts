import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockLpush = vi.fn().mockResolvedValue(1);
const mockQuit = vi.fn().mockResolvedValue('OK');

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    lpush: mockLpush,
    quit: mockQuit,
  })),
}));

const { queueService } = await import('./queue.js');

describe('QueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('enqueuePdfExtraction pushes job to Redis list', async () => {
    const job = {
      documentId: 'doc-1',
      userId: 'user-1',
      filePath: 'user-1/doc-1/test.pdf',
      fileName: 'test.pdf',
    };

    await queueService.enqueuePdfExtraction(job);

    expect(mockLpush).toHaveBeenCalledWith(
      'kratos:jobs:pdf',
      JSON.stringify(job),
    );
  });

  test('enqueuePdfExtraction throws on Redis error', async () => {
    mockLpush.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(
      queueService.enqueuePdfExtraction({
        documentId: 'd',
        userId: 'u',
        filePath: 'p',
        fileName: 'f',
      }),
    ).rejects.toThrow('Queue enqueue failed');
  });
});
