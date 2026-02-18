import { describe, test, expect } from 'vitest';
import { parseLlmJson } from './parse-llm-json.js';

describe('parseLlmJson', () => {
  test('parses clean JSON', () => {
    expect(parseLlmJson('{"a":1}')).toEqual({ a: 1 });
  });

  test('strips markdown fences', () => {
    const input = '```json\n{"a":1}\n```';
    expect(parseLlmJson(input)).toEqual({ a: 1 });
  });

  test('strips fences without json tag', () => {
    const input = '```\n{"a":1}\n```';
    expect(parseLlmJson(input)).toEqual({ a: 1 });
  });

  test('extracts JSON from preamble text', () => {
    const input = 'Here is the result:\n{"a":1}\nDone.';
    expect(parseLlmJson(input)).toEqual({ a: 1 });
  });

  test('throws on non-JSON', () => {
    expect(() => parseLlmJson('not json at all')).toThrow('Cannot extract JSON');
  });
});
