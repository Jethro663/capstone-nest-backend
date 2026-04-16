# Backend + AI Performance Fix Plan

## Safe Immediate Fixes

- Push `buildPerformanceDiagnostics` filtering into the initial incorrect-response query so only the target class and optional student are loaded.
- Replace `buildClassRows` sequential snapshot recomputation with the existing bounded parallel recompute helper or a batched preload path.
- Move `_render_pdf_pages_to_images(doc)` behind the `uses_vision_extraction` check in `extraction_pipeline.py`.
- Stop rebuilding lesson/extraction/question chunk lists twice inside `reindex_class_content`; reuse the first computed lists for counts.
- Batch `content_chunks`, `lesson_content_blocks`, `assessment_questions`, `assessment_question_options`, and `student_concept_mastery` writes where shapes are already normalized.

## Conditional Local Refactors

- Shift synchronous extraction reindexing onto the existing AI job/runtime pattern so long-running indexing work stops blocking teacher-facing HTTP responses.
- Replace per-concept evidence lookups in backend diagnostics with one broader read plus in-memory grouping or a dedicated SQL aggregation query.

## Deferred Items Requiring Human Decision

- Any schema-level indexing or full-text-search strategy for `content_chunks.chunk_text` should be decided explicitly because it affects persistence and operations policy.
- Broader decomposition of `ai-service/app/main.py` into route families and service modules would improve extension safety, but it is larger than a bounded performance pass.
