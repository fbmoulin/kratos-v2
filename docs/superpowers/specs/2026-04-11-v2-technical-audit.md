# Kratos-v2 Technical Audit — 62 Findings

**Date:** 2026-04-11
**Status:** AUDIT COMPLETE — awaiting sprint execution
**Auditors:** 4 parallel agents (Architecture, Reliability, Security, Tests+DB)

## CRITICAL (7)

| # | Domain | Issue | File | Fix |
|---|---|---|---|---|
| C1 | DB | No-op DB check in `/health/ready` — always reports `ok` | `routes/health.ts:61` | Execute `db.execute(sql'SELECT 1')` |
| C2 | Data | Non-atomic prompt activation — TOCTOU zero active versions | `ai/prompts/prompt-repo.ts:40` | Wrap both UPDATEs in `db.transaction()` |
| C3 | SQL | `HAVING` without `GROUP BY` in vector search | `ai/rag/vector-search.ts:45` | Replace with WHERE subquery |
| C4 | Data | Storage upload + DB insert not atomic — orphaned files | `routes/documents.ts:104`, `ingestion.ts:79` | DB-first or cleanup-on-failure |
| C5 | Worker | PDF worker swallows errors — doc stuck in `processing` | `trigger/src/pdf.ts:52` | Wrap status-update catch in try/catch |
| C6 | Infra | Dual queue backends (Redis + Trigger.dev) — double-processing | `services/queue.ts` + `services/trigger.ts` | Delete queue.ts + deprecated Redis workers |
| C7 | Security | SSRF via `pdfUrl` — fetches any URL including internal | `routes/ingestion.ts:46` | Block private IPs before fetch |

## HIGH (14)

| # | Domain | Issue | File |
|---|---|---|---|
| H1 | Security | Auth bypass fires when `NODE_ENV` isn't prod/staging | `middleware/auth.ts:46` |
| H2 | Security | Prompts route has NO auth middleware | `index.ts:88` |
| H3 | Security | `getExtraction()` not scoped by userId — IDOR | `document-repo.ts:98` |
| H4 | Security | SQL injection via `entityTypes` array in graph search | `ai/rag/graph-search.ts:33` |
| H5 | Security | Redis queue jobs deserialized without validation | `analysis-worker/worker.ts:41` |
| H6 | Security | Workers update docs without userId scoping (RLS bypass) | `trigger/pdf.ts:62` |
| H7 | Reliability | `set_config` transaction-local on pooled conn — audit broken | `middleware/auth.ts:76` |
| H8 | Reliability | In-memory rate limiter breaks horizontally | `middleware/rate-limit.ts:22` |
| H9 | Reliability | `pdfUrl` download buffers full body before size check | `routes/ingestion.ts:46` |
| H10 | Reliability | Analysis failure omits errorMessage | `trigger/analysis.ts:57` |
| H11 | Architecture | `@kratos/ai` imports `@kratos/db` — layer inversion | `ai/rag/*.ts` |
| H12 | Tests | `analysis-repo.ts` zero tests for write path | `services/analysis-repo.ts` |
| H13 | Tests | `startWorker()` loop untested in both Redis workers | `workers/*/worker.ts` |
| H14 | SQL | vector-search HAVING bug (duplicate of C3) | `ai/rag/vector-search.ts:34` |

## MEDIUM (20)

| # | Domain | Issue |
|---|---|---|
| M1 | Arch | `isPdfContent` + `sanitizeFileName` duplicated in 2 routes |
| M2 | Arch | `DocumentStatus` enum unused at DB layer — raw strings |
| M3 | Arch | `console.error` in RAG node instead of pino |
| M4 | Arch | 3 deprecated workers still in Turborepo workspace |
| M5 | Arch | `updateStatus` accepts raw string, not `DocumentStatus` |
| M6 | Security | UUID `:id` param not validated |
| M7 | Security | Rate limiter uses spoofable `x-forwarded-for` |
| M8 | Security | Supabase credentials fall back to empty strings |
| M9 | Security | ILIKE wildcards not escaped in graph search |
| M10 | Security | Audit trigger stores PII in full row snapshots |
| M11 | Security | CORS staging gap — falls back to localhost |
| M12 | Reliability | API shutdown doesn't drain DB pool or close Redis |
| M13 | Reliability | Trigger.dev retry config inconsistent |
| M14 | Reliability | `trigger.config.ts` has placeholder project ID |
| M15 | Reliability | Large `rawText` in queue payload — multi-MB Redis values |
| M16 | Reliability | `prompts/:key` no input validation or rate limiting |
| M17 | Tests | `prompts.ts` route has no test file |
| M18 | Tests | `prompt-repo.ts:activate` completely untested |
| M19 | Tests | `ragNode` has no unit test |
| M20 | Tests | `rate-limit.ts` mocked everywhere, never tested |

## Database Performance (5)

| # | Issue | Fix |
|---|---|---|
| D1 | Missing `analyses(extraction_id, created_at)` composite | DOCX export + getByExtractionId sorts |
| D2 | Missing `audit_logs(created_at)` | Time-range compliance reports full-scan |
| D3 | Missing `documents(user_id, status)` composite | Common list query |
| D4 | RLS subquery IN pattern instead of EXISTS | Per-row correlated scan |
| D5 | No migration rollback scripts | Blocking during changes |

## Sprint Plan

### Sprint 1: Critical (7 fixes, ~4h)
1. Real DB check in `/health/ready`
2. Wrap prompt `activate()` in transaction
3. Replace `HAVING` with `WHERE` subquery in vector search
4. Add storage cleanup on DB failure
5. Wrap worker error-update in try/catch
6. Remove dual queue path — delete queue.ts + deprecated workers
7. Add SSRF protection to pdfUrl

### Sprint 2: Security (8 fixes, ~3h)
1. Add auth middleware to prompts route
2. Restrict auth bypass to `NODE_ENV === 'test'` only
3. Add userId scoping to getExtraction()
4. Parameterize entityTypes array
5. Validate Redis queue payloads with Zod
6. Add userId to worker DB update WHERE clauses
7. Check Content-Length before pdfUrl body read
8. Add errorMessage to analysis failure

### Sprint 3: Database + Reliability (5 fixes, ~2h)
1. Add 3 indexes (analyses composite, audit_logs created_at, documents user+status)
2. Fix set_config to session-level or wrap in transaction
3. Drain DB pool + close Redis on shutdown
4. Add Gemini timeout (30s)
5. Replace console.error with pino in RAG node

### Sprint 4: Tests (5 tasks, ~3h)
1. analysis-repo.test.ts
2. prompts.test.ts
3. prompt-repo.test.ts (activate transaction)
4. rag-node.test.ts
5. rate-limit.test.ts

### Sprint 5: Code Quality (5 fixes, ~2h)
1. Extract shared pdf-utils.ts
2. DocumentStatus pgEnum at DB layer
3. Type updateStatus parameter
4. Remove 3 deprecated worker dirs
5. Decouple @kratos/ai from @kratos/db
