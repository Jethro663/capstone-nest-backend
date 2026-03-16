# Nexora Non-AI Remediation Handoff Plan (Backend + Next Frontend)

## Purpose
This plan is a direct handoff document for another coding agent to fix high-priority issues and complete non-AI feature gaps using only verified repository evidence.

## Scope
- In scope: `backend/` and `next-frontend/`
- Out of scope: `ai-service/` feature expansion and new AI capabilities
- Primary alignment targets:
  - Concept scope and modules in [Concept paper.txt](../Concept%20paper.txt#L203-L327)
  - Architecture/security rules in [.github/copilot-instructions.md](../.github/copilot-instructions.md)

## Required Working Rules for Implementing Agent
1. Do not change unrelated files.
2. Keep controller/service layering intact (controller delegates, service handles logic/DB).
3. Preserve existing auth model (global `JwtAuthGuard` + route-level `RolesGuard` patterns already used).
4. Add/adjust tests where adjacent tests already exist.
5. Validate with project scripts only:
   - Backend: `npm run lint`, `npm run test`, `npm run build`
   - Frontend: `npm run lint`, `npm run build`

---

## Problem P0-1 — Swagger production exposure condition appears inverted

### Evidence Files
- [backend/src/main.ts](../backend/src/main.ts#L50-L73)

### Context
- Comment says Swagger should be exposed outside production.
- Current condition executes Swagger setup inside `if (isProd)`.
- This is a production security/documentation exposure risk.

### Instruction Set
1. In [backend/src/main.ts](../backend/src/main.ts#L50-L73), change Swagger setup condition so docs are enabled only in non-production (or behind explicit env flag if preferred by maintainers).
2. Keep existing Swagger config object content unchanged unless necessary.
3. Ensure startup log message aligns with new condition.

### Done Criteria
- Swagger route is not mounted in production mode.
- Swagger remains available in development.

### Validation
- Run `npm run build` and `npm run test` in `backend/`.

---

## Problem P0-2 — Intervention threshold mismatch vs concept paper

### Evidence Files
- Concept threshold references: [Concept paper.txt](../Concept%20paper.txt#L40-L44), [Concept paper.txt](../Concept%20paper.txt#L55-L63), [Concept paper.txt](../Concept%20paper.txt#L228-L231)
- Backend hardcoded threshold: [backend/src/modules/lxp/lxp.service.ts](../backend/src/modules/lxp/lxp.service.ts#L29)
- Frontend text hardcoded threshold: [next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx](../next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx#L128)

### Context
- Concept states threshold example as below 60%.
- Current implementation uses fixed 74% in service and UI copy.
- This creates product-rule inconsistency and user confusion.

### Instruction Set
1. Decide one canonical threshold source for now:
   - Minimum acceptable: unify to one constant value across backend + UI.
   - Preferred: move threshold to config/env and read from backend, then display from API response.
2. Update [backend/src/modules/lxp/lxp.service.ts](../backend/src/modules/lxp/lxp.service.ts#L29) and dependent logic outputs.
3. Update UI wording in [next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx](../next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx#L128) to use API-provided threshold or aligned constant.
4. Ensure no other magic numbers remain for threshold-related decisions.

### Done Criteria
- Backend eligibility/report responses and frontend label show the same threshold.
- No contradictory threshold text remains in teacher intervention page.

### Validation
- Backend: run `npm run test`.
- Frontend: run `npm run build` and check intervention page renders threshold correctly.

---

## Problem P0-3 — Query pagination parse risk (NaN / invalid number handling)

### Evidence Files
- [backend/src/modules/sections/sections.controller.ts](../backend/src/modules/sections/sections.controller.ts#L58-L59)
- [backend/src/modules/classes/classes.controller.ts](../backend/src/modules/classes/classes.controller.ts#L59-L60)
- [backend/src/modules/classes/classes.controller.ts](../backend/src/modules/classes/classes.controller.ts#L309-L310)

### Context
- `parseInt` is used directly from query strings.
- Invalid input can produce `NaN` and pass unintended values into services.

### Instruction Set
1. Add robust numeric parsing/validation in the affected controllers:
   - Accept only positive integers for `page` and `limit`.
   - On invalid values, throw `BadRequestException` with clear message.
2. Keep response shape unchanged.
3. If project pattern exists for pagination DTO/pipes, prefer that pattern instead of ad-hoc parsing.

### Done Criteria
- Invalid `page`/`limit` values return 400.
- Valid pagination remains behaviorally unchanged.

### Validation
- Add/update controller tests near existing specs:
  - [backend/src/modules/sections/sections.controller.spec.ts](../backend/src/modules/sections/sections.controller.spec.ts)
  - [backend/src/modules/classes/classes.service.spec.ts](../backend/src/modules/classes/classes.service.spec.ts)
- Run `npm run test` in `backend/`.

---

## Problem P0-4 — LXP multi-step write paths should be transactional

### Evidence Files
- Checkpoint completion updates multiple tables: [backend/src/modules/lxp/lxp.service.ts](../backend/src/modules/lxp/lxp.service.ts#L461-L518)
- Assignment replacement path performs delete + insert + update: [backend/src/modules/lxp/lxp.service.ts](../backend/src/modules/lxp/lxp.service.ts#L671-L703)

### Context
- These operations mutate several records that must stay consistent.
- Without transaction wrapping, partial writes can leave intervention state inconsistent.

### Instruction Set
1. Wrap multi-step write flows in DB transactions (`this.db.transaction(...)`) for:
   - checkpoint completion flow
   - teacher assignment replacement flow
2. Preserve existing business behavior and notifications.
3. Ensure read-after-write returns still work.
4. Do not introduce schema changes unless absolutely required.

### Done Criteria
- Each multi-write flow is atomic.
- Failures roll back all related changes.

### Validation
- Extend/add service tests under LXP module (create if missing) or adjacent behavior tests.
- Run `npm run test` in `backend/`.

---

## Problem P1-1 — LXP teacher queue has N+1 query pattern

### Evidence Files
- N+1 loop in queue generation: [backend/src/modules/lxp/lxp.service.ts](../backend/src/modules/lxp/lxp.service.ts#L553-L560)

### Context
- For each intervention case, the code fetches assignments and progress separately.
- This can scale poorly for large classes.

### Instruction Set
1. Refactor `getTeacherQueue` to batch-load dependent data:
   - fetch all assignments for case IDs in one query and group in memory
   - fetch all progress rows for `(studentId, classId)` in one query (or classId-based query)
2. Keep returned JSON shape unchanged.
3. Avoid premature micro-optimizations outside this method.

### Done Criteria
- Function avoids per-row DB queries in map loop.
- Output remains backward-compatible.

### Validation
- Run `npm run test`.
- If performance tests exist, run module-relevant specs.

---

## Problem P1-2 — Reporting module is partially implemented (frontend integration gap)

### Evidence Files
- Concept reporting requirements: [Concept paper.txt](../Concept%20paper.txt#L292-L311)
- Backend class record report endpoints exist: [backend/src/modules/class-record/class-record.controller.ts](../backend/src/modules/class-record/class-record.controller.ts#L198-L257)
- Frontend report service methods exist but appear unused in pages: [next-frontend/src/services/class-record-service.ts](../next-frontend/src/services/class-record-service.ts#L95-L107)
- Student masterlist endpoint exists: [backend/src/modules/classes/classes.controller.ts](../backend/src/modules/classes/classes.controller.ts#L287-L316)

### Context
- API surface for reports is present.
- UI integration for core report views (class average/distribution/intervention, etc.) is incomplete.

### Instruction Set
1. Add/complete teacher/admin reporting page(s) in `next-frontend/app/(dashboard)/dashboard/**` using existing services.
2. Wire class selection + report cards/tables for:
   - class average
   - grade distribution
   - intervention list
3. Reuse existing design system components and route conventions.
4. Do not invent new backend endpoints unless a hard blocker is proven.

### Done Criteria
- At least one navigable reporting page consumes existing report endpoints.
- Errors/loading states are handled.

### Validation
- Frontend `npm run lint` and `npm run build`.

---

## Problem P1-3 — Audit trail page is placeholder (system usage/reporting gap)

### Evidence Files
- Placeholder page: [next-frontend/app/(dashboard)/dashboard/admin/audit/page.tsx](../next-frontend/app/(dashboard)/dashboard/admin/audit/page.tsx#L1-L22)

### Context
- Concept includes system usage reporting and activity logging.
- Current admin audit UI is non-functional placeholder.

### Instruction Set
1. Replace placeholder with functional audit view.
2. If backend audit endpoint does not exist, implement minimal backend support first (read-only list, paginated).
3. Keep role restriction to admin.
4. Use consistent pagination/filter structure with existing dashboard patterns.

### Done Criteria
- Admin audit page renders real records from backend.
- Empty state only appears when dataset is empty, not as permanent placeholder.

### Validation
- Backend tests/lint/build and frontend lint/build all pass.

---

## Problem P2-1 — System evaluation read path exists in backend but lacks frontend management view

### Evidence Files
- Backend submit + list endpoints: [backend/src/modules/lxp/lxp.controller.ts](../backend/src/modules/lxp/lxp.controller.ts#L103-L120)
- Frontend currently only submits evaluation from student LXP page: [next-frontend/app/(dashboard)/dashboard/student/lxp/page.tsx](../next-frontend/app/(dashboard)/dashboard/student/lxp/page.tsx#L90-L104)
- Frontend service currently only submits evaluations: [next-frontend/src/services/lxp-service.ts](../next-frontend/src/services/lxp-service.ts#L72-L80)

### Context
- Concept includes system evaluation storage and analysis.
- Read/analytics workflow for teacher/admin is incomplete in frontend.

### Instruction Set
1. Add frontend service method for `GET /lxp/evaluations`.
2. Implement teacher/admin page to list/filter evaluations (target module, scores, feedback).
3. Keep permission handling aligned with backend role rules.

### Done Criteria
- Teacher/admin can view submitted evaluations.
- Student remains submit-only.

### Validation
- Frontend lint/build pass.

---

## Problem P2-2 — Section service has duplicated semantic methods (`delete` and `archive`) on same endpoint

### Evidence Files
- [next-frontend/src/services/section-service.ts](../next-frontend/src/services/section-service.ts#L117-L130)

### Context
- `delete` and `archive` call the same backend route.
- This causes API semantic ambiguity and maintainability confusion.

### Instruction Set
1. Normalize section service method naming to reflect actual backend behavior (soft-delete/archive).
2. Keep backward compatibility if existing pages call both methods (temporary alias + deprecation comment in code if needed).
3. Update consuming pages where practical.

### Done Criteria
- Clear single semantic method for soft deletion in service layer.

### Validation
- Frontend lint/build pass.

---

## Suggested Execution Order
1. P0-1 Swagger condition
2. P0-2 Threshold alignment/config source
3. P0-3 Pagination guards
4. P0-4 LXP transactional writes
5. P1-1 LXP queue batching
6. P1-2 Reporting UI completion
7. P1-3 Audit trail implementation
8. P2-1 System evaluation management UI
9. P2-2 Section service semantic cleanup

## Handoff Notes for Next Agent
- Treat this document as the source of execution truth.
- If a required behavior is unclear, prefer the concept-paper module intent and current backend route contracts.
- Do not introduce AI-feature expansions; focus on non-AI completion and stabilization.
