import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@kratos/db', () => ({
  db: { execute: vi.fn() },
}));

vi.mock('drizzle-orm', () => {
  const makeSql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const obj = { strings, values, getSQL: () => obj, queryChunks: [] };
    return obj;
  };
  makeSql.raw = (s: string) => s;
  return { sql: makeSql };
});

import { db } from '@kratos/db';
import { graphSearch, findRelatedEntities } from './graph-search.js';

const mockExecute = vi.mocked(db.execute);

beforeEach(() => {
  mockExecute.mockReset();
});

describe('graphSearch', () => {

  test('returns entities matching keyword query via ILIKE', async () => {
    mockExecute.mockResolvedValueOnce([
      { id: 'e1', name: 'Súmula 297', entity_type: 'sumula', content: 'CDC aplica-se a bancos', metadata: {} },
      { id: 'e2', name: 'Art. 51 CDC', entity_type: 'artigo', content: 'Cláusulas abusivas', metadata: {} },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    const results = await graphSearch({ query: 'CDC banco' });

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Súmula 297');
    expect(results[0].entityType).toBe('sumula');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

describe('findRelatedEntities', () => {
  test('returns entities via recursive CTE graph traversal', async () => {
    mockExecute.mockResolvedValueOnce([
      { id: 'e1', name: 'Súmula 297', entity_type: 'sumula', content: 'CDC + bancos', depth: 0, path: ['e1'] },
      { id: 'e2', name: 'Art. 3 CDC', entity_type: 'artigo', content: 'Consumidor', depth: 1, path: ['e1', 'e2'] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    const results = await findRelatedEntities('e1', 2);

    expect(results).toHaveLength(2);
    expect(results[0].depth).toBe(0);
    expect(results[1].depth).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
