# KRATOS v2 — Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden KRATOS v2 for production deployment on Railway.app — fix all security vulnerabilities, add graceful shutdown, compile TypeScript, implement async analysis pipeline, and improve error handling across the full stack.

**Architecture:** 5 sprints covering security, build pipeline, async analysis worker, API/DB robustness, and frontend fixes. Each sprint is independently deployable. The analysis-worker is a new Node.js Railway service that reuses `@kratos/ai` for LLM orchestration via Redis BRPOP queue.

**Tech Stack:** Hono 4.7, ioredis, pino, Zod, Drizzle ORM, LangGraph.js, Vitest 3.2, Node.js 22, pnpm 9

---

## Sprint 1: Security Hardening

### Task 1: Auth Bypass Production Guard ✅ DONE

**Files:**
- Modify: `apps/api/src/middleware/auth.ts:15-20`
- Test: `apps/api/src/middleware/auth.test.ts` (create)

**Step 1: Write the failing test**

Create `apps/api/src/middleware/auth.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }),
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test('rejects auth bypass when NODE_ENV=production even with TEST_USER_ID', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TEST_USER_ID', 'bypass-user');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    // Re-import to get fresh module with new env
    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/', {
      headers: {},  // No Authorization header
    });

    expect(res.status).toBe(401);
  });

  test('allows auth bypass in development with TEST_USER_ID', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TEST_USER_ID', 'dev-user-456');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'test-key');

    const { authMiddleware } = await import('./auth.js');
    const { Hono } = await import('hono');

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.userId).toBe('dev-user-456');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @kratos/api test -- src/middleware/auth.test.ts`
Expected: FAIL — first test passes (bypass works in production), second test passes

**Step 3: Implement the guard**

In `apps/api/src/middleware/auth.ts`, replace lines 15-20:

```typescript
export async function authMiddleware(c: Context, next: Next) {
  // Dev-only auth bypass — NEVER allowed in production
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.TEST_USER_ID &&
    process.env.NODE_ENV !== 'production'
  ) {
    c.set('userId', process.env.TEST_USER_ID);
    return next();
  }
```

Actually simpler — just add the production guard at the top:

```typescript
export async function authMiddleware(c: Context, next: Next) {
  // Dev-only auth bypass — hard-blocked in production
  if (process.env.NODE_ENV !== 'production' && process.env.TEST_USER_ID) {
    c.set('userId', process.env.TEST_USER_ID);
    return next();
  }
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @kratos/api test -- src/middleware/auth.test.ts`
Expected: PASS (both tests)

**Step 5: Commit**

```bash
git add apps/api/src/middleware/auth.ts apps/api/src/middleware/auth.test.ts
git commit -m "fix(security): block auth bypass in production

NODE_ENV !== 'production' guard ensures TEST_USER_ID bypass
is unreachable in production, even if env var is accidentally set."
```

---

### Task 2: CORS Origin Validation at Startup ✅ DONE

**Files:**
- Modify: `apps/api/src/index.ts:42-52`
- Test: manual (startup behavior)

**Step 1: Write the validation**

In `apps/api/src/index.ts`, add after line 37 (`initSentry();`):

```typescript
// Validate critical env vars in production
if (process.env.NODE_ENV === 'production') {
  const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
    throw new Error('CORS_ORIGIN must be set to a non-localhost URL in production');
  }
}
```

**Step 2: Verify locally**

Run: `NODE_ENV=production pnpm --filter @kratos/api start`
Expected: Throws `Missing required env vars: SUPABASE_URL, ...`

**Step 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "fix(security): validate critical env vars at startup

Crashes fast in production if CORS_ORIGIN, SUPABASE_URL,
DATABASE_URL, or REDIS_URL are missing or misconfigured."
```

---

### Task 3: Apply Rate Limiter to Routes ✅ DONE

**Files:**
- Modify: `apps/api/src/index.ts` (import + apply)
- Modify: `apps/api/src/routes/documents.ts` (apply per-route)

**Step 1: Wire rate limiter into documents router**

In `apps/api/src/routes/documents.ts`, add import at top:

```typescript
import { rateLimiter } from '../middleware/rate-limit.js';
import { RATE_LIMITS } from '@kratos/core';
```

Apply to specific routes (add before handler):

```typescript
// POST /documents — upload (rate limited)
documentsRouter.post('/', rateLimiter(RATE_LIMITS.UPLOAD_PER_MINUTE), async (c) => {
  // ... existing handler
});

// POST /documents/:id/analyze — AI analysis (rate limited)
documentsRouter.post('/:id/analyze', rateLimiter(RATE_LIMITS.ANALYSIS_PER_MINUTE), async (c) => {
  // ... existing handler
});

// POST /documents/:id/export — DOCX export (rate limited)
documentsRouter.post('/:id/export', rateLimiter(RATE_LIMITS.EXPORT_PER_MINUTE), async (c) => {
  // ... existing handler
});
```

**Step 2: Run existing tests**

Run: `pnpm --filter @kratos/api test`
Expected: PASS (rate limiter returns 200 for first requests)

**Step 3: Commit**

```bash
git add apps/api/src/routes/documents.ts
git commit -m "fix(security): apply rate limiter to upload, analyze, export routes

Uses RATE_LIMITS from @kratos/core: upload 10/min, analyze 5/min, export 20/min."
```

---

### Task 4: PDF Magic Bytes Validation + Path Sanitization

**Files:**
- Modify: `apps/api/src/routes/documents.ts:30-55`
- Test: `apps/api/src/routes/documents.test.ts` (add cases)

**Step 1: Write failing tests**

Add to `apps/api/src/routes/documents.test.ts`:

```typescript
test('POST /v2/documents rejects non-PDF file masquerading as PDF', async () => {
  const fakeFile = new File([new Uint8Array([0x00, 0x00, 0x00])], 'evil.pdf', {
    type: 'application/pdf',
  });
  const form = new FormData();
  form.append('file', fakeFile);

  const res = await app.request('/v2/documents', {
    method: 'POST',
    body: form,
  });

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.message).toContain('not a valid PDF');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @kratos/api test -- src/routes/documents.test.ts`
Expected: FAIL — currently accepts any file with `type: application/pdf`

**Step 3: Implement validation**

In `apps/api/src/routes/documents.ts`, in the POST handler after getting `fileBuffer`:

```typescript
// Validate PDF magic bytes (%PDF-)
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
const fileHeader = new Uint8Array(fileBuffer.slice(0, 5));
if (fileHeader.length < 5 || !PDF_MAGIC.every((b, i) => b === fileHeader[i])) {
  return c.json({ error: { message: 'File is not a valid PDF (invalid magic bytes)' } }, 400);
}

// Sanitize filename
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
```

Use `safeName` instead of `file.name` for storage path.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @kratos/api test -- src/routes/documents.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/routes/documents.ts apps/api/src/routes/documents.test.ts
git commit -m "fix(security): validate PDF magic bytes and sanitize filenames

Rejects uploads that claim application/pdf but lack %PDF- header.
Sanitizes file.name to prevent path traversal in storage paths."
```

---

### Task 5: Audit Git History for API Key Leaks

**Step 1: Search git history**

```bash
git log --all -p -- .env | grep -E 'sk-ant-|sk-proj-|AIzaSy' | head -20
git log --all -p -- '*.env' | grep -E 'sk-ant-|sk-proj-|AIzaSy' | head -20
```

**Step 2: If keys found in history**

Rotate all 3 API keys immediately:
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys
- Google: https://console.cloud.google.com/apis/credentials

Update Railway env vars:
```bash
railway variables --service api --set "ANTHROPIC_API_KEY=<new-key>"
railway variables --service api --set "OPENAI_API_KEY=<new-key>"
railway variables --service api --set "GEMINI_API_KEY=<new-key>"
```

**Step 3: Commit**

```bash
git commit --allow-empty -m "security: audit complete — API keys rotated if needed"
```

---

## Sprint 2: Build & Deploy Pipeline

### Task 6: Real TypeScript Build for API

**Files:**
- Modify: `apps/api/package.json` (scripts.build, scripts.start)
- Modify: `apps/api/Dockerfile:27,47`
- Modify: `apps/api/tsconfig.json` (add declaration)

**Step 1: Update package.json build script**

In `apps/api/package.json`, replace scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "start:dev": "tsx src/index.ts",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  }
}
```

**Step 2: Update tsconfig.json**

In `apps/api/tsconfig.json`, ensure:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

Note: `module: "NodeNext"` + `moduleResolution: "NodeNext"` is required for ESM with `.js` extensions in imports.

**Step 3: Test the build locally**

```bash
pnpm --filter @kratos/api build
ls apps/api/dist/index.js
```

Expected: `dist/` contains compiled JS files

**Step 4: Update Dockerfile**

In `apps/api/Dockerfile`, change line 47:

```dockerfile
CMD ["node", "apps/api/dist/index.js"]
```

Remove `tsx` from production dependencies — move to devDependencies only (already there).

**Step 5: Update .dockerignore**

Remove `**/dist` from `.dockerignore` (line 36) since dist is now needed:

Actually, `dist` is generated inside Docker during build, not copied from host. The `.dockerignore` exclusion of `**/dist` is correct — it prevents stale local dist from being copied. Docker builds fresh via `pnpm build`.

**Step 6: Slim down production image**

In `apps/api/Dockerfile`, replace the prod stage (lines 29-47):

```dockerfile
# Stage 3: Production image
FROM node:22-slim AS prod
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy workspace manifests + lockfile
COPY --from=builder /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml /workspace/turbo.json ./
COPY --from=builder /workspace/apps/api/package.json apps/api/
COPY --from=builder /workspace/packages/core/package.json packages/core/
COPY --from=builder /workspace/packages/db/package.json packages/db/
COPY --from=builder /workspace/packages/ai/package.json packages/ai/
COPY --from=builder /workspace/workers/pdf-worker/package.json workers/pdf-worker/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=builder /workspace/apps/api/dist apps/api/dist/
COPY --from=builder /workspace/packages/core/dist packages/core/dist/
COPY --from=builder /workspace/packages/db/dist packages/db/dist/
COPY --from=builder /workspace/packages/ai/dist packages/ai/dist/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/v2/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/index.js"]
```

**Step 7: Build Docker image locally to verify**

```bash
docker build -f apps/api/Dockerfile -t kratos-api:test .
docker run --rm -e PORT=3001 -p 3001:3001 kratos-api:test
# In another terminal: curl http://localhost:3001/v2/health
```

**Step 8: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/Dockerfile
git commit -m "feat(build): compile API with tsc, run with node in production

Replaces tsx runtime with tsc compilation. Production image now uses
'node dist/index.js' and installs only production dependencies.
Docker image ~60% smaller."
```

---

### Task 7: SIGTERM Graceful Shutdown Handler

**Files:**
- Modify: `apps/api/src/index.ts:79-91`
- Modify: `apps/api/src/services/queue.ts` (export redis for shutdown)

**Step 1: Export Redis client for shutdown**

In `apps/api/src/services/queue.ts`, add export:

```typescript
export { redis as redisClient };
```

**Step 2: Add SIGTERM handler to index.ts**

In `apps/api/src/index.ts`, replace the server start block (lines 79-91):

```typescript
const port = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  const server = serve(
    { fetch: app.fetch, port },
    (info) => {
      console.log(`KRATOS v2 API running on http://localhost:${info.port}/v2`);
    },
  );

  // Graceful shutdown for Railway deploys
  const shutdown = async (signal: string) => {
    console.log(`${signal} received — shutting down gracefully...`);

    server.close(async () => {
      try {
        const { redisClient } = await import('./services/queue.js');
        await redisClient.quit();
      } catch { /* ignore */ }

      try {
        const { queryClient } = await import('@kratos/db');
        await queryClient.end();
      } catch { /* ignore */ }

      console.log('Shutdown complete.');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

**Step 3: Add SIGTERM to PDF worker**

In `workers/pdf-worker/src/tasks/extract_pdf.py`, add signal handling to `worker_loop()`:

```python
import signal

_shutdown = False

def _handle_sigterm(signum, frame):
    global _shutdown
    logger.info("SIGTERM received — finishing current job and shutting down")
    _shutdown = True

def worker_loop() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    signal.signal(signal.SIGINT, _handle_sigterm)

    r = redis.from_url(settings.redis_url)
    queue_key = settings.queue_key
    logger.info(f"PDF worker started (BRPOP mode), listening on {queue_key}")

    while not _shutdown:
        try:
            result = r.brpop(queue_key, timeout=5)
            if result:
                _, job_json = result
                job = json.loads(job_json)
                process_pdf_job(job)
        except KeyboardInterrupt:
            break
        except Exception:
            logger.exception("Unexpected error in worker loop")
            time.sleep(1)

    logger.info("Worker shutdown complete")
```

**Step 4: Run tests**

```bash
pnpm --filter @kratos/api test
```
Expected: PASS (shutdown handler only runs outside test mode)

**Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/services/queue.ts workers/pdf-worker/src/tasks/extract_pdf.py
git commit -m "feat(deploy): add SIGTERM graceful shutdown for Railway

API: closes HTTP server, Redis, DB pool on SIGTERM with 10s timeout.
PDF Worker: sets shutdown flag, finishes current job, exits cleanly."
```

---

### Task 8: Structured Pino Logging

**Files:**
- Create: `apps/api/src/lib/logger.ts`
- Modify: `apps/api/src/index.ts` (replace console + Hono logger)
- Modify: `apps/api/src/routes/health.ts` (use logger)

**Step 1: Create logger module**

Create `apps/api/src/lib/logger.ts`:

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});
```

**Step 2: Replace console.log/error in index.ts**

In `apps/api/src/index.ts`:

```typescript
import { logger } from './lib/logger.js';

// Replace Hono logger() with pino-based middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms }, 'request');
});

// In onError:
app.onError((err, c) => {
  logger.error({ err, path: c.req.path, method: c.req.method }, 'unhandled error');
  captureError(err, { path: c.req.path, method: c.req.method });
  return c.json({ error: 'Internal server error' }, 500);
});

// In server start:
logger.info({ port }, 'KRATOS v2 API started');
```

**Step 3: Run tests**

```bash
pnpm --filter @kratos/api test
```
Expected: PASS

**Step 4: Commit**

```bash
git add apps/api/src/lib/logger.ts apps/api/src/index.ts
git commit -m "feat(observability): replace console.* with structured pino logging

JSON logs in production, pretty-print in development. Logs include
method, path, status, and duration for every request."
```

---

### Task 9: Remove Stale fly.toml

**Step 1: Delete fly.toml**

```bash
rm fly.toml
git add fly.toml
git commit -m "chore: remove stale fly.toml — deploying to Railway"
```

---

## Sprint 3: Async Analysis Pipeline

### Task 10: Analysis Queue Infrastructure

**Files:**
- Modify: `apps/api/src/services/queue.ts` (add analysis queue)
- Create: `workers/analysis-worker/` (new service)

**Step 1: Add analysis queue to queue service**

In `apps/api/src/services/queue.ts`, add:

```typescript
const ANALYSIS_QUEUE_KEY = 'kratos:jobs:analysis';

export interface AnalysisJob {
  documentId: string;
  userId: string;
  rawText: string;
  extractionId: string;
}

// Add to queueService:
async enqueueAnalysis(job: AnalysisJob) {
  try {
    await redis.lpush(ANALYSIS_QUEUE_KEY, JSON.stringify(job));
  } catch (err) {
    throw new Error(`Analysis queue enqueue failed: ${(err as Error).message}`);
  }
},
```

**Step 2: Commit**

```bash
git add apps/api/src/services/queue.ts
git commit -m "feat(queue): add analysis job queue (kratos:jobs:analysis)"
```

---

### Task 11: Refactor POST /analyze to Async

**Files:**
- Modify: `apps/api/src/routes/documents.ts:106-169`

**Step 1: Replace synchronous handler**

Replace the `POST /:id/analyze` handler:

```typescript
// POST /documents/:id/analyze — enqueue AI analysis (async)
documentsRouter.post('/:id/analyze', rateLimiter(RATE_LIMITS.ANALYSIS_PER_MINUTE), async (c) => {
  const userId = c.get('userId') as string;
  const { id } = c.req.param();

  const doc = await documentRepo.getById(userId, id);
  if (!doc) return c.json({ error: { message: 'Document not found' } }, 404);

  const extraction = await documentRepo.getExtraction(id);
  if (!extraction) {
    return c.json({ error: { message: 'No extraction found. Upload and process the PDF first.' } }, 400);
  }

  const rawText = extraction.rawText || JSON.stringify(extraction.contentJson);
  if (!rawText || rawText.length < 10) {
    return c.json({ error: { message: 'Extraction has no usable text content' } }, 400);
  }

  // Update status to processing
  await documentRepo.updateStatus(id, 'processing');

  // Enqueue for async processing
  await queueService.enqueueAnalysis({
    documentId: id,
    userId,
    rawText,
    extractionId: extraction.id,
  });

  // Create audit log
  await auditRepo.create({ documentId: id, userId, action: 'analysis_queued' });

  return c.json({
    data: {
      documentId: id,
      status: 'processing',
      message: 'Analysis queued. Poll GET /documents/:id for status.',
    },
  }, 202);
});
```

**Step 2: Run tests**

```bash
pnpm --filter @kratos/api test
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/documents.ts
git commit -m "feat(api): refactor /analyze to async queue-based pipeline

Returns 202 Accepted immediately. Analysis runs in background via
analysis-worker. Client polls GET /documents/:id for completion."
```

---

### Task 12: Create Analysis Worker Service

**Files:**
- Create: `workers/analysis-worker/package.json`
- Create: `workers/analysis-worker/src/index.ts`
- Create: `workers/analysis-worker/src/worker.ts`
- Create: `workers/analysis-worker/Dockerfile`
- Create: `workers/analysis-worker/railway.toml`
- Modify: `pnpm-workspace.yaml` (add worker)

**Step 1: Create package.json**

Create `workers/analysis-worker/package.json`:

```json
{
  "name": "@kratos/analysis-worker",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@kratos/ai": "workspace:*",
    "@kratos/core": "workspace:*",
    "@kratos/db": "workspace:*",
    "ioredis": "^5.4.0",
    "pino": "^9.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `workers/analysis-worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

**Step 3: Create worker**

Create `workers/analysis-worker/src/worker.ts`:

```typescript
import Redis from 'ioredis';
import pino from 'pino';
import { createAnalysisWorkflow, createInitialState } from '@kratos/ai';
import { db } from '@kratos/db';
import { analyses, documents } from '@kratos/db/schema';
import { eq } from 'drizzle-orm';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const QUEUE_KEY = 'kratos:jobs:analysis';
const TIMEOUT_MS = 270_000; // 4.5 min (under Railway's 5min limit)

let shutdown = false;

export async function startWorker() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    family: 0,
    maxRetriesPerRequest: 3,
  });

  logger.info({ queue: QUEUE_KEY }, 'Analysis worker started');

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — finishing current job');
    shutdown = true;
  });

  while (!shutdown) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 5);
      if (!result) continue;

      const [, jobJson] = result;
      const job = JSON.parse(jobJson);
      logger.info({ documentId: job.documentId }, 'Processing analysis job');

      await processAnalysisJob(job);
    } catch (err) {
      logger.error({ err }, 'Worker loop error');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await redis.quit();
  logger.info('Worker shutdown complete');
}

async function processAnalysisJob(job: {
  documentId: string;
  userId: string;
  rawText: string;
  extractionId: string;
}) {
  const startMs = Date.now();

  try {
    const workflow = createAnalysisWorkflow();
    const initialState = createInitialState(job.rawText);

    // Race against timeout
    const finalState = await Promise.race([
      workflow.invoke(initialState),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), TIMEOUT_MS)
      ),
    ]) as Awaited<ReturnType<typeof workflow.invoke>>;

    const latencyMs = Date.now() - startMs;

    // Persist analysis result
    await db.insert(analyses).values({
      documentId: job.documentId,
      userId: job.userId,
      firacResult: finalState.firacResult,
      draftResult: finalState.draftResult,
      routerResult: finalState.routerResult,
      modelUsed: finalState.modelUsed,
      tokensInput: finalState.tokensInput ?? 0,
      tokensOutput: finalState.tokensOutput ?? 0,
      latencyMs,
    });

    // Update document status
    await db.update(documents)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(documents.id, job.documentId));

    logger.info({ documentId: job.documentId, latencyMs }, 'Analysis complete');
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    logger.error({ err, documentId: job.documentId, latencyMs }, 'Analysis failed');

    await db.update(documents)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(documents.id, job.documentId));
  }
}
```

**Step 4: Create entry point**

Create `workers/analysis-worker/src/index.ts`:

```typescript
import { startWorker } from './worker.js';

startWorker().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
```

**Step 5: Create Dockerfile**

Create `workers/analysis-worker/Dockerfile`:

```dockerfile
FROM node:22-slim AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY workers/analysis-worker/package.json workers/analysis-worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY apps/api/package.json apps/api/
COPY workers/pdf-worker/package.json workers/pdf-worker/

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY workers/analysis-worker/ workers/analysis-worker/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/ai/ packages/ai/

RUN pnpm build

FROM node:22-slim AS prod
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=builder /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/workers/analysis-worker/package.json workers/analysis-worker/
COPY --from=builder /workspace/packages/core/package.json packages/core/
COPY --from=builder /workspace/packages/db/package.json packages/db/
COPY --from=builder /workspace/packages/ai/package.json packages/ai/
COPY --from=builder /workspace/apps/api/package.json apps/api/
COPY --from=builder /workspace/workers/pdf-worker/package.json workers/pdf-worker/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /workspace/workers/analysis-worker/dist workers/analysis-worker/dist/
COPY --from=builder /workspace/packages/core/dist packages/core/dist/
COPY --from=builder /workspace/packages/db/dist packages/db/dist/
COPY --from=builder /workspace/packages/ai/dist packages/ai/dist/

ENV NODE_ENV=production
CMD ["node", "workers/analysis-worker/dist/index.js"]
```

**Step 6: Create railway.toml**

Create `workers/analysis-worker/railway.toml`:

```toml
[build]
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

**Step 7: Add to pnpm workspace**

In `pnpm-workspace.yaml`, add:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'workers/*'
```

(If `workers/*` is already there, no change needed.)

**Step 8: Install deps and test build**

```bash
pnpm install
pnpm --filter @kratos/analysis-worker build
```

**Step 9: Deploy to Railway**

```bash
railway add --service analysis-worker --repo fbmoulin/kratos-v2
railway variables --service analysis-worker --set 'REDIS_URL=${{Redis.REDIS_URL}}'
railway variables --service analysis-worker --set 'DATABASE_URL=postgresql://...'
railway variables --service analysis-worker --set 'ANTHROPIC_API_KEY=...'
railway variables --service analysis-worker --set 'GEMINI_API_KEY=...'
railway variables --service analysis-worker --set 'OPENAI_API_KEY=...'
railway variables --service analysis-worker --set 'SUPABASE_URL=https://qxttfjlgqkfurxxrorfn.supabase.co'
```

**Step 10: Commit**

```bash
git add workers/analysis-worker/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(worker): add analysis-worker for async LLM pipeline

New Railway service. BRPOP on kratos:jobs:analysis queue.
Runs LangGraph pipeline with 4.5min timeout, persists results,
handles SIGTERM gracefully."
```

---

## Sprint 4: API & Database Robustness

### Task 13: Zod Validation on Query Parameters

**Files:**
- Modify: `apps/api/src/routes/documents.ts:20-25`

**Step 1: Add Zod schemas**

In `apps/api/src/routes/documents.ts`, add after imports:

```typescript
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'reviewed']).optional(),
});
```

Replace the GET handler's query parsing:

```typescript
documentsRouter.get('/', async (c) => {
  const userId = c.get('userId') as string;
  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    status: c.req.query('status'),
  });

  if (!parsed.success) {
    return c.json({ error: { message: 'Invalid query parameters', details: parsed.error.flatten() } }, 400);
  }

  const { page, limit, status } = parsed.data;
  const offset = (page - 1) * limit;
  // ... rest of handler
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/documents.ts
git commit -m "fix(api): validate page/limit/status with Zod

Prevents NaN offset from invalid params. Bounds limit to 1-100."
```

---

### Task 14: Consistent Error Response Format

**Files:**
- Modify: `apps/api/src/index.ts:72-75`

**Step 1: Fix global error handler**

```typescript
app.onError((err, c) => {
  logger.error({ err, path: c.req.path, method: c.req.method }, 'unhandled error');
  captureError(err, { path: c.req.path, method: c.req.method });
  return c.json({ error: { message: 'Internal server error' } }, 500);
});
```

Change `error: 'Internal server error'` (string) to `error: { message: 'Internal server error' }` (object) to match route-level format.

**Step 2: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "fix(api): consistent error response format { error: { message } }"
```

---

### Task 15: Database Connection Pool Limits

**Files:**
- Modify: `packages/db/src/client.ts:24`

**Step 1: Add pool configuration**

```typescript
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 5,              // max connections in pool
  idle_timeout: 20,    // close idle connections after 20s
  connect_timeout: 10, // fail fast if can't connect in 10s
});
```

**Step 2: Commit**

```bash
git add packages/db/src/client.ts
git commit -m "fix(db): configure connection pool limits (max=5, idle=20s)"
```

---

### Task 16: LLM JSON.parse Hardening

**Files:**
- Create: `packages/ai/src/utils/parse-llm-json.ts`
- Modify: `packages/ai/src/graph/nodes/specialist.ts:48`
- Modify: `packages/ai/src/graph/nodes/router.ts:29`

**Step 1: Create utility**

Create `packages/ai/src/utils/parse-llm-json.ts`:

```typescript
/**
 * Extracts and parses JSON from LLM output that may contain
 * markdown fences, preamble text, or thinking blocks.
 */
export function parseLlmJson<T = unknown>(raw: string): T {
  // Try direct parse first
  try { return JSON.parse(raw); } catch { /* continue */ }

  // Strip markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }

  // Extract first { ... } block
  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return JSON.parse(raw.slice(braceStart, braceEnd + 1));
  }

  throw new Error(`Cannot extract JSON from LLM output: ${raw.slice(0, 200)}`);
}
```

**Step 2: Replace JSON.parse in specialist.ts:48**

```typescript
import { parseLlmJson } from '../../utils/parse-llm-json.js';
// ...
const parsed = parseLlmJson(content);
```

**Step 3: Replace JSON.parse in router.ts:29**

```typescript
import { parseLlmJson } from '../../utils/parse-llm-json.js';
// ...
const parsed = parseLlmJson(content);
```

**Step 4: Write test**

Create `packages/ai/src/utils/parse-llm-json.test.ts`:

```typescript
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

  test('extracts JSON from preamble text', () => {
    const input = 'Here is the result:\n{"a":1}\nDone.';
    expect(parseLlmJson(input)).toEqual({ a: 1 });
  });

  test('throws on non-JSON', () => {
    expect(() => parseLlmJson('not json at all')).toThrow('Cannot extract JSON');
  });
});
```

**Step 5: Run tests**

```bash
pnpm --filter @kratos/ai test -- src/utils/parse-llm-json.test.ts
```

**Step 6: Commit**

```bash
git add packages/ai/src/utils/parse-llm-json.ts packages/ai/src/utils/parse-llm-json.test.ts \
  packages/ai/src/graph/nodes/specialist.ts packages/ai/src/graph/nodes/router.ts
git commit -m "fix(ai): harden LLM JSON parsing with fence-stripping

parseLlmJson strips markdown fences and extracts JSON from
preamble text. Prevents pipeline failures from Gemini/Claude
response formatting variations."
```

---

### Task 17: RAG Error Logging

**Files:**
- Modify: `packages/ai/src/graph/nodes/rag.ts:75-84`

**Step 1: Add logging to catch block**

```typescript
} catch (err) {
  // Non-fatal but log for monitoring
  console.error('[RAG] Search failed — proceeding without context:', (err as Error).message);
  return {
    ragContext: { vectorResults: [], graphResults: [], fusedResults: [] },
    currentStep: 'specialist',
  };
}
```

**Step 2: Commit**

```bash
git add packages/ai/src/graph/nodes/rag.ts
git commit -m "fix(ai): log RAG errors instead of silently swallowing"
```

---

### Task 18: Generate Drizzle Baseline Migration

**Step 1: Generate migration**

```bash
cd packages/db
pnpm drizzle-kit generate
```

If `drizzle-kit` is not in devDependencies:
```bash
pnpm --filter @kratos/db add -D drizzle-kit
pnpm --filter @kratos/db exec drizzle-kit generate
```

**Step 2: Verify migration files**

```bash
ls packages/db/src/migrations/
```
Expected: SQL file(s) matching the current schema

**Step 3: Commit**

```bash
git add packages/db/src/migrations/ packages/db/package.json
git commit -m "feat(db): generate Drizzle baseline migration from current schema"
```

---

### Task 19: Redis Error Recovery Config

**Files:**
- Modify: `apps/api/src/services/queue.ts:3-5`

**Step 1: Add resilience options**

```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  family: 0,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
```

**Step 2: Commit**

```bash
git add apps/api/src/services/queue.ts
git commit -m "fix(redis): add error recovery and retry strategy

maxRetriesPerRequest=3, disables offline queue to fail fast,
exponential backoff on reconnect."
```

---

### Task 20: X-Request-ID Middleware

**Files:**
- Modify: `apps/api/src/index.ts` (add middleware)

**Step 1: Add after secureHeaders**

```typescript
import { randomUUID } from 'node:crypto';

// Request ID for log correlation
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});
```

**Step 2: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): add X-Request-ID middleware for log correlation"
```

---

## Sprint 5: Frontend Fixes

### Task 21: Fix API Base URL for Vercel

**Files:**
- Modify: `apps/web/src/lib/api.ts:3`

**Step 1: Read from env var**

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL || '/v2';
```

**Step 2: Set in Vercel env vars (dashboard)**

```
VITE_API_BASE_URL=https://api-production-8225.up.railway.app/v2
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "fix(web): read API base URL from VITE_API_BASE_URL env var

Fixes broken API calls on Vercel where /v2 relative path
hits Vercel's server instead of Railway API."
```

---

### Task 22: React Error Boundary

**Files:**
- Create: `apps/web/src/components/ErrorBoundary.tsx`
- Modify: `apps/web/src/main.tsx` (wrap app)

**Step 1: Create error boundary**

Create `apps/web/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 2: Wrap app in main.tsx**

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

// Wrap <App /> with <ErrorBoundary>
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Step 3: Commit**

```bash
git add apps/web/src/components/ErrorBoundary.tsx apps/web/src/main.tsx
git commit -m "feat(web): add React error boundary for crash recovery"
```

---

### Task 23: Auth Token Refresh

**Files:**
- Modify: `apps/web/src/lib/api.ts:5-7`

**Step 1: Use getSession with refresh**

```typescript
async function fetchWithAuth(path: string, init?: RequestInit) {
  // getSession returns cached token; refreshSession handles expiry
  let { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }

  if (!session) throw new Error('Not authenticated');

  // ... rest of function
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "fix(web): refresh expired auth token before API calls"
```

---

## Verification Checklist

After all sprints, run full verification:

```bash
# 1. All tests pass
pnpm test

# 2. Build compiles
pnpm build

# 3. Lint clean
pnpm lint

# 4. Docker builds
docker build -f apps/api/Dockerfile -t kratos-api:test .
docker build -f workers/analysis-worker/Dockerfile -t kratos-analysis:test .

# 5. Health check
curl https://api-production-8225.up.railway.app/v2/health
curl https://api-production-8225.up.railway.app/v2/health/ready

# 6. Push to trigger Railway auto-deploy
git push origin main
```
