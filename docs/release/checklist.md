# Go/No-Go Checklist — KRATOS v2 Beta Institucional

**Version:** 2.8.0
**Date:** 2026-03-21
**Target:** Beta institucional release

---

## 1. Extração sem dependência legada

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| Python extraction em `workers/trigger/extraction/` | GO | Pacote self-contained, 8 arquivos |
| `pdf_runner.py` importa de `extraction.pipeline` | GO | Sem referência a `workers/pdf-worker/` |
| `workers/pdf-worker/` não faz parte do runtime | GO | `DEPRECATED.md` atualizado, safe-to-delete |
| `requirements.txt` em `workers/trigger/` | GO | pdfplumber, pydantic, pydantic-settings, supabase |
| Testes de extração passando | GO | 10/10 trigger tests |

## 2. Deduplicação simétrica

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| Dedup por SHA-256 em POST /v2/documents | GO | `documents.ts` — `findByHash()` |
| Dedup por SHA-256 em POST /v2/ingest | GO | `ingestion.ts` — `findByHash()` |
| IdempotencyKey no Trigger.dev | GO | `trigger.ts` — `idempotencyKey: pdf-extract:{hash}` |
| Retorno correto (200 + deduplicated flag) | GO | Ambas rotas retornam `{ deduplicated: true }` |

## 3. Governança de prompts

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| Lifecycle: draft -> approved -> active -> rolled_back | GO | `prompt-repo.ts` — createVersion, approve, activate |
| Sem fallback silencioso em produção | GO | `prompt-resolver.ts` — throws em prod/staging |
| ContentHash (SHA-256) computado na criação | GO | `prompt-repo.ts` — `computeContentHash()` |
| Proveniência persistida em `analyses` | GO | `analysis.ts` — promptKey, promptVersion, promptHash |
| Validação de integridade pre-análise | GO | `analysis.ts` — `promptRepo.validate()` |
| Audit log com proveniência | GO | `analysis.ts` — `auditLogs.insert()` |
| Documentação | GO | `docs/prompt-governance.md` |

## 4. Proteção SSRF na ingestão por URL

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| Allowlist configurável (URL_INGESTION_ALLOWLIST) | GO | `url-validator.ts` — `getAllowlist()` |
| Bloqueio de IPs privados (RFC 1918 + IPv6) | GO | 10 regex patterns + localhost check |
| HTTPS obrigatório | GO | `parsed.protocol !== 'https:'` |
| Sem redirecionamentos | GO | `redirect: 'error'` em fetch |
| Validação Content-Type (application/pdf) | GO | `ingestion.ts:76` |
| Validação Content-Length (50MB) | GO | `FETCH_CONFIG.MAX_CONTENT_LENGTH` |
| Timeout de download (30s) | GO | `FETCH_CONFIG.TIMEOUT_MS` |
| Sem credenciais embutidas na URL | GO | `parsed.username \|\| parsed.password` |
| 14 testes de validação | GO | `url-validator.test.ts` |
| Documentação em SECURITY.md | GO | Seção 3.2.1 |

## 5. Documentação convergente

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| README.md — v2.8.0, Trigger.dev como pipeline oficial | GO | Badge + status table atualizados |
| ARCHITECTURE.md — v2.8.0, extraction package documentado | GO | Nota na seção 2, LangSmith na seção 9 |
| SECURITY.md — v2.0, SSRF + governança de prompts | GO | Seções 3.2.1 e 3.5 |
| TODO.md — fases v2.8.0 marcadas como DONE | GO | 5 fases (A-E) documentadas |
| prompt-governance.md — política completa | GO | Lifecycle, integridade, proveniência |
| DEPRECATED.md — pdf-worker safe-to-delete | GO | Atualizado para v2.8.0 |

## 6. Observabilidade e proveniência

| Criterio | Status | Evidencia |
|----------|--------|-----------|
| LangSmith tracing implementado | GO | `buildTracingConfig()` em `@kratos/ai` |
| Sentry frontend + backend | GO | `@sentry/react` + `@sentry/node` |
| fileHash na extração | GO | `pdf.ts:65` — SHA-256 do PDF |
| contentHash na extração | GO | `pdf.ts:56` — SHA-256 do raw text |
| processingTimeMs na extração | GO | `pdf.ts:54,67` |
| promptKey/Version/Hash na análise | GO | `analysis.ts:55-57` |
| Audit trail imutável (CNJ 615/2025) | GO | Triggers SQL + `audit_logs` table |

---

## Decisão

| Area | Resultado |
|------|-----------|
| Extração sem legado | **GO** |
| Dedup simétrica | **GO** |
| Prompts governados | **GO** |
| SSRF guard | **GO** |
| Docs convergentes | **GO** |
| Observabilidade | **GO** |

**Resultado final: GO para beta institucional.**
