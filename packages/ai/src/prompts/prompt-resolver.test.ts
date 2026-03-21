import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./prompt-repo.js', () => ({
  promptRepo: {
    getActive: vi.fn().mockResolvedValue(null),
  },
}));

describe('resolvePrompt', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    const { clearPromptCache } = await import('./prompt-resolver.js');
    clearPromptCache();
  });

  it('returns hardcoded fallback when no DB entry exists', async () => {
    const { resolvePrompt } = await import('./prompt-resolver.js');
    const result = await resolvePrompt('test-key', 'hardcoded fallback');
    expect(result).toBe('hardcoded fallback');
  });

  it('returns DB content when active version exists', async () => {
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockResolvedValueOnce({
      id: '1',
      promptKey: 'test-key',
      version: 1,
      content: 'DB prompt content',
      isActive: true,
      status: 'active',
      contentHash: null,
      createdAt: new Date(),
    });

    const { resolvePrompt } = await import('./prompt-resolver.js');
    const result = await resolvePrompt('test-key', 'fallback');
    expect(result).toBe('DB prompt content');
  });

  it('caches DB result for subsequent calls within TTL', async () => {
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockResolvedValueOnce({
      id: '1',
      promptKey: 'cached-key',
      version: 1,
      content: 'cached content',
      isActive: true,
      status: 'active',
      contentHash: null,
      createdAt: new Date(),
    });

    const { resolvePrompt } = await import('./prompt-resolver.js');
    await resolvePrompt('cached-key', 'fallback');
    const result2 = await resolvePrompt('cached-key', 'fallback');

    expect(result2).toBe('cached content');
    expect(promptRepo.getActive).toHaveBeenCalledTimes(1); // Only 1 DB call
  });

  it('falls back to hardcoded on DB error in dev/test', async () => {
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockRejectedValueOnce(new Error('DB down'));

    const { resolvePrompt } = await import('./prompt-resolver.js');
    const result = await resolvePrompt('error-key', 'safe fallback');
    expect(result).toBe('safe fallback');
  });

  it('throws on DB error in production (no silent fallback)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockRejectedValueOnce(new Error('DB down'));

    const { resolvePromptWithMetadata, clearPromptCache } = await import('./prompt-resolver.js');
    clearPromptCache();

    await expect(
      resolvePromptWithMetadata('prod-key', 'fallback'),
    ).rejects.toThrow('Failed to resolve prompt');
  });

  it('clearPromptCache resets all cached entries', async () => {
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockResolvedValue({
      id: '1',
      promptKey: 'clear-key',
      version: 1,
      content: 'will be cleared',
      isActive: true,
      status: 'active',
      contentHash: null,
      createdAt: new Date(),
    });

    const { resolvePrompt, clearPromptCache } = await import('./prompt-resolver.js');
    await resolvePrompt('clear-key', 'fallback');
    clearPromptCache();

    // After clearing, should query DB again
    await resolvePrompt('clear-key', 'fallback');
    expect(promptRepo.getActive).toHaveBeenCalledTimes(2);
  });
});

describe('resolvePromptWithMetadata', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    const { clearPromptCache } = await import('./prompt-resolver.js');
    clearPromptCache();
    // Reset the default mock to return null (no active prompt)
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockResolvedValue(null);
  });

  it('returns metadata with DB source when active version exists', async () => {
    const { promptRepo } = await import('./prompt-repo.js');
    vi.mocked(promptRepo.getActive).mockResolvedValueOnce({
      id: '1',
      promptKey: 'meta-key',
      version: 3,
      content: 'versioned content',
      isActive: true,
      status: 'active',
      contentHash: null,
      createdAt: new Date(),
    });

    const { resolvePromptWithMetadata } = await import('./prompt-resolver.js');
    const result = await resolvePromptWithMetadata('meta-key', 'fallback');

    expect(result.source).toBe('database');
    expect(result.version).toBe(3);
    expect(result.promptKey).toBe('meta-key');
    expect(result.contentHash).toHaveLength(64); // SHA-256
  });

  it('returns metadata with fallback source when no DB entry', async () => {
    const { resolvePromptWithMetadata } = await import('./prompt-resolver.js');
    const result = await resolvePromptWithMetadata('missing-key', 'my fallback');

    expect(result.source).toBe('fallback');
    expect(result.version).toBeNull();
    expect(result.content).toBe('my fallback');
    expect(result.contentHash).toHaveLength(64);
  });
});
