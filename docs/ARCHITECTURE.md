# Architecture — KRATOS v2

**Version:** 2.6.0
**Last verified:** 2026-03-21

---

## 1. Overview

KRATOS v2 is a distributed, event-driven, AI-centric legal automation platform built as a TypeScript monorepo. It processes judicial PDFs, applies FIRAC analysis via LangGraph agent orchestration, and generates structured legal drafts with full auditability (Resolucao 615/2025 CNJ, LGPD).

The architecture has four layers:

1. **Presentation Layer** — React 19 SPA (Vite 6 + Tailwind 4 + shadcn/ui) for document upload, pipeline monitoring, and Human-in-the-Loop (HITL) review.
2. **API Layer** — Hono 4.7 REST API on Node.js, handling authentication (Supabase JWT), rate limiting, and request routing.
3. **Worker Layer** — Trigger.dev tasks for heavy async processing (PDF extraction, AI analysis, DOCX export), with Redis BRPOP fallback workers for simpler jobs.
4. **Data Layer** — PostgreSQL 16 with pgvector (via Supabase), Redis 7 (queues + cache), Supabase Storage (file uploads).

---

## 2. Project Structure (Monorepo)

The monorepo uses **pnpm workspaces** and **Turborepo** for build orchestration, caching, and parallel execution.

```
kratos-v2/
├── apps/
│   ├── api/              # REST API (Hono 4.7 + Node.js 22)
│   └── web/              # Frontend SPA (React 19 + Vite 6 + Tailwind 4)
├── packages/
│   ├── core/             # Shared business logic, types, constants
│   ├── db/               # Drizzle ORM schema, migrations, client
│   ├── ai/               # LangGraph agents, prompts, RAG engine
│   └── tools/            # Utilities (PDF extraction helpers, DOCX builder)
├── workers/
│   ├── trigger/          # Trigger.dev tasks (pdf, analysis, docx)
│   ├── analysis-worker/  # Redis BRPOP worker (LangGraph pipeline)
│   └── docx-worker/      # Redis BRPOP worker (DOCX export)
├── supabase/             # Migrations and Supabase config
├── e2e/                  # Playwright E2E tests
├── docs/                 # Project documentation
├── turbo.json            # Turborepo task config
├── trigger.config.ts     # Trigger.dev project config
└── pnpm-workspace.yaml   # Workspace definitions
```

> **Note:** `workers/pdf-worker/` is a legacy Python/Celery worker, superseded by `workers/trigger/src/pdf.ts`. Kept for reference only — see `workers/pdf-worker/DEPRECATED.md`.

---

## 3. API Layer (Hono)

**Stack:** Hono 4.7, Node.js 22, TypeScript

**Middleware chain** (applied in order):
1. `logger()` — structured request/response logging (pino)
2. `secureHeaders()` — X-Content-Type-Options, X-Frame-Options, etc.
3. `X-Request-ID` — propagates or generates UUID for log correlation
4. `cors()` — configurable origin (production requires non-localhost)
5. `authMiddleware` — Supabase JWT verification (on `/documents/*` routes)

**Route groups:**
| Route | Auth | Purpose |
|-------|------|---------|
| `GET /v2/` | Public | API metadata (name, version, status) |
| `GET /v2/health/ready` | Public | Liveness + readiness (DB + Redis probes) |
| `GET /v2/health/metrics` | Public | Request count, error rate, avg latency |
| `/v2/documents/*` | JWT | Document CRUD, upload, analyze, review, export |

**Rate limiting:** upload (10/min), analyze (5/min), export (20/min) via `@kratos/core` constants.

**Production startup validation:** crashes fast if `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `TRIGGER_SECRET_KEY` are missing.

---

## 4. Worker Layer

### 4.1 Trigger.dev Tasks (Primary)

Trigger.dev SDK 4.3 provides durable, retryable background tasks with observability. Three tasks are registered:

| Task | File | Queue | Purpose |
|------|------|-------|---------|
| `pdf-extraction` | `workers/trigger/src/pdf.ts` | Trigger.dev managed | Extracts text/tables from PDFs (calls Python subprocess via `execa`) |
| `analysis-job` | `workers/trigger/src/analysis.ts` | Trigger.dev managed | Runs LangGraph AI pipeline (supervisor → router → RAG → specialist → drafter) |
| `docx-export` | `workers/trigger/src/docx.ts` | Trigger.dev managed | Generates DOCX via `@kratos/tools`, uploads to Supabase Storage |

### 4.2 Redis BRPOP Workers (Fallback)

For environments without Trigger.dev, Redis-based workers consume from named queues:

- `analysis-worker/` — consumes `kratos:jobs:analysis` (BRPOP), 4.5min timeout, SIGTERM handler
- `docx-worker/` — consumes `kratos:jobs:docx` (BRPOP), fetches analysis, builds DOCX, uploads to Supabase Storage

---

## 5. AI Layer (LangGraph)

**Stack:** LangGraph 1.1, LangChain core, Anthropic (Claude), Google (Gemini)

The AI pipeline is modeled as a state machine graph:

```
supervisor → router → rag → specialist (FIRAC+) → drafter → complete
```

**Nodes:**
- **Supervisor** — classifies document complexity (7-factor scoring), selects model tier
- **Router** — routes to domain-specific specialist (Gemini Flash, low cost)
- **RAG** — retrieves relevant precedents via hybrid search (vector + graph + RRF fusion)
- **Specialist** — applies FIRAC+ Enterprise v3.0 (7-phase Chain-of-Thought) with domain prompts
- **Drafter** — generates structured legal draft using domain prompt registry (GENERICO, BANCARIO, CONSUMIDOR + fallback)

**Model routing:** 5-tier model selection based on complexity score — from Gemini Flash (simple) to Claude Opus (complex).

**RAG engine:**
- `vector-search` — pgvector cosine similarity on `precedents.embedding` (1536d)
- `graph-search` — knowledge graph traversal via `graph_entities` + `graph_relations`
- `hybrid-search` — Reciprocal Rank Fusion (RRF) combining vector + graph results

---

## 6. Data Layer

### 6.1 PostgreSQL (Supabase)

- **ORM:** Drizzle ORM with typed schema
- **Extension:** pgvector for embedding storage and similarity search
- **Tables:** `documents`, `extractions`, `analyses`, `precedents`, `graph_entities`, `graph_relations`, `prompt_versions`, `audit_logs`
- **Audit trail:** Triggers on `audit_logs` ensure immutable logging of all data mutations (CNJ 615/2025 compliance)
- **Connection pool:** max=5, idle_timeout=20s, connect_timeout=10s

### 6.2 Redis 7

- **Job queues:** `kratos:jobs:analysis`, `kratos:jobs:docx` (BRPOP pattern)
- **Cache:** Extraction results and AI API responses (TTL-based invalidation)
- **Resilience:** maxRetriesPerRequest, retryStrategy, error handler configured

### 6.3 Supabase Storage

- **Purpose:** Secure file storage for uploaded PDFs and generated DOCX files
- **Auth integration:** Supabase Auth policies control file access
- **Bucket:** Dedicated DOCX export bucket

---

## 7. Security and Compliance

### 7.1 Authentication
- **Supabase Auth** — JWT-based user lifecycle (register, login, session management)
- **Row-Level Security (RLS)** — PostgreSQL policies ensure user data isolation
- **Dev bypass** — `TEST_USER_ID` only works when `NODE_ENV=development`; blocked in production/staging

### 7.2 Input Validation
- PDF magic bytes validation (`%PDF-` header check)
- Filename sanitization (path traversal chars stripped, 200-char limit)
- Zod validation on all query parameters (page, limit, status)
- Consistent error format: `{ error: { message } }`

### 7.3 Compliance
- **CNJ 615/2025** — Immutable audit trail via database triggers on `audit_logs`
- **LGPD** — Privacy-by-design: data anonymization in logs, retention policies, explicit consent

---

## 8. Deployment

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Frontend (React SPA) | Vercel | `https://kratos.vercel.app` |
| API + Workers | Railway | `https://kratos-api.up.railway.app` |
| Database + Auth + Storage | Supabase | `https://xxx.supabase.co` |
| Background Tasks | Trigger.dev | Trigger.dev Cloud |

### CI/CD (GitHub Actions)
- **CI** (`ci.yml`) — lint, type-check, test on PRs (all packages via Turborepo)
- **Deploy staging** (`deploy-staging.yml`) — auto-deploy Vercel + Railway on push to `main`
- **Deploy production** (`deploy-production.yml`) — manual approval on tag `v*`
- **Integration** (`integration.yml`) — nightly docker-compose integration tests

---

## 9. Observability

- **Sentry** — error tracking + session replay (frontend `@sentry/react`, backend `@sentry/node`)
- **Health probes** — `/v2/health/ready` (DB + Redis), `/v2/health/metrics` (request stats)
- **Structured logging** — pino JSON logs in production, pino-pretty in dev, silent in test
- **LangSmith** — planned for LangGraph agent tracing (Chain-of-Thought visibility)
- **X-Request-ID** — UUID propagation for cross-service log correlation
