# Project Index: KRATOS v2

Generated: 2026-02-16

## Overview

**KRATOS v2** — Knowledge-driven Reasoning and Automated Text Output System. Legal automation platform for Brazilian judiciary: ingests judicial PDFs, extracts content, applies FIRAC AI analysis via LangGraph agents, and generates legal document drafts with human-in-the-loop validation. CNJ 615/2025 + LGPD compliant.

## Project Structure

```
kratos-v2/                      # Turborepo monorepo (pnpm 9, Node 22+)
├── apps/
│   ├── api/                    # Hono REST API (tsx runtime, port 3001)
│   │   ├── src/index.ts        # Entry: Hono app, /v2 base, middleware chain, SIGTERM handler
│   │   ├── src/types.ts        # AppEnv — typed Hono context (userId, user)
│   │   ├── src/lib/logger.ts   # Pino structured logging (JSON prod, pretty dev, silent test)
│   │   ├── src/middleware/      # auth.ts (Supabase JWT), rate-limit.ts
│   │   ├── src/routes/         # health.ts, documents.ts (CRUD + upload + analyze)
│   │   └── src/services/       # storage.ts, queue.ts, document-repo.ts
│   └── web/                    # React 19 + Vite 6 + Tailwind 4 + shadcn/ui (port 5173)
│       └── src/                # Pages (Login, Dashboard, Review), components, hooks
├── packages/
│   ├── core/                   # Shared types, enums, constants (zero deps)
│   │   └── src/index.ts        # DocumentStatus, UserRole, LegalMatter, FIRACResult, etc.
│   ├── db/                     # Drizzle ORM + PostgreSQL (Supabase) + pgvector
│   │   ├── src/schema/documents.ts  # 8 tables: documents, extractions, analyses, precedents, graphEntities, graphRelations, promptVersions, auditLogs
│   │   ├── src/client.ts       # DB singleton (postgres.js driver)
│   │   └── drizzle.config.ts   # Migration config
│   ├── ai/                     # LangGraph agents, RAG, prompts (Phase 2 DONE)
│   │   ├── src/graph/          # state.ts, workflow.ts, nodes/ (supervisor, router, rag, specialist, drafter)
│   │   ├── src/prompts/        # firac-enterprise.ts, drafter.ts, templates.ts
│   │   ├── src/rag/            # embeddings.ts, vector-search.ts, graph-search.ts, hybrid-search.ts
│   │   ├── src/router/         # model-router.ts (7-factor complexity, 5-tier selection)
│   │   └── src/providers/      # anthropic.ts, google.ts (LangChain wrappers)
│   └── tools/                  # PDF/DOCX utilities (Phase 3 stub)
│       └── src/index.ts        # Placeholder — TODO Phase 3
├── workers/
│   └── pdf-worker/             # Python async worker (Redis BRPOP queue)
│       ├── src/tasks/extract_pdf.py  # Main loop: download → extract → validate → save
│       ├── src/services/        # pdf_extraction.py (pdfplumber), storage.py, database.py
│       ├── src/models/extraction.py  # Pydantic: ExtractionResult, TableData, ImageData
│       └── tests/               # 5 test files (pytest)
├── scripts/                    # seed-precedents.ts, test-e2e-full.ts, test-e2e-pipeline.ts, init_project.sh
├── docs/                       # 20 markdown docs (architecture, API, roadmap, deploy, etc.)
├── docker-compose.yml          # Redis 7 + Redis Commander (dev) + pdf-worker (profiles: [worker])
└── docker-compose.test.yml     # CI test infrastructure
```

## Entry Points

| What | Path | Command |
|------|------|---------|
| API server | `apps/api/src/index.ts` | `pnpm --filter @kratos/api dev` |
| Web frontend | `apps/web/src/main.tsx` | `pnpm --filter @kratos/web dev` |
| PDF worker | `workers/pdf-worker/src/tasks/extract_pdf.py` | `python -m src.tasks.extract_pdf` |
| Seed precedents | `scripts/seed-precedents.ts` | `pnpm seed` |
| E2E test (full) | `scripts/test-e2e-full.ts` | `TEST_USER_ID=<uuid> pnpm e2e` |
| E2E test (AI) | `scripts/test-e2e-pipeline.ts` | `node --env-file=.env tsx scripts/test-e2e-pipeline.ts` |
| All dev | — | `pnpm dev` (Turbo) |
| Build | — | `pnpm build` |
| Test | — | `pnpm test` |
| Lint | — | `pnpm lint` |

## Core Modules

### @kratos/core (packages/core)
- **Purpose:** Shared types, enums, constants — zero external deps
- **Exports:** `DocumentStatus`, `UserRole`, `LegalMatter`, `ReviewAction`, `AIModel`, `Document`, `Extraction`, `Analysis`, `AuditLog`, `Precedent`, `PromptVersion`, `FIRACResult`, `ReviewPayload`, `APP_NAME`, `APP_VERSION`, `CACHE_TTL`, `RATE_LIMITS`, `SLA`

### @kratos/db (packages/db)
- **Purpose:** Drizzle ORM schema, DB client, migrations
- **Exports:** `documents`, `extractions`, `analyses`, `precedents`, `graphEntities`, `graphRelations`, `promptVersions`, `auditLogs`, `db`, `queryClient`
- **Driver:** postgres.js → Supabase PostgreSQL + pgvector (1536-dim embeddings)
- **Tables:** 8 (all UUID PKs, timezone timestamps, cascade deletes)
- **Seed data:** 100 STJ precedents with embeddings (via `pnpm seed`)

### @kratos/api (apps/api)
- **Purpose:** REST API — Hono framework, `/v2` base path
- **Middleware:** pino logger → secureHeaders → CORS → auth (Supabase JWT on /documents/*) → rate-limit
- **Logging:** Pino 9 — JSON in production, pino-pretty in dev, silent in test
- **Graceful shutdown:** SIGTERM/SIGINT handlers with 10s force-exit timeout
- **Types:** `AppEnv` — typed Hono context variables (`userId`, `user`)
- **Routes:**
  - `GET /v2/` — API info (public)
  - `GET /v2/health` — Liveness probe (public)
  - `GET /v2/health/ready` — Readiness probe (public)
  - `GET /v2/documents` — List (paginated, owner-scoped)
  - `POST /v2/documents` — Upload PDF (50MB limit, multipart)
  - `GET /v2/documents/:id` — Get document
  - `GET /v2/documents/:id/extraction` — Get extraction result
  - `POST /v2/documents/:id/analyze` — Trigger AI analysis (LangGraph pipeline)
  - `POST /v2/documents/:id/review` — HITL approve/reject
  - `GET /v2/health/metrics` — Request count, error rate, avg latency
- **Services:** `storageService` (Supabase Storage), `queueService` (Redis LPUSH), `documentRepo` (Drizzle queries), `analysisService` (LangGraph), `reviewService`
- **Monitoring:** Sentry (`@sentry/node` via `app.onError`)
- **Build:** `tsc --noEmit` type-check (tsx runtime, no emit)
- **Tests:** 26 passing (5 suites)

### @kratos/web (apps/web) — Phase 3 DONE
- **Purpose:** React 19 frontend — Dashboard, HITL review, document management
- **Stack:** Vite 6 + Tailwind CSS 4 + shadcn/ui + Supabase Auth + React Router v7
- **Pages:** Login (email+password), Dashboard (upload + table + stats), Review (HITL approval/rejection)
- **Components:** DocumentTable, UploadZone, StatsBar, MinutaEditor, ReviewPanel, Layout, AuthGuard
- **Hooks:** useDocuments (React Query), useAuth (Supabase), useAnalysis
- **Tests:** 34 passing (9 suites)

### @kratos/ai (packages/ai) — Phase 2 DONE
- **Purpose:** LangGraph agent orchestration, RAG engine, prompt management
- **Pipeline:** supervisor → router (Gemini Flash) → rag (pgvector) → specialist (FIRAC+ Claude) → drafter (domain minuta)
- **Modules:** graph/ (state, workflow, 5 nodes), prompts/ (firac-enterprise, drafter, templates), rag/ (embeddings, vector-search, graph-search, hybrid-search), router/ (model-router), providers/ (anthropic, google)
- **Tests:** 70 passing (15 suites)

### @kratos/tools (packages/tools) — Phase 3 stub
- **Purpose:** DOCX export, input sanitization

### pdf-worker (workers/pdf-worker)
- **Purpose:** Async PDF extraction via Redis queue
- **Pipeline:** Redis BRPOP → Supabase download → pdfplumber extract → Pydantic validate → DB save
- **Queue key:** `kratos:jobs:pdf`
- **Models:** `ExtractionResult` (text, tables, images, metadata)

## Database Schema (Supabase project `jzgdorcvfxlahffqnyor`)

| Table | Key Columns | Indexes |
|-------|-------------|---------|
| `documents` | id, userId, fileName, filePath, fileSize, status, pages | userId, status |
| `extractions` | id, documentId (FK→documents), contentJson, rawText | documentId |
| `analyses` | id, extractionId (FK→extractions), agentChain, resultJson, modelUsed | extractionId |
| `precedents` | id, content, embedding (vector 1536), category, source | category |
| `graph_entities` | id, name, entityType, content, embedding (vector 1536) | entityType, name |
| `graph_relations` | id, sourceId (FK), targetId (FK), relationType, weight | sourceId, targetId, relationType |
| `prompt_versions` | id, promptKey, version, content, isActive | (promptKey, isActive), UNIQUE(promptKey, version) |
| `audit_logs` | id, entityType, entityId, action, payloadBefore/After | (entityType, entityId), userId |

## Configuration

| File | Purpose |
|------|---------|
| `turbo.json` | Task pipeline: build (^build deps), dev, lint, test, clean |
| `pnpm-workspace.yaml` | Workspaces: apps/*, packages/*, workers/* |
| `tsconfig.json` | ES2022, bundler resolution, @kratos/* path aliases |
| `docker-compose.yml` | Redis 7 (port 6379) + Redis Commander (8081, debug profile) |
| `docker-compose.test.yml` | CI test infrastructure |
| `.env.example` | Template for env vars |
| `eslint.config.js` | ESLint 9 flat config |

## Test Coverage

| Package | Tests | Suites | Framework |
|---------|-------|--------|-----------|
| @kratos/ai | 70 | 15 | Vitest 3 |
| @kratos/web | 34 | 9 | Vitest 3 |
| @kratos/db | 31 | 8 | Vitest 3 |
| @kratos/api | 26 | 5 | Vitest 3 |
| @kratos/core | 18 | 2 | Vitest 3 |
| pdf-worker | — | 5 | pytest |
| **Total** | **179+** | **44** | Coverage: Vitest v8 with thresholds |

## Key Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| hono | ^4.7 | API framework (ultrafast, Edge-compatible) |
| pino | ^9.6 | Structured JSON logging |
| drizzle-orm | ^0.39 | Type-safe PostgreSQL ORM |
| postgres | ^3.4 | PostgreSQL driver (postgres.js) |
| @supabase/supabase-js | ^2.49 | Auth, Storage, DB client |
| ioredis | ^5.4 | Redis client (queue, cache) |
| react | ^19 | Frontend UI |
| vite | ^6.1 | Frontend bundler |
| tailwindcss | ^4.0 | CSS framework (v4 architecture) |
| pdfplumber | — | Python PDF text/table extraction |
| pydantic | — | Python data validation |
| turbo | ^2.4 | Monorepo task orchestration |
| vitest | ^3.0 | Test runner (TypeScript) |

## Git Info

- **Branch:** `main` (active)
- **GitHub:** `fbmoulin/kratos-v2`
- **CI/CD:** GitHub Actions — 4 workflows:
  - `ci.yml` — lint, build, test:coverage on push/PR
  - `deploy-staging.yml` — Vercel + Railway auto-deploy on push to main
  - `deploy-production.yml` — Vercel + Railway on tag `v*` (manual approval)
  - `integration.yml` — nightly docker-compose integration tests
- **Deploy:** Railway (API + pdf-worker + Redis) + Vercel (web)
- **API URL:** `https://api-production-8225.up.railway.app`

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure
docker-compose up -d

# 3. Configure environment
cp .env.example .env  # Fill SUPABASE_URL, SUPABASE_KEY, REDIS_URL, API keys

# 4. Run DB migrations
pnpm --filter @kratos/db db:push

# 5. Start dev servers
pnpm dev
# → API: http://localhost:3001/v2
# → Web: http://localhost:5173

# 6. Run tests
pnpm test
```

## Development Phase Status

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 0 | ✅ Done | Monorepo setup, CI, DB schema, Drizzle, security hardening |
| Phase 1 | ✅ Done | API (Hono), Auth, Documents CRUD, PDF worker scaffold, Storage |
| Phase 2 | ✅ Done | LangGraph agents, FIRAC+ analysis, RAG engine, model routing, 70 tests |
| Phase 2.5 | ✅ Done | DB applied (8 tables + pgvector), 100 STJ precedents seeded, E2E scripts |
| Phase 3 | ✅ Done | Frontend (React 19 + shadcn/ui), Login/Dashboard/Review, HITL UI, 28 web tests |
| Phase 4 | ✅ Done | 179 tests, Sentry, coverage, CD workflows, Railway deploy (LIVE) |
| Hardening | 🔄 In Progress | Sprints 1-2 done (security, build/deploy), Sprints 3-5 pending |
