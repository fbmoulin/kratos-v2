import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { promptRepo } from '@kratos/ai';

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
