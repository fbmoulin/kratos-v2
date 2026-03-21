# KRATOS v2 — Operational Backlog

**Last verified:** 2026-03-21

---

## Operational Truth Matrix

| Document | Role | Last Verified |
|----------|------|---------------|
| README.md | Product vision + quick start | 2026-03-21 |
| CHANGELOG.md | Authoritative version history | 2026-03-21 |
| TODO.md | Operational backlog (this file) | 2026-03-21 |
| ARCHITECTURE.md | Technical architecture (reconciled) | 2026-03-21 |
| ENV.md | Environment variable reference | 2026-03-21 |

---

## Fase 0: Fundacao, Seguranca e CI/CD — DONE

- [x] Monorepo (pnpm workspaces + Turborepo)
- [x] ESLint flat config, Prettier, TypeScript
- [x] Drizzle schema (8 tabelas + pgvector)
- [x] Schema applied via Supabase MCP migration
- [x] CI workflow (ci.yml — lint, typecheck, test)
- [x] Audit log triggers SQL — completed in Sprint 1 Compliance (Task 5)
- [x] HNSW index for precedents.embedding — completed in Sprint 1 Compliance (Task 6)

---

## Fase 1: PDF Ingestion — DONE (scaffold)

- [x] Upload endpoint + Redis enqueue
- [x] pdf-worker scaffold (Python/Celery) — **DEPRECATED in v2.6.0, replaced by Trigger.dev**
- [x] Trigger.dev pdf-extraction task (v2.6.0)
- [ ] Full Docling/pdfplumber/Gemini Vision integration — **POST-MVP**
- [ ] Frontend status notification (polling or WebSocket) — **POST-MVP**
- [ ] Redis extraction cache with TTL — **POST-MVP**

---

## Fase 2: AI Agent Orchestration — DONE

- [x] LangGraph pipeline (supervisor → router → rag → specialist → drafter → complete)
- [x] FIRAC+ Enterprise v3.0 (7-phase CoT)
- [x] Model router (7-factor complexity, 5-tier model selection)
- [x] RAG engine (vector + graph + RRF hybrid search)
- [x] Domain prompt registry (GENERICO, BANCARIO, CONSUMIDOR)
- [x] 75 AI tests (16 suites)
- [ ] LangSmith full integration — **POST-MVP**
- [ ] Chain-of-Thought persistence in DB — **POST-MVP**

---

## Fase 2.5: E2E Wiring — DONE

- [x] DB schema applied (8 tables + pgvector)
- [x] 100 STJ precedents seeded (1536d embeddings)
- [x] E2E scripts (upload → extract → analyze → validate)
- [x] Auth bypass dev (NODE_ENV + TEST_USER_ID)

---

## Fase 3: Frontend + HITL — DONE

- [x] React 19 + Vite 6 + Tailwind 4 + shadcn/ui
- [x] Pages: Login, Dashboard, Review, DocumentDetail
- [x] Components: DocumentTable, UploadZone, StatsBar, MinutaEditor, ReviewPanel
- [x] HITL review flow (approve/reject)
- [x] 34 web tests (10 suites)
- [x] DOCX export endpoint + useExport polling (v2.6.0)
- [ ] Multiple .docx templates per document type — **POST-MVP**

---

## Fase 4: Tests, Monitoring, Deploy — DONE

- [x] Vitest v8 coverage (all packages)
- [x] Sentry frontend + backend
- [x] Health checks (/v2/health/ready, /v2/health/metrics)
- [x] CI/CD workflows (ci, deploy-staging, deploy-production, integration)
- [x] Vercel + Railway deploy config
- [ ] Playwright E2E execution (scaffold exists) — **POST-MVP**
- [ ] Configure GitHub Secrets for Vercel/Railway — **BLOCKED: requires repo admin**

---

## Fase 5: Production Hardening (v2.5.0) — DONE

All 23 tasks completed per CHANGELOG v2.5.0:

### Sprint 1: Security — DONE
- [x] Auth bypass guard (production/staging blocks dev bypass)
- [x] CORS + env validation (crash fast on missing vars)
- [x] Rate limiter (upload 10/min, analyze 5/min, export 20/min)
- [x] PDF magic bytes + filename sanitization
- [x] Git history audit (clean)

### Sprint 2: Build & Deploy — DONE
- [x] tsc --noEmit type-check (real build)
- [x] SIGTERM graceful shutdown (10s timeout)
- [x] Pino structured logging (JSON prod, pretty dev, silent test)
- [x] fly.toml removed (Railway is deploy target)

### Sprint 3: Async Analysis Pipeline — DONE
- [x] Analysis queue (kratos:jobs:analysis, Redis BRPOP)
- [x] POST /analyze async (202 Accepted)
- [x] analysis-worker (BRPOP, 4.5min timeout, SIGTERM handler)

### Sprint 4: API & DB Robustness — DONE
- [x] Zod validation on query params
- [x] Consistent error format { error: { message } }
- [x] DB connection pool (max=5, idle 20s, connect 10s)
- [x] parseLlmJson utility (markdown fence stripping)
- [x] RAG error logging (non-fatal)
- [x] Drizzle baseline migration
- [x] X-Request-ID middleware

### Sprint 5: Frontend Fixes — DONE
- [x] VITE_API_BASE_URL env var
- [x] React Error Boundary
- [x] Auth token refresh

---

## v2.6.0: DOCX Worker + Trigger.dev — DONE

- [x] Trigger.dev tasks: pdf-extraction, analysis-job, docx-export
- [x] DOCX export worker + @kratos/tools buildDocxBuffer
- [x] GET /v2/documents/:id/export (signed Supabase URL)
- [x] useExport polling (5s × 12 attempts)
- [x] Document detail endpoint (doc + extraction + analysis)
- [x] DocumentStatus.REVIEWED added

---

## Sprint 1 Compliance (2026-03-21) — DONE

- [x] **Task 5:** Audit log triggers on documents, extractions, analyses (CNJ 615/2025)
- [x] **Task 6:** HNSW index on precedents.embedding + graph_entities.embedding
- [x] **Task 7:** RLS policies on documents, extractions, analyses (user_id isolation)
- [x] **Task 8:** Deprecate legacy pdf-worker, run final test suite

---

## Post-MVP (Enterprise)

- [ ] Full PDF pipeline (Docling + pdfplumber + Gemini Vision)
- [ ] LangSmith integration for LangGraph tracing
- [ ] Multiple DOCX templates per document type
- [ ] Playwright E2E test execution
- [ ] Prometheus/Grafana monitoring dashboards
- [ ] Multi-tenancy architecture
- [ ] Infisical for secrets management
- [ ] Tribunal API integrations
- [ ] Fine-tuning of open-source models
- [ ] Load testing
