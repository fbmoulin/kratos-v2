import { describe, it, expect } from 'vitest';
import { buildTracingConfig } from './tracing.js';

describe('buildTracingConfig', () => {
  const ctx = {
    extractionId: 'ext-1',
    documentId: 'doc-1',
    userId: 'user-1',
  };

  it('returns valid RunnableConfig shape', () => {
    const config = buildTracingConfig('router', ctx);
    expect(config).toHaveProperty('runName', 'kratos-router');
    expect(config).toHaveProperty('metadata');
    expect(config).toHaveProperty('tags');
  });

  it('includes correlation IDs in metadata', () => {
    const config = buildTracingConfig('specialist', ctx);
    expect(config.metadata).toMatchObject({
      extractionId: 'ext-1',
      documentId: 'doc-1',
      userId: 'user-1',
      node: 'specialist',
    });
  });

  it('adds optional model/legalMatter/complexity to metadata', () => {
    const config = buildTracingConfig('specialist', ctx, {
      model: 'claude-sonnet-4',
      legalMatter: 'civil',
      complexity: 65,
    });
    expect(config.metadata).toMatchObject({
      model: 'claude-sonnet-4',
      legalMatter: 'civil',
      complexity: 65,
    });
  });

  it('tags include node name and optional legalMatter', () => {
    const config = buildTracingConfig('drafter', ctx, { legalMatter: 'bancario' });
    expect(config.tags).toContain('kratos-v2');
    expect(config.tags).toContain('drafter');
    expect(config.tags).toContain('bancario');
  });

  it('works with empty extra object', () => {
    const config = buildTracingConfig('router', ctx, {});
    expect(config.metadata).not.toHaveProperty('model');
    expect(config.tags).toEqual(['kratos-v2', 'router']);
  });
});
