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

## No Longer Used at Runtime

As of v2.8.0, the Python extraction code has been migrated to `workers/trigger/extraction/` as a self-contained package. `pdf_runner.py` now imports from `extraction.pipeline` instead of this directory.

This directory is **safe to delete** — it exists only as historical reference. The canonical extraction code lives at `workers/trigger/extraction/`.
