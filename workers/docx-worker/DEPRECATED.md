# DEPRECATED — Legacy DOCX Worker (Redis BRPOP)

**Status:** Superseded by `workers/trigger/src/docx.ts` (Trigger.dev task) as of v2.6.0.

**Do not use this worker for new development.** It is kept for reference only until Trigger.dev migration is fully validated.

## Replacement

| Old (this worker) | New (Trigger.dev) |
|---|---|
| `workers/docx-worker/` (Redis BRPOP) | `workers/trigger/src/docx.ts` |
| Redis BRPOP on `kratos:jobs:docx` queue | Trigger.dev `docx-export` task (`schemaTask`) |
| Fetches analysis, builds DOCX, uploads to Supabase Storage | 2-min timeout, 1vCPU/1GB, automatic retries |
| Manual Redis connection management | Trigger.dev managed queue with observability |

## When to Delete

This directory can be safely deleted once:
1. Trigger.dev migration Tasks 7-10 are complete
2. All 235+ tests pass with Trigger.dev as the sole worker backend
3. No production environment relies on Redis BRPOP fallback
