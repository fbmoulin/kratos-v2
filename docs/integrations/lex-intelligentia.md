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

## Security Model

- **Authentication:** Supabase JWT (same as all routes). Lex must obtain a valid token.
- **Rate limiting:** Standard `UPLOAD_PER_MINUTE` limit (10/min per user)
- **Audit logging:** Every ingestion creates an audit log entry with `action: 'ingest'` and the `source` field
- **PDF validation:** Magic bytes check (%PDF header), 50MB size limit

## Design Principles

- **No n8n coupling:** KRATOS core never imports n8n types or references n8n concepts
- **Adapter pattern:** Lex is one of many possible sources (`source` enum is extensible)
- **Same pipeline:** Ingested documents go through the exact same extraction → analysis → review → export pipeline as manually uploaded ones
- **Dedup safety:** SHA-256 per-user dedup prevents re-processing identical PDFs regardless of source
