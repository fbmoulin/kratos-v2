# DEPRECATED — Legacy Analysis Worker (Redis BRPOP)

**Status:** Superseded by `workers/trigger/src/analysis.ts` (Trigger.dev task) as of v2.6.0.

**Do not use this worker for new development.** It is kept for reference only until Trigger.dev migration is fully validated.

## Replacement

| Old (this worker) | New (Trigger.dev) |
|---|---|
| `workers/analysis-worker/` (Redis BRPOP) | `workers/trigger/src/analysis.ts` |
| Redis BRPOP on `kratos:jobs:analysis` queue | Trigger.dev `analysis-job` task (`schemaTask`) |
| 4.5min timeout, SIGTERM handler | 10-min timeout, 2vCPU/4GB, automatic retries |
| Manual Redis connection management | Trigger.dev managed queue with observability |

## When to Delete

This directory can be safely deleted once:
1. Trigger.dev migration Tasks 7-10 are complete
2. All 235+ tests pass with Trigger.dev as the sole worker backend
3. No production environment relies on Redis BRPOP fallback
