# Lex-Intelligentia Integration

## Overview

Lex-Intelligentia is an **external adapter** — it sends documents to KRATOS via REST API but is not a core dependency. KRATOS has zero awareness of Lex internals, n8n workflows, or any other external orchestrator.

## Architecture

```
┌──────────────────────┐     POST /v2/ingest     ┌─────────────────────┐
│  Lex-Intelligentia   │ ─────────────────────── │  KRATOS v2 API      │
│  (n8n / external)    │     JSON payload         │  (Hono + Supabase)  │
└──────────────────────┘                          └─────────┬───────────┘
                                                            │
                                                  ┌─────────▼───────────┐
                                                  │  Extraction Pipeline │
                                                  │  (Trigger.dev)       │
                                                  └─────────┬───────────┘
                                                            │
                                                  ┌─────────▼───────────┐
                                                  │  Analysis Pipeline   │
                                                  │  (LangGraph)         │
                                                  └─────────────────────┘
```

## Data Flow

1. **Lex sends PDF** via `POST /v2/ingest` with JSON body (base64 or URL)
2. **KRATOS validates** the payload against `IngestionPayloadSchema` (Zod)
3. **Dedup check** via SHA-256 hash (same as upload route)
4. **Document created** in Supabase, PDF stored in Supabase Storage
5. **Extraction queued** via Trigger.dev (same pipeline as manual uploads)
6. **Audit logged** with `source` metadata for traceability

## Contract

**Endpoint:** `POST /v2/ingest`
**Auth:** Supabase JWT Bearer token (same as all KRATOS routes)

```typescript
// packages/core/src/schemas/ingestion.ts
{
  source: 'lex-intelligentia' | 'n8n' | 'api',
  pdfBase64?: string,       // Base64-encoded PDF content
  pdfUrl?: string,          // URL to download PDF from
  fileName: string,         // Original filename
  metadata?: {              // Optional legal metadata
    numeroProcesso?: string,
    tribunal?: string,
    classe?: string,
    assunto?: string,
  }
}
```

**Constraint:** Either `pdfBase64` or `pdfUrl` must be provided (not both required, but at least one).

**Responses:**
- `201` — Document created, extraction queued
- `200` — Duplicate detected (same PDF hash for this user), returns existing doc
- `400` — Invalid payload (missing PDF, bad URL, etc.)
- `401` — Missing or invalid auth token

## Deduplication Policy

Both `/v2/documents` (manual upload) and `/v2/ingest` (external ingestion) implement **identical SHA-256 per-user deduplication**:

1. PDF content is hashed with SHA-256 (`pdfHash`)
2. The hash is checked against existing documents for the same user (`documentRepo.findByHash`)
3. If a match is found with status `completed` or `processing`, the existing document and extraction are returned with `deduplicated: true`
4. The `pdfHash` is also sent to Trigger.dev as `idempotencyKey` to prevent duplicate extraction jobs

**To force re-extraction** of a previously processed PDF, delete the existing document first via the API, then re-upload.

**Contracts:** See `DedupeCheckRequest` and `DedupeCheckResponse` in `@kratos/core` for the formal dedup contract types.

## Security Model

- **Authentication:** Supabase JWT (same as all routes). Lex must obtain a valid token.
- **Rate limiting:** Standard `UPLOAD_PER_MINUTE` limit (10/min per user)
- **Audit logging:** Every ingestion creates an audit log entry with `action: 'ingest'` and the `source` field
- **PDF validation:** Magic bytes check (%PDF header), 50MB size limit
- **SSRF protection:** URL ingestion validates against `URL_INGESTION_ALLOWLIST` (see SECURITY.md)

## Design Principles

- **No n8n coupling:** KRATOS core never imports n8n types or references n8n concepts
- **Adapter pattern:** Lex is one of many possible sources (`source` enum is extensible)
- **Same pipeline:** Ingested documents go through the exact same extraction → analysis → review → export pipeline as manually uploaded ones
- **Dedup safety:** SHA-256 per-user dedup prevents re-processing identical PDFs regardless of source
