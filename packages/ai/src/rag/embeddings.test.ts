import { describe, test, expect, vi } from 'vitest';

const mockEmbedDocuments = vi.fn();
const mockEmbedQuery = vi.fn();

vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    embedQuery: mockEmbedQuery,
    embedDocuments: mockEmbedDocuments,
  })),
}));

import { embeddingsService } from './embeddings.js';

describe('embeddingsService', () => {
  test('embedText returns a 1536-dim vector', async () => {
    const fakeVector = new Array(1536).fill(0.01);
    mockEmbedQuery.mockResolvedValueOnce(fakeVector);

    const result = await embeddingsService.embedText('test text');
    expect(result).toHaveLength(1536);
    expect(mockEmbedQuery).toHaveBeenCalledWith('test text');
  });

  test('embedBatch returns array of vectors', async () => {
    const fakeVectors = [
      new Array(1536).fill(0.01),
      new Array(1536).fill(0.02),
    ];
    mockEmbedDocuments.mockResolvedValueOnce(fakeVectors);

    const result = await embeddingsService.embedBatch(['text1', 'text2']);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1536);
    expect(mockEmbedDocuments).toHaveBeenCalledWith(['text1', 'text2']);
  });
});
