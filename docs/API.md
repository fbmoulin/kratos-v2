# KRATOS v2 — API Reference

**Base URL:** `http://localhost:3001/v2` (dev) | `https://api.kratos.leg.br/v2` (production)
**Version:** 2.0.1
**Last updated:** 2026-02-14

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

> **Note:** Rate limiter is not yet applied to any routes. Available via `rateLimiter(maxRequests, windowMs)` middleware for Phase 1 integration.

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

> **Note:** All checks currently return `"pending"` — actual connectivity checks will be implemented in Phase 1.

---

### Document Endpoints (Authenticated)

All document endpoints require `Authorization: Bearer <token>`.

---

#### `GET /v2/documents`

List documents for the authenticated user.

**Response (200):**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

> **Note:** Currently returns empty list. DB query integration in Phase 1.

---

#### `POST /v2/documents`

Upload new document metadata.

**Request body** (`application/json`):
```json
{
  "fileName": "peticao_inicial.pdf",
  "fileSize": 2048000
}
```

**Validation rules:**
| Field | Type | Rules |
|-------|------|-------|
| `fileName` | string | Required, 1-255 chars |
| `fileSize` | number | Required, positive, max 52,428,800 (50MB) |

**Response (201):**
```json
{
  "id": "c7a8b9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d",
  "fileName": "peticao_inicial.pdf",
  "fileSize": 2048000,
  "status": "pending",
  "createdAt": "2026-02-14T20:00:00.000Z"
}
```

**Error (400):** Zod validation failure:
```json
{
  "success": false,
  "error": { /* Zod error details */ }
}
```

> **Phase 1:** Will accept `multipart/form-data` with actual PDF file, upload to Supabase Storage, and enqueue Celery extraction job.

---

#### `GET /v2/documents/:id`

Get details for a specific document.

**Response (200):**
```json
{
  "id": "c7a8b9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d",
  "status": "pending",
  "message": "Document endpoint scaffold - implementation pending"
}
```

---

#### `GET /v2/documents/:id/extraction`

Get extraction results for a processed document.

**Response (200):**
```json
{
  "documentId": "c7a8b9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d",
  "extraction": null,
  "message": "Extraction endpoint scaffold - implementation pending"
}
```

---

#### `POST /v2/documents/:id/analyze`

Queue AI analysis for a document. Returns immediately with tracking ID.

**Response (202):**
```json
{
  "documentId": "c7a8b9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d",
  "analysisId": "f3g4h5i6-j7k8-4l9m-0n1o-2p3q4r5s6t7u",
  "status": "queued",
  "message": "Analysis endpoint scaffold - implementation pending"
}
```

---

## HTTP Status Codes

| Code | Meaning | Used by |
|------|---------|---------|
| 200 | Success | GET endpoints |
| 201 | Created | POST /documents |
| 202 | Accepted (queued) | POST /documents/:id/analyze |
| 400 | Validation error | POST with invalid body |
| 401 | Unauthorized | Missing or invalid JWT |
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
  fileSize: number;    // Bytes
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pages: number | null;
  createdAt: Date;
  updatedAt: Date;
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

### ReviewPayload

```typescript
interface ReviewPayload {
  action: 'approved' | 'revised' | 'rejected';
  comments: string;
  revisedContent?: Record<string, unknown>; // Only for 'revised'
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

# Upload document
curl -X POST http://localhost:3001/v2/documents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.pdf", "fileSize": 1024}'
```
