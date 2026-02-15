import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@kratos/db', () => ({
  db: { execute: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
}));

import { db } from '@kratos/db';
import { vectorSearch } from './vector-search.js';

const mockExecute = vi.mocked(db.execute);

describe('vectorSearch', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns scored results from pgvector cosine similarity', async () => {
    mockExecute.mockResolvedValueOnce([
      { id: 'p1', content: 'Súmula 297 STJ', score: 0.92, category: 'bancario', source: 'STJ', metadata: {} },
      { id: 'p2', content: 'Art. 51 CDC', score: 0.85, category: 'consumidor', source: 'CDC', metadata: {} },
    ] as any);

    const embedding = new Array(1536).fill(0.01);
    const results = await vectorSearch({ embedding, limit: 5 });

    expect(results).toHaveLength(2);
    expect(results[0].content).toBe('Súmula 297 STJ');
    expect(results[0].score).toBe(0.92);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test('filters by category when provided', async () => {
    mockExecute.mockResolvedValueOnce([
      { id: 'p1', content: 'Dano moral bancário', score: 0.88, category: 'bancario', source: 'STJ', metadata: {} },
    ] as any);

    const embedding = new Array(1536).fill(0.02);
    const results = await vectorSearch({ embedding, limit: 3, category: 'bancario' });

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('bancario');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
