# KRATOS v2 — API Reference

**Base URL:** `http://localhost:3001/v2` (dev) | `https://api-production-8225.up.railway.app/v2` (production)
**Version:** 2.4.0
**Last updated:** 2026-02-16

---

## Authentication

All `/documents` endpoints require a Supabase JWT in the `Authorization` header.
Health and root endpoints are public.

```
Authorization: Bearer <supabase_jwt_token>
```

### Error responses

| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "Missing or invalid Authorization header" }` | No `Authorization` header or missing `Bearer` prefix |
| 401 | `{ "error": "Invalid or expired token" }` | JWT is invalid, expired, or revoked |
| 500 | `{ "error": "Authentication failed" }` | Supabase service unreachable |

### Context variables

After successful auth, route handlers can access:
- `c.get('userId')` — UUID string
- `c.get('user')` — Full Supabase User object

---

## Rate Limiting

In-memory sliding-window rate limiter (MVP). Headers included on all rate-limited responses:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `Retry-After` | Seconds until window resets (only on 429) |

> **Note:** Rate limiter is not yet applied to any routes. Available via `rateLimiter(maxRequests, windowMs)` middleware for Phase 2 integration.

---

## Endpoints

### Public Endpoints

#### `GET /v2`

Returns API metadata. No authentication required.

**Response (200):**
```json
{
  "name": "KRATOS v2",
  "version": "2.0.0",
  "status": "operational",
  "timestamp": "2026-02-14T20:00:00.000Z"
}
```

---

#### `GET /v2/health`

Liveness probe. Returns 200 if the API process is running.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "KRATOS v2",
  "version": "2.0.0",
  "uptime": 123.456,
  "timestamp": "2026-02-14T20:00:00.000Z",
  "environment": "development"
}
```

---

#### `GET /v2/health/ready`

Readiness probe. Checks downstream dependency connectivity.

**Response (200):**
```json
{
  "status": "ready",
  "checks": {
    "database": "pending",
    "redis": "pending",
    "storage": "pending"
  }
}
```

> **Note:** All checks currently return `"pending"` — actual connectivity checks will be implemented in Phase 2.

---

### Document Endpoints (Authenticated)

All document endpoints require `Authorization: Bearer <token>`.
All responses use `{ "data": ... }` wrapper for success and `{ "error": { "message": "..." } }` for errors.

---

#### `GET /v2/documents`

List documents for the authenticated user (paginated, from database).

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | — | Filter by status (`pending`, `processing`, `completed`, `failed`) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "c7a8b9d0-...",
      "userId": "user-uuid",
      "fileName": "peticao_inicial.pdf",
      "filePath": "user-uuid/doc-uuid/peticao_inicial.pdf",
      "fileSize": 2048000,
      "mimeType": "application/pdf",
      "status": "completed",
      "pages": 12,
      "errorMessage": null,
      "createdAt": "2026-02-14T20:00:00.000Z",
      "updatedAt": "2026-02-14T20:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### `POST /v2/documents`

Upload a new PDF document for processing.

**Request body** (`multipart/form-data`):
| Field | Type | Rules |
|-------|------|-------|
| `file` | File | Required, PDF only (`application/pdf`), max 50MB |

**Response (201):**
```json
{
  "data": {
    "id": "c7a8b9d0-...",
    "userId": "user-uuid",
    "fileName": "peticao_inicial.pdf",
    "filePath": "user-uuid/doc-uuid/peticao_inicial.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "status": "pending",
    "pages": null,
    "errorMessage": null,
    "createdAt": "2026-02-14T20:00:00.000Z",
    "updatedAt": "2026-02-14T20:00:00.000Z"
  }
}
```

**Error (400):**
```json
{ "error": { "message": "Only PDF files are allowed" } }
{ "error": { "message": "File is required" } }
{ "error": { "message": "File exceeds 50MB limit" } }
```

**Pipeline:** Upload triggers: Supabase Storage save → `documents` DB row → Redis job enqueue → Python worker extraction.

---

#### `GET /v2/documents/:id`

Get full pipeline context for a document — includes extraction and analysis in a single request. Returns 404 if not found or not owned by user.

**Response (200):**
```json
{
  "data": {
    "id": "c7a8b9d0-...",
    "userId": "user-uuid",
    "fileName": "peticao_inicial.pdf",
    "filePath": "user-uuid/doc-uuid/peticao_inicial.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "status": "reviewed",
    "pages": 12,
    "errorMessage": null,
    "createdAt": "2026-02-14T20:00:00.000Z",
    "updatedAt": "2026-02-14T20:01:00.000Z"
  },
  "extraction": {
    "id": "ext-uuid",
    "documentId": "doc-uuid",
    "rawText": "Trata-se de acao...",
    "createdAt": "2026-02-14T20:01:00.000Z"
  },
  "analysis": {
    "id": "ana-uuid",
    "extractionId": "ext-uuid",
    "modelUsed": "claude-sonnet-4",
    "resultJson": {
      "firac": { "facts": "...", "issue": "...", "rule": "...", "analysis": "...", "conclusion": "..." },
      "router": { "legalMatter": "bancario", "complexity": 72 },
      "draft": "RELATÓRIO\n\n...",
      "rawText": "Trata-se de acao..."
    },
    "createdAt": "2026-02-14T20:02:00.000Z"
  }
}
```

> `analysis` and `extraction` are `null` if the document has not been processed yet.

**Error (404):**
```json
{ "error": { "message": "Document not found" } }
```

---

#### `GET /v2/documents/:id/extraction`

Get extraction results for a processed document. Returns 404 if document not found or extraction not complete.

**Response (200):**
```json
{
  "data": {
    "id": "ext-uuid",
    "documentId": "doc-uuid",
    "contentJson": {
      "text": "Trata-se de acao de cobranca...",
      "tables": [{ "headers": ["Valor", "Data"], "rows": [["1000", "2026-01-01"]] }],
      "images": [],
      "metadata": { "pages": 12, "method": "pdfplumber" }
    },
    "extractionMethod": "pdfplumber",
    "rawText": "Trata-se de acao de cobranca...",
    "tablesCount": 1,
    "imagesCount": 0,
    "createdAt": "2026-02-14T20:01:00.000Z"
  }
}
```

**Error (404):**
```json
{ "error": { "message": "Document not found" } }
{ "error": { "message": "Extraction not available" } }
```

---

#### `POST /v2/documents/:id/analyze`

Queue AI analysis for a document. Async — returns 202 immediately, pipeline runs in background.

**Response (202):**
```json
{
  "documentId": "c7a8b9d0-...",
  "status": "queued"
}
```

---

#### `POST /v2/documents/:id/export`

Enqueue DOCX export for a reviewed document. Async — `docx-worker` generates and uploads the file.

**Requires:** Document status must be `reviewed`.

**Response (202):**
```json
{ "status": "queued" }
```

---

#### `GET /v2/documents/:id/export`

Get signed download URL for the generated DOCX file. Poll this endpoint after `POST /export` until `url` is present (typically within 5–10s).

**Response (200) — ready:**
```json
{
  "data": {
    "url": "https://jzgdorcvfxlahffqnyor.supabase.co/storage/v1/object/sign/documents/...",
    "expiresIn": 3600
  }
}
```

**Response (200) — not ready yet:**
```json
{ "data": null }
```

---

## HTTP Status Codes

| Code | Meaning | Used by |
|------|---------|---------|
| 200 | Success | GET endpoints |
| 201 | Created | POST /documents |
| 202 | Accepted (queued) | POST /documents/:id/analyze |
| 400 | Validation error | POST with invalid file/body |
| 401 | Unauthorized | Missing or invalid JWT |
| 404 | Not found | Document or extraction not found |
| 429 | Rate limited | When rate limiter is applied |
| 500 | Server error | Unexpected failures |

---

## Data Schemas

### Document

```typescript
interface Document {
  id: string;          // UUID
  userId: string;      // UUID (from JWT)
  fileName: string;    // Original file name
  filePath: string;    // Supabase Storage path
  fileSize: number;    // Bytes
  mimeType: string;    // MIME type (application/pdf)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pages: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Extraction

```typescript
interface Extraction {
  id: string;              // UUID
  documentId: string;      // FK to Document
  contentJson: object;     // Structured extraction (text, tables, images, metadata)
  extractionMethod: string; // e.g. "pdfplumber"
  rawText: string;         // Plain text content
  tablesCount: number;
  imagesCount: number;
  createdAt: Date;
}
```

### FIRACResult

```typescript
interface FIRACResult {
  facts: string;       // Extracted facts from the document
  issue: string;       // Legal issue identified
  rule: string;        // Applicable legal rules/precedents
  analysis: string;    // Legal reasoning and analysis
  conclusion: string;  // Final recommendation
}
```

---

## Middleware Chain

Requests pass through middleware in this order:

1. **Logger** — Logs `<-- METHOD /path` and `--> METHOD /path STATUS Xms`
2. **Secure Headers** — Sets `X-Content-Type-Options`, `X-Frame-Options`, etc.
3. **CORS** — Allows origin from `CORS_ORIGIN` env (default: `http://localhost:5173`)
4. **Auth** _(documents only)_ — Validates Supabase JWT, sets `user`/`userId` on context

---

## Testing

```bash
# Health check (no auth)
curl http://localhost:3001/v2/health

# List documents (requires token)
curl -H "Authorization: Bearer <token>" http://localhost:3001/v2/documents

# Upload PDF document
curl -X POST http://localhost:3001/v2/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@peticao.pdf"

# Get document details
curl -H "Authorization: Bearer <token>" http://localhost:3001/v2/documents/<id>

# Get extraction results
curl -H "Authorization: Bearer <token>" http://localhost:3001/v2/documents/<id>/extraction
```
