import { createHash } from 'node:crypto';
import { promptRepo } from './prompt-repo.js';

const CACHE_TTL_MS = 60_000; // 60 seconds

/** Resolved prompt with governance metadata for audit trail. */
export interface ResolvedPrompt {
  content: string;
  promptKey: string;
  version: number | null;
  contentHash: string;
  source: 'database' | 'fallback';
}

interface CacheEntry {
  resolved: ResolvedPrompt;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const isProduction = () =>
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

/**
 * Resolves a prompt by key: DB active version (with cache) → hardcoded fallback.
 *
 * **Production/Staging behavior:** If the DB query fails, throws an error instead of
 * falling back silently. This prevents undetected prompt drift in production.
 *
 * **Dev/Test behavior:** Falls back to hardcoded default with a warning log.
 *
 * Cache TTL: 60s. Returns governance metadata (version, hash, source) for audit trail.
 */
export async function resolvePrompt(
  promptKey: string,
  fallback: string,
): Promise<string> {
  const resolved = await resolvePromptWithMetadata(promptKey, fallback);
  return resolved.content;
}

/**
 * Resolves a prompt and returns full governance metadata.
 * Use this when you need to record prompt provenance in audit logs.
 */
export async function resolvePromptWithMetadata(
  promptKey: string,
  fallback: string,
): Promise<ResolvedPrompt> {
  const cached = cache.get(promptKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.resolved;
  }

  try {
    const active = await promptRepo.getActive(promptKey);
    if (active) {
      const resolved: ResolvedPrompt = {
        content: active.content,
        promptKey,
        version: active.version,
        contentHash: computeHash(active.content),
        source: 'database',
      };
      cache.set(promptKey, {
        resolved,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return resolved;
    }
  } catch (err) {
    if (isProduction()) {
      throw new Error(
        `[prompt-resolver] Failed to resolve prompt "${promptKey}" from DB in production. ` +
        `Fallback is disabled in production/staging to prevent silent prompt drift. ` +
        `Error: ${(err as Error).message}`,
      );
    }
    // Dev/test: warn but allow fallback
    console.warn(
      `[prompt-resolver] DB error resolving "${promptKey}", using hardcoded fallback:`,
      (err as Error).message,
    );
  }

  const resolved: ResolvedPrompt = {
    content: fallback,
    promptKey,
    version: null,
    contentHash: computeHash(fallback),
    source: 'fallback',
  };
  return resolved;
}

/** Clear the prompt cache. Used in tests and after prompt activation. */
export function clearPromptCache(): void {
  cache.clear();
}
