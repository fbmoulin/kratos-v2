import { describe, test, expect } from 'vitest';
import { fusionRRF, type RankedItem } from './hybrid-search.js';

describe('fusionRRF', () => {
  test('fuses two ranked lists with Reciprocal Rank Fusion', () => {
    const listA: RankedItem[] = [
      { id: 'a', content: 'Doc A', score: 0.9, source: 'vector' },
      { id: 'b', content: 'Doc B', score: 0.8, source: 'vector' },
      { id: 'c', content: 'Doc C', score: 0.7, source: 'vector' },
    ];
    const listB: RankedItem[] = [
      { id: 'b', content: 'Doc B', score: 0.95, source: 'graph' },
      { id: 'd', content: 'Doc D', score: 0.85, source: 'graph' },
      { id: 'a', content: 'Doc A', score: 0.75, source: 'graph' },
    ];

    const fused = fusionRRF([listA, listB]);

    // 'b' appears in both lists (rank 1 in A, rank 0 in B) → highest combined score
    expect(fused[0].id).toBe('b');
    // 'a' appears in both lists (rank 0 in A, rank 2 in B) → second highest
    expect(fused[1].id).toBe('a');
    // All 4 unique items present
    expect(fused).toHaveLength(4);
    // Scores are normalized 0-1
    expect(fused[0].score).toBeGreaterThan(0);
    expect(fused[0].score).toBeLessThanOrEqual(1);
  });

  test('handles a single ranked list', () => {
    const list: RankedItem[] = [
      { id: 'x', content: 'Only result', score: 1.0, source: 'vector' },
    ];

    const fused = fusionRRF([list]);

    expect(fused).toHaveLength(1);
    expect(fused[0].id).toBe('x');
    expect(fused[0].score).toBeGreaterThan(0);
  });

  test('returns empty array for empty input', () => {
    expect(fusionRRF([])).toHaveLength(0);
    expect(fusionRRF([[], []])).toHaveLength(0);
  });

  test('uses custom k parameter for score calculation', () => {
    const list: RankedItem[] = [
      { id: 'a', content: 'Doc A', score: 0.9, source: 'vector' },
      { id: 'b', content: 'Doc B', score: 0.8, source: 'vector' },
    ];

    const fusedK10 = fusionRRF([list], 10);
    const fusedK60 = fusionRRF([list], 60);

    // With smaller k, the gap between rank 0 and rank 1 is larger
    const gapK10 = fusedK10[0].score - fusedK10[1].score;
    const gapK60 = fusedK60[0].score - fusedK60[1].score;
    expect(gapK10).toBeGreaterThan(gapK60);
  });
});
