# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KRATOS v2** is a legal automation platform for Brazilian judiciary that analyzes judicial PDFs, extracts information using AI agents (LangGraph), applies the FIRAC framework (Facts, Issue, Rule, Analysis, Conclusion), and generates high-quality legal document drafts with human-in-the-loop validation. The system is built for compliance with CNJ Resolution 615/2025 and LGPD.

**Stack**: Turborepo monorepo, TypeScript, React 19, Hono API, PostgreSQL (Supabase), pgvector, Drizzle ORM, LangGraph, Redis/Celery, Vite, Tailwind CSS 4.

## Development Commands

### Prerequisites Setup
```bash
# Install dependencies (requires pnpm 9+, Node 22+)
pnpm install

# Start infrastructure (Redis for cache + Celery broker)
docker-compose up -d

# Configure environment variables
# Copy .env.example and fill required values (see docs/ENV.md)
```

### Running the System
```bash
# Start all apps in dev mode (Turbo orchestrates parallel execution)
pnpm dev
# → Frontend: http://localhost:5173
# → API: http://localhost:3001

# Run specific workspace
pnpm --filter @kratos/api dev
pnpm --filter @kratos/web dev
```

### Building
```bash
# Build all workspaces (respects Turbo dependency graph)
pnpm build

# Build specific workspace
pnpm --filter @kratos/api build
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm --filter @kratos/api test

# Run API tests in watch mode
cd apps/api && pnpm test:watch
```

### Database Operations (Drizzle)
```bash
# Generate migrations from schema changes
pnpm --filter @kratos/db db:generate

# Apply migrations to database
pnpm --filter @kratos/db db:migrate

# Push schema directly (dev only - no migrations)
pnpm --filter @kratos/db db:push

# Open Drizzle Studio (database GUI)
pnpm --filter @kratos/db db:studio
```

### Linting & Formatting
```bash
# Lint all workspaces
pnpm lint

# Format all files
pnpm format
```

## Architecture

### Monorepo Structure

```
apps/
├── api/          # Hono backend API (Node.js, tsx runtime, Vitest)
│                 # Handles auth, uploads, orchestrates worker jobs
│                 # Depends on: @kratos/core, @kratos/db, @kratos/ai
└── web/          # React 19 frontend (Vite, Tailwind CSS 4, shadcn/ui)
                  # Human-in-the-loop review interface
                  # Depends on: @kratos/core

packages/
├── core/         # Shared business logic, types, constants, utilities
│                 # Pure TypeScript, no external dependencies
├── db/           # Database layer (Drizzle ORM, schema, migrations)
│                 # PostgreSQL + pgvector (Supabase managed)
│                 # Scripts: db:generate, db:migrate, db:push, db:studio
├── ai/           # LangGraph agent orchestration, RAG engine, prompts
│                 # Implements FIRAC framework with specialized legal agents
│                 # Depends on: @kratos/core, @kratos/db
└── tools/        # Utilities (PDF extractor, DOCX generator)

workers/
└── pdf-worker/   # Python/Celery async worker
                  # Hybrid extraction: Docling + pdfplumber + Gemini 2.5 Flash
                  # Consumes jobs from Redis queue
```

### Key Architectural Patterns

**1. Async Job Processing**
- API receives PDF upload → saves to Supabase Storage → enqueues job to Redis
- Celery worker consumes job → hybrid PDF extraction pipeline → saves to `extractions` table
- Frontend polls or receives webhooks for status updates

**2. LangGraph Agent Orchestration**
- Supervisor agent routes to complexity-appropriate flow
- Specialist agents (by legal domain) apply FIRAC framework
- RAG engine queries pgvector for relevant precedents → injects as few-shot examples
- Model routing via OpenRouter (Gemini 2.5 Flash / Claude Sonnet 4 / Claude Opus 4)

**3. Database Architecture**
- **PostgreSQL (Supabase)**: Unified storage for relational data + vector embeddings
- **pgvector extension**: HNSW index on embeddings column for fast similarity search
- **Drizzle ORM**: Type-safe queries, schema migrations
- **Immutable audit logs**: SQL triggers automatically log all AI decisions (CNJ 615/2025 compliance)

**4. Workspace Dependencies**
- Workspaces use `workspace:*` protocol for internal packages
- Turborepo caches builds and respects dependency graph (`^build` in turbo.json)
- API depends on core/db/ai, web depends on core, ai depends on core/db

**5. Runtime Differences**
- **API**: Uses `tsx` runtime (no build step in dev, type-checked execution)
- **Web**: Vite build with TypeScript compilation
- **Packages**: Built to `dist/` via `tsc`, consumed as ESM by apps

### Environment Variables

Critical env vars (see `.env.example` and `docs/ENV.md`):
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Database + Auth + Storage
- `DATABASE_URL` - Direct Postgres connection (Drizzle ORM)
- `REDIS_URL` - Cache + Celery broker
- `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` - AI models
- `LANGSMITH_API_KEY` - Agent tracing and debugging
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` - Worker queue
- `TEST_USER_ID` - Dev-only auth bypass for E2E testing (UUID)

### Security & Compliance

- **Supabase Auth**: JWT-based authentication, Row-Level Security (RLS) policies
- **LGPD**: Privacy by design, data anonymization in logs, retention policies
- **CNJ 615/2025**: Immutable audit trail via database triggers, full traceability of AI decisions
- **Secrets**: Managed via environment variables (MVP), migrate to Infisical for production

## Important Implementation Notes

### When Working with the Database
- Always update the Drizzle schema in `packages/db/src/schema/documents.ts`
- Use the DB client from `packages/db/src/client.ts` (singleton — `import { db } from '@kratos/db'`)
- Generate migrations with `pnpm --filter @kratos/db db:generate`
- Never manually edit migration files unless absolutely necessary
- Use `db:push` for quick schema prototyping (dev only, bypasses migrations)

### When Adding AI Agents
- Define agents in `packages/ai/src/agents/`
- Update LangGraph graph definitions to include new agent nodes
- Add RAG queries in `packages/ai/src/rag/` if precedent search is needed
- Test with LangSmith tracing enabled to debug agent decision chains

### When Working with PDFs
- PDF processing happens in Python worker (`workers/pdf-worker/`)
- Extraction pipeline: Docling (primary) → pdfplumber (tables) → Gemini 2.5 Flash (images)
- Results validated via Pydantic schemas before database insertion
- Large PDFs may timeout - consider chunking strategy for production

### When Building UI
- Use shadcn/ui components (not custom implementations)
- Tailwind CSS 4 with `@tailwindcss/vite` plugin (new architecture)
- React 19 features available (automatic batching, transitions, etc.)
- HITL interface must maintain audit trail for all user edits

## Documentation

- `docs/ARCHITECTURE.md` - Detailed system architecture
- `docs/API.md` - API endpoints and contracts
- `docs/ENV.md` - Complete environment variable reference
- `docs/ROADMAP.md` - Development phases and timeline
- `docs/SECURITY.md` - Security practices and threat model
- `docs/DEPLOY.md` - Deployment procedures (Vercel/Fly.io)

### When Writing Tests
- API tests must mock `@supabase/supabase-js` before importing app (singleton creates at module load)
- Use `app.request('/v2/path')` for Hono test requests (no HTTP server needed)
- Vitest workspace aliases resolve `@kratos/*` to source TS (no build step required for tests)
- Run with `NODE_ENV=test` to skip `serve()` call

## CI/CD

GitHub Actions workflows (`.github/workflows/`):
- **CI** (`ci.yml`): On push/PR to `main`/`develop` — pnpm install, turbo build, lint, test (Node 22)

### Seed & E2E Scripts
```bash
# Seed precedents table with 100 STJ acordaos + embeddings
pnpm seed

# Run full E2E test (requires API running + Redis + worker)
TEST_USER_ID=00000000-0000-0000-0000-000000000001 pnpm e2e

# Run AI-only E2E pipeline (no API needed, uses real API keys)
node --env-file=.env packages/ai/node_modules/.bin/tsx scripts/test-e2e-pipeline.ts [domain]
```

### Docker Services
```bash
# Redis only (default)
docker compose up -d

# Redis + PDF Worker
docker compose --profile worker up -d
```

### WSL2 Connectivity Note
The Supabase Postgres host resolves to IPv6 only, which WSL2 doesn't support. Workarounds:
- **Seed script**: Uses Supabase REST API (HTTPS) instead of direct Postgres
- **drizzle-kit push**: Use Supabase MCP or run from PowerShell Windows
- **App runtime**: Will need pooler URL or IPv6 fix in WSL2

## Current Test Coverage

| Package | Tests | Suites | Notes |
|---------|-------|--------|-------|
| `@kratos/ai` | 70 | 15 | prompts, graph nodes, RAG, router, providers, workflow |
| `@kratos/api` | 9 | 2 | health, documents CRUD, auth guard |
| `@kratos/core` | 9 | 1 | enums, constants |
| **Total** | **88** | **18** | |

## Database Schema (Supabase Postgres + pgvector)

8 tables in `public` schema:
- `documents` — uploaded PDFs, processing lifecycle
- `extractions` — structured content from PDF pipeline (1:1 with documents)
- `analyses` — AI-generated FIRAC analyses (references extractions)
- `precedents` — legal precedents with `vector(1536)` embeddings for RAG
- `graph_entities` — knowledge graph nodes (GraphRAG)
- `graph_relations` — knowledge graph edges (GraphRAG)
- `prompt_versions` — versioned prompt templates (A/B testing)
- `audit_logs` — immutable compliance trail (CNJ 615/2025)

**Supabase project:** `jzgdorcvfxlahffqnyor` (stj-rag), region sa-east-1
**Seed data:** 100 STJ acordaos from 4 turmas, embeddings 1536d (text-embedding-3-small)
