import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { promptRepo, clearPromptCache } from '@kratos/ai';
import { PromptValidationRequestSchema } from '@kratos/core';
import { auditRepo } from '../services/audit-repo.js';

export const promptsRouter = new Hono<AppEnv>();

/** List all active prompts */
promptsRouter.get('/', async (c) => {
  const prompts = await promptRepo.listKeys();
  return c.json({ data: prompts });
});

/** List all versions for a specific prompt key */
promptsRouter.get('/:key', async (c) => {
  const key = c.req.param('key');
  const versions = await promptRepo.listVersions(key);
  if (versions.length === 0) {
    return c.json({ error: { message: 'Prompt key not found' } }, 404);
  }
  return c.json({ data: versions });
});

/** Validate the active version of a prompt key */
promptsRouter.post('/:key/validate', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json().catch(() => ({}));

  const parsed = PromptValidationRequestSchema.safeParse({ promptKey: key, ...body });
  if (!parsed.success) {
    return c.json({ error: { message: 'Invalid validation request', details: parsed.error.flatten() } }, 400);
  }

  const validation = await promptRepo.validate(key);
  const active = await promptRepo.getActive(key);

  // If an expected hash was provided, verify it matches
  if (parsed.data.expectedHash && active?.contentHash) {
    if (parsed.data.expectedHash !== active.contentHash) {
      return c.json({
        valid: false,
        promptKey: key,
        activeVersion: active?.version ?? null,
        contentHash: active?.contentHash ?? null,
        status: active?.status ?? null,
        message: `Hash mismatch: expected ${parsed.data.expectedHash}, got ${active.contentHash}`,
      });
    }
  }

  return c.json({
    valid: validation.valid,
    promptKey: key,
    activeVersion: active?.version ?? null,
    contentHash: active?.contentHash ?? null,
    status: active?.status ?? null,
    message: validation.message,
  });
});

/** Activate a specific version of a prompt (deactivates all others) */
promptsRouter.post('/:key/activate/:version', async (c) => {
  const userId = c.get('userId');
  const key = c.req.param('key');
  const version = parseInt(c.req.param('version'), 10);

  if (isNaN(version) || version < 1) {
    return c.json({ error: { message: 'Invalid version number' } }, 400);
  }

  const result = await promptRepo.activate(key, version);
  if (!result) {
    return c.json({ error: { message: `Version ${version} not found for key "${key}"` } }, 404);
  }

  clearPromptCache();

  await auditRepo.create({
    entityType: 'prompt_version',
    entityId: result.id,
    action: 'prompt:activate',
    payloadBefore: null,
    payloadAfter: { promptKey: key, version, status: 'active' },
    userId,
  });

  return c.json({ data: result });
});
