# Changelog - KRATOS v2

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2026-02-18 — DOCX Worker + Code Quality Fixes

### Adicionado

#### DOCX Worker (`workers/docx-worker/`)
- **DOCX export worker:** New Node.js service consuming `kratos:jobs:docx` Redis queue — fetches analysis, builds `.docx` buffer via `@kratos/tools`, uploads to Supabase Storage
- **`@kratos/tools` buildDocxBuffer:** Full markdown-aware DOCX generation (headings H1–H3, bullet lists, paragraphs) using `docx` library
- **docker-compose.yml:** Added `docx-worker` service (profile: worker)
- **`GET /v2/documents/:id/export`:** New endpoint — returns signed Supabase Storage URL for ready DOCX file
- **useExport polling:** Frontend polls GET `/export` every 5s (max 12 attempts × 60s) before redirecting user to download URL
- **Per-worker `turbo.json`:** `analysis-worker`, `docx-worker`, `pdf-worker` each have `outputs: []` override — eliminates Turborepo build warnings
- **`analysisRepo.updateResultJson()`:** New method for updating analysis JSON after HITL review
- **2 new tests:** `@kratos/docx-worker` — worker + job processing

#### Document Detail Enhancement
- **`GET /v2/documents/:id`:** Now returns `{ data: doc, extraction, analysis }` — full pipeline context in one request
- **Analysis payload normalization:** FIRAC, router, draft fields aliased from multiple possible keys for backwards compat

#### Core
- **`DocumentStatus.REVIEWED`:** Added `'reviewed'` status value to lifecycle enum

### Corrigido (Code Quality)
- **`@kratos/core` test:** `DocumentStatus` assertion updated to `toHaveLength(5)` (was 4, missed `REVIEWED`)
- **Redis singleton in health route:** `GET /v2/health/ready` now pings shared `redisClient` instead of creating a new connection per request
- **`@kratos/db` migrate.ts:** Replaced `console.log` with pino structured logger; added `pino` as explicit dependency
- **AI nodes typing:** `drafter.ts` + `specialist.ts` replaced `(response as any).usage_metadata` with `AIMessage` import from `@langchain/core/messages` — eliminates `eslint-disable` suppressions
- **Node engine requirement:** `package.json` changed `>=22.0.0` → `>=20.0.0` (project runs on Node 20 LTS)

### Modificado
- **All `package.json`:** Version `2.5.0` → `2.6.0`
- **`@kratos/core`:** `APP_VERSION` constant reflects `2.6.0`

---

## [2.5.0] - 2026-02-18 — Production Hardening (23 tasks, 5 sprints)

### Adicionado

#### Sprint 1: Security
- **Auth bypass guard**: Production + staging environments block dev-only auth bypass (5 tests)
- **CORS + env validation**: Startup crashes fast if SUPABASE_URL/KEY/DATABASE_URL/REDIS_URL missing
- **Rate limiter wired**: upload (10/min), analyze (5/min), export (20/min) via `@kratos/core` constants
- **PDF magic bytes validation**: Rejects files with spoofed MIME types (`%PDF-` header check)
- **Filename sanitization**: Strips path traversal chars, limits length to 200
- **Git history audit**: Clean, no leaked keys

#### Sprint 2: Build & Deploy
- **tsc --noEmit type-check**: Real TypeScript build (was fake `tsx --version` stub)
- **AppEnv Hono types**: `apps/api/src/types.ts` — typed context variables (`userId`, `user`)
- **SIGTERM graceful shutdown**: API closes HTTP server, Redis, DB pool with 10s timeout
- **STOPSIGNAL SIGTERM** in Dockerfile for Railway deploy compatibility
- **Pino structured logging**: `apps/api/src/lib/logger.ts` — JSON in production, pino-pretty in dev, silent in test
- **fly.toml removed**: Stale Fly.io config (project uses Railway)

#### Sprint 3: Async Analysis Pipeline
- **Analysis queue**: `kratos:jobs:analysis` Redis list with resilience (maxRetriesPerRequest, retryStrategy, error handler)
- **POST /analyze async**: Returns 202 Accepted, enqueues job for background processing
- **Analysis worker**: `workers/analysis-worker/` — BRPOP worker with LangGraph pipeline, 4.5min timeout, SIGTERM handler, Dockerfile (3 tests)

#### Sprint 4: API & Database Robustness
- **Zod validation**: `page`, `limit`, `status` query params validated with coercion and bounds
- **Consistent error format**: All errors return `{ error: { message } }` (global handler was returning string)
- **DB connection pool**: max=5, idle_timeout=20s, connect_timeout=10s
- **parseLlmJson utility**: Strips markdown fences, extracts JSON from preamble text (4 tests)
- **RAG error logging**: Non-fatal search failures logged instead of silently swallowed
- **Drizzle baseline migration**: Generated from current schema
- **X-Request-ID middleware**: Propagates or generates UUID for log correlation

#### Sprint 5: Frontend
- **API base URL**: Reads from `VITE_API_BASE_URL` env var (fixes Vercel → Railway routing)
- **React error boundary**: Crash recovery with reload button
- **Auth token refresh**: Auto-refreshes expired Supabase session before API calls

### Modificado
- **API build script**: `tsc -p tsconfig.json` (was `tsc --noEmit`)
- **API tsconfig**: `noEmit: true`, `moduleResolution: "bundler"` for tsx + workspace compat
- **CI workflows**: `ci.yml`, `deploy-production.yml` now test all packages
- **Hono logger renamed**: `import { logger as honoLogger }` to avoid conflict with pino
- **APP_VERSION**: Updated from `2.0.0` to `2.4.0` in `@kratos/core`
- **docker-compose.test.yml**: CI test infrastructure (Postgres 16, Redis 7, API, worker)

### Segurança
- **Leaked key removed**: `smoke_test.py` hardcoded Supabase service role key replaced with required env var
- **.env.example**: Removed `FLY_API_TOKEN`, added `RAILWAY_TOKEN` + `RAILWAY_PRODUCTION_TOKEN`

### Métricas
- **223 testes** passando (75 AI + 38 API + 34 Web + 31 DB + 24 PDF Worker + 18 Core + 3 Analysis Worker)
- **11 test suites** across 7 packages
- **0 lint errors**, 3 warnings

---

## [2.4.0] - 2026-02-15 — Phase 4: Tests, Monitoring & Deploy

### Adicionado
- **Vitest v8 coverage** em todos os 5 packages com thresholds progressivos
- **@kratos/db tests**: 31 testes de validação de schema Drizzle (tabelas, colunas, relações, índices)
- **@kratos/web tests expandidos**: 28 testes (Login, Dashboard, Review, componentes)
- **Sentry frontend** (`@sentry/react`): ErrorBoundary, session replay, performance tracing
- **Sentry backend** (`@sentry/node`): `app.onError` handler com `captureError()`
- **Health check aprimorado**: `/v2/health/ready` com probes reais de DB e Redis, retorna 503 se degradado
- **Endpoint de métricas**: `/v2/health/metrics` com request count, error rate, avg response time
- **Deploy staging workflow** (`deploy-staging.yml`): auto-deploy Vercel + Fly.io on push to main
- **Deploy production workflow** (`deploy-production.yml`): manual approval via GitHub environments on tag `v*`
- **Integration workflow** (`integration.yml`): nightly docker-compose (Postgres + Redis) integration tests
- **Fly.io config** (`fly.toml`): região `gru`, health check em `/v2/health`, auto-stop machines
- **Vercel config** (`apps/web/vercel.json`): SPA rewrites, Vite framework
- **Playwright scaffold**: `e2e/` com config e smoke tests (requer infra para execução)
- **`.env.example`**: variáveis de Sentry, deploy, E2E

### Modificado
- CI workflow (`ci.yml`): agora roda `pnpm test:coverage` com upload de artefatos de cobertura
- Coverage thresholds realistas: API (50/40/30/50), Web (50/40/50/50), DB (functions: 20%)

---

## [2.3.0] - 2026-02-15 — Phase 3: Frontend & HITL

### Adicionado
- **@kratos/web completo**: React 19 + Vite 6 + Tailwind 4 + shadcn/ui
- **Páginas**: Login (Supabase Auth), Dashboard (upload + tabela + stats), Review (HITL)
- **Componentes**: DocumentTable, UploadZone, StatsBar, MinutaEditor, ReviewPanel, Layout, ProtectedRoute
- **Hooks**: useDocuments, useAuth (Supabase), useAnalysis
- **API routes**: `/v2/documents/:id/analyze` (trigger AI pipeline), `/v2/documents/:id/review` (approve/reject)
- **Services**: analysis-service (LangGraph integration), review-service
- **Testes web**: 28 testes (9 suites) com @testing-library/react + vitest
- **Testes API expandidos**: 24 testes (5 suites) incluindo analysis e review routes

---

## [2.2.0] - 2026-02-15 — Phase 2.5: E2E Wiring

### Adicionado
- **DB schema aplicado** via Supabase MCP (8 tabelas + pgvector)
- **Seed script** (`pnpm seed`): 100 acordãos STJ de 4 turmas com embeddings 1536d
- **E2E scripts**: `test-e2e-full.ts` (upload → extract → analyze → validate)
- **Auth bypass dev**: `NODE_ENV=development` + `TEST_USER_ID` env vars
- **Docker**: pdf-worker adicionado ao docker-compose (`profiles: [worker]`)

---

## [2.1.0] - 2026-02-15 — Phase 2: AI Agent Orchestration

### Adicionado
- **LangGraph pipeline**: supervisor → router → rag → specialist (FIRAC) → drafter → complete
- **FIRAC+ Enterprise v3.0**: 7-phase Chain-of-Thought para análise jurídica
- **Model router**: 7-factor complexity scoring, 5-tier model selection
- **RAG engine**: vector-search (pgvector), graph-search (knowledge graph), hybrid-search (RRF)
- **Domain prompt registry**: GENERICO, BANCARIO, CONSUMIDOR com fallback
- **Providers**: Anthropic (Claude Sonnet/Opus) e Google (Gemini Flash) via LangChain
- **70 testes AI** (15 suites): prompts, graph nodes, RAG, router, providers, state

---

## [2.0.1] - 2026-02-14

### Adicionado
- **ESLint flat config** (`eslint.config.js`): TypeScript parser, Prettier compat, root-level shared config
- **Drizzle DB client** (`packages/db/src/client.ts`): postgres + drizzle-orm singleton, exported from index
- **pgvector embedding column**: `vector(1536)` custom type on `precedents` table via Drizzle schema
- **Test infrastructure**: Vitest configs for `@kratos/api` and `@kratos/core`, 18 tests across 3 suites
- **CI/CD pipeline** (`.github/workflows/ci.yml`): pnpm install, turbo build/lint/test on Node 22
- **Auth middleware wired**: `authMiddleware` applied to `/documents/*` — all document routes now protected

### Corrigido
- **Supabase client singleton**: `createClient()` moved to module scope (was per-request, wasteful)
- **Rate limiter memory leak**: Added 60s `setInterval` cleanup with `unref()` for expired entries
- **Build artifacts in source**: Deleted `index.js`, `index.d.ts`, `.map` files from `packages/core/src/`
- **Server start guard**: `serve()` wrapped with `NODE_ENV !== 'test'` to enable Vitest imports

### Modificado
- Root `package.json`: Added `"type": "module"` to eliminate ESM parsing warnings
- `@kratos/core` `package.json`: Added vitest devDep, updated test script from echo to `vitest run`

---

## [2.0.0] - 2026-02-14

### Adicionado
- **Plano de Execução KRATOS v2**: Documento detalhado com análise DevOps, brainstorm, reasoning crítico e plano de execução faseado.
- **Arquitetura Orientada a Agentes**: Definição da arquitetura baseada em LangGraph para orquestração de agentes de IA.
- **Pipeline de Extração Híbrido**: Estratégia de extração de PDF utilizando Docling, pdfplumber e Gemini 2.5 Flash.
- **Estratégia de RAG**: Implementação de Retrieval-Augmented Generation com `pgvector` para especialização de IA sem fine-tuning.
- **Conformidade com CNJ e LGPD**: Definição de trilhas de auditoria imutáveis e práticas de privacidade desde o design.
- **Roadmap Detalhado**: Cronograma visual e detalhamento das fases de desenvolvimento do MVP.
- **Documentos de Projeto**: Criação de todos os documentos essenciais para um projeto enterprise (README, ROADMAP, ARCHITECTURE, etc.).

### Modificado
- **Correção Crítica de Arquitetura**: Substituída a proposta inviável de "pgvector no TiDB" pela unificação em PostgreSQL (Supabase) para o MVP.
- **Stack de IA Atualizada**: Substituído o fine-tuning de Claude (indisponível) pela estratégia de RAG e roteamento inteligente de modelos via OpenRouter.
- **Cronograma Realista**: Ajustada a estimativa de tempo do projeto de 8-12 semanas para 12-16 semanas.
- **Eliminação de Sobreposição**: Removido o Kestra do plano inicial, focando em LangGraph e uma fila de tarefas assíncronas (Celery/BullMQ).

### Removido
- Proposta de uso do `marker-pdf` como extrator principal, substituído pelo Docling.
- Proposta de uso do Tesseract OCR, substituído pelo Gemini 2.5 Flash (Vision).
