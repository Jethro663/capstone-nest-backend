# Performance Safe Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the three highest-priority bounded performance wastes identified in the backend/AI audit without changing contracts.

**Architecture:** Keep the existing service boundaries intact and make localized changes only. The backend fix narrows diagnostics reads and reuses existing parallel recomputation helpers; the AI fix defers expensive vision rendering until the vision path is actually selected.

**Tech Stack:** NestJS, Jest, FastAPI, unittest, Drizzle, SQLAlchemy, PyMuPDF

---

### Task 1: Backend diagnostics and summary path

**Files:**
- Modify: `backend/src/modules/performance/performance.service.ts`
- Test: `backend/src/modules/performance/performance.service.spec.ts`

- [ ] **Step 1: Write the failing Jest tests**

Add tests that prove:
1. diagnostics only request incorrect responses for the target class/student path
2. missing snapshot recomputation uses the existing class-level parallel helper instead of sequential per-student recompute inside `buildClassRows`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- performance.service.spec.ts`
Expected: the new assertions fail before production changes.

- [ ] **Step 3: Write the minimal backend implementation**

Update `buildPerformanceDiagnostics` to push class/student filtering into the initial read shape, and update `buildClassRows` to bulk-recompute missing snapshots before reading snapshots for response assembly.

- [ ] **Step 4: Re-run targeted backend tests**

Run: `npm test -- performance.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Run structural backend verification**

Run: `npm run build`
Expected: PASS

### Task 2: AI extraction vision rendering

**Files:**
- Modify: `ai-service/app/extraction_pipeline.py`
- Test: `ai-service/tests/test_extraction_pipeline.py`

- [ ] **Step 1: Write the failing unittest**

Add a test that patches PDF helpers and proves `_render_pdf_pages_to_images` is not called when extractable text is present and the text-first path is taken.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `python -m unittest ai-service.tests.test_extraction_pipeline`
Expected: FAIL because the current implementation renders vision images unconditionally.

- [ ] **Step 3: Write the minimal AI implementation**

Move page-image rendering behind the `uses_vision_extraction` guard while preserving the existing vision branch behavior.

- [ ] **Step 4: Re-run targeted AI tests**

Run: `python -m unittest ai-service.tests.test_extraction_pipeline`
Expected: PASS

- [ ] **Step 5: Run structural AI verification**

Run:
- `python scripts/run_tests.py`
- `python -c "from app.main import app; print(app.title)"`

Expected: both commands pass.

### Task 3: Audit artifact refresh

**Files:**
- Modify: `docs/system-audit/backend-ai-performance-input-2026-04-16.json`
- Regenerate: `docs/system-audit/backend-ai-performance-audit-2026-04-16.md`
- Regenerate: `docs/system-audit/backend-ai-performance-fix-plan-2026-04-16.md`
- Regenerate: `docs/system-audit/backend-ai-performance-data-2026-04-16.json`

- [ ] **Step 1: Update finding statuses and notes**

Mark the implemented P1 items as fixed and record exactly what changed.

- [ ] **Step 2: Re-render the audit artifacts**

Run: `python .agents/skills/backend-ai-performance-remediator/scripts/render_audit_report.py docs/system-audit/backend-ai-performance-input-2026-04-16.json`
Expected: regenerated markdown and data files.

- [ ] **Step 3: Perform second-pass rescan**

Re-read touched backend and AI files plus their direct tests to confirm contracts and orchestration remain intact.
