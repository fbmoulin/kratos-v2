import { promptRepo } from './prompt-repo.js';

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  content: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Resolves a prompt by key: DB active version (with cache) → hardcoded fallback.
 *
 * Cache TTL: 60s. On DB error, falls back silently to the hardcoded default.
 * Returns the fallback if no DB version exists.
 */
export async function resolvePrompt(
  promptKey: string,
  fallback: string,
): Promise<string> {
  const cached = cache.get(promptKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.content;
  }

  try {
    const active = await promptRepo.getActive(promptKey);
    if (active) {
      cache.set(promptKey, {
        content: active.content,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return active.content;
    }
  } catch {
    // DB error — fall through to hardcoded default silently
  }

  return fallback;
}

/** Clear the prompt cache. Used in tests and after prompt activation. */
export function clearPromptCache(): void {
  cache.clear();
}
