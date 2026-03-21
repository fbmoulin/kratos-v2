# DEPRECATED — Legacy PDF Worker (Celery/Python)

**Status:** Superseded by `workers/trigger/src/pdf.ts` (Trigger.dev task) as of v2.6.0.

**Do not use this worker for new development.** It is kept for reference only — the Python extraction logic may be useful when implementing the full Docling/pdfplumber/Gemini Vision pipeline (post-MVP).

## Replacement

| Old (this worker) | New (Trigger.dev) |
|---|---|
| `workers/pdf-worker/` (Python/Celery) | `workers/trigger/src/pdf.ts` |
| `CELERY_BROKER_URL` env var | `TRIGGER_SECRET_KEY` env var |
| Redis queue via Celery | Trigger.dev managed queue |
| `docker-compose.yml` profile: worker | Trigger.dev Cloud |

## When to Delete

This directory can be safely deleted once:
1. Full PDF extraction pipeline (Docling + pdfplumber + Gemini Vision) is ported to TypeScript or called via subprocess from `pdf.ts`
2. All useful Python extraction logic has been migrated
3. The 24 tests in `tests/` have equivalent coverage in `workers/trigger/src/pdf.test.ts`
