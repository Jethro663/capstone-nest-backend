# Backend + AI Performance Fix Plan

## Safe Immediate Fixes

- Add Node 20.9+ version pinning and an AI virtual-environment/bootstrap command so the full baseline runs locally.
- Remove duplicate chunk-list construction in reindex_class_content while preserving output counts.
- Add query-count regression tests for the student assessment list and class performance recompute paths.

## Conditional Local Refactors

- Introduce set-based performance recomputation with grouped attempt and class-record reads, while preserving snapshot/audit semantics.
- Replace per-assessment student visibility checks with a bulk visibility query and page after filtering.
- Batch index chunk inserts with a portable correlation key before bulk embedding insertion.

## Deferred Items Requiring Human Decision

- Move administrative backfills to the queue with progress reporting and explicit retry policy.
- Split ai-service/app/main.py into APIRouter families and isolated job-runtime modules.
- Choose between aggregate mobile endpoints and bounded client refetch concurrency for dashboard-scale data.
