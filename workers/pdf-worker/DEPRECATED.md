# ARCHIVED — Legacy PDF Worker (Celery/Python)

**Status:** ARCHIVED. Superseded by `workers/trigger/src/pdf.ts` (Trigger.dev task) as of v2.6.0.

> **This worker is not used at runtime.** It is kept as a reference archive only. All production PDF extraction flows through Trigger.dev (`workers/trigger/src/pdf.ts`) which calls the Python extraction logic via `pdf_runner.py` subprocess.

## History

The legacy Celery/Python worker was the original extraction pipeline. It has been fully replaced by Trigger.dev tasks that call the same Python extraction code via `execa` subprocess.

## Replacement

| Old (this worker) | New (Trigger.dev) |
|---|---|
| `workers/pdf-worker/` (Python/Celery) | `workers/trigger/src/pdf.ts` |
| `CELERY_BROKER_URL` env var | `TRIGGER_SECRET_KEY` env var |
| Redis queue via Celery | Trigger.dev managed queue |
| `docker-compose.yml` profile: worker | Trigger.dev Cloud |

## What Is Still Used

The Python extraction code in `src/pipeline.py` and `src/services/pdf_extraction.py` is still called by `workers/trigger/src/pdf_runner.py` via subprocess. The Celery infrastructure (`celery_app.py`, `tasks/`) is NOT used.

## Safe to Delete

This directory can be safely deleted once:
1. All Python extraction logic has been fully ported to TypeScript, OR
2. The subprocess approach (`pdf_runner.py`) is confirmed stable in production
