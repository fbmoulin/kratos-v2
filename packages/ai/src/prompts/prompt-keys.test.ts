import { describe, it, expect } from 'vitest';
import { PROMPT_KEYS } from './prompt-keys.js';

describe('PROMPT_KEYS', () => {
  it('contains all expected keys', () => {
    expect(PROMPT_KEYS.ROUTER).toBeDefined();
    expect(PROMPT_KEYS.FIRAC_ENTERPRISE).toBeDefined();
    expect(PROMPT_KEYS.DRAFTER_GENERICO).toBeDefined();
    expect(PROMPT_KEYS.DRAFTER_BANCARIO).toBeDefined();
    expect(PROMPT_KEYS.DRAFTER_CONSUMIDOR).toBeDefined();
  });

  it('all values are lowercase strings', () => {
    for (const value of Object.values(PROMPT_KEYS)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(value.toLowerCase());
    }
  });
});
