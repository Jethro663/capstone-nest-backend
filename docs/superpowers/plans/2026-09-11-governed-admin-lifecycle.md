# Governed Admin Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give web administrators a safe, understandable way to correct, withdraw, transfer, archive, and purge lifecycle records without weakening academic-history invariants.

**Architecture:** Add a backend `admin-lifecycle` orchestration module that produces deterministic read-only manifests and executes operation-specific commands through the existing ambient academic transaction. Store precise enrollment semantics in append-only lifecycle events, store idempotent execution evidence in operation rows, and expose the workflow through one reusable contextual web dialog integrated into current admin pages.

**Tech Stack:** NestJS 11, Drizzle/PostgreSQL, Jest, Next.js 16, React 19, Tailwind 4, Axios service wrappers, OpenSpec.

## Global Constraints

- No generic `force` bypass and no mutation of finalized or locked academic evidence.
- Existing enrollment consumers continue to use `enrolled`, `dropped`, and `completed`.
- Preview remains read-only; one student, class, or section execute request is atomic.
- Concrete runtime DTOs and the existing `success/message/data` response envelope are required.
- Execution is admin-only, current-password protected, idempotent, audited, and controlled by `ADMIN_LIFECYCLE_ENABLED`.
- Web is the first execution surface; mobile source and APK artifacts remain untouched.

---

### Task 1: Lifecycle persistence, retention, and DTO contracts

**Files:**

- Create: `backend/src/drizzle/schema/admin-lifecycle.schema.ts`
- Create: `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts`
- Create: `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.spec.ts`
- Modify: `backend/src/drizzle/schema/index.ts`
- Modify: `backend/src/drizzle/schema/base.schema.ts`
- Generate: `backend/drizzle/0018_governed_admin_lifecycle.sql`
- Generate: `backend/drizzle/meta/0018_snapshot.json`
- Modify: `backend/drizzle/meta/_journal.json`

**Interfaces:**

- Produces: `adminLifecycleOperations`, `enrollmentLifecycleEvents`, `AdminLifecycleAction`, operation-specific preview DTOs, operation-specific execute DTOs.
- Preserves: `enrollment_status` values and every existing enrollment consumer.

- [ ] **Step 1: Write failing DTO tests**

Test that invalid action-specific field combinations, malformed hashes, short reasons, non-UUID idempotency keys, and missing learner outcomes fail validation while valid student, class, section, and purge requests pass.

- [ ] **Step 2: Verify the DTO test is red**

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.spec.ts`

Expected: FAIL because the DTO module does not exist.

- [ ] **Step 3: Add schema and concrete DTOs**

The operation row SHALL contain `id`, `action`, `targetType`, `targetId`, `status`, `actorId`, `actorSnapshot`, `idempotencyKey`, `requestHash`, `manifestHash`, `reasonCode`, `notes`, `attemptCount`, `result`, `failure`, `createdAt`, `updatedAt`, and `completedAt`. The event row SHALL contain source and destination identities, from/to status, semantic outcome, effective period, reason, actor snapshot, and operation reference.

Change `audit_logs.actor_id` to nullable `ON DELETE SET NULL`; lifecycle audits include an actor snapshot in metadata.

- [ ] **Step 4: Generate and inspect the migration**

Run: `cd backend && npx drizzle-kit generate --name governed_admin_lifecycle`

Expected: a registered `0018_governed_admin_lifecycle` migration with the two tables, constraints, indexes, and audit foreign-key alteration.

- [ ] **Step 5: Verify schema and DTOs are green**

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.spec.ts && npm --prefix backend run check:migrations`

Expected: PASS.

### Task 2: Canonical manifest planning and evidence inventory

**Files:**

- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.types.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.spec.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts`

**Interfaces:**

- Produces: `hashAdminLifecycleRequest()`, `buildAdminLifecycleManifest()`, `AdminLifecycleManifest`, `AdminLifecycleEvidenceInventory`.
- Consumes: normalized snapshot rows collected by the service without performing writes.

- [ ] **Step 1: Write deterministic manifest tests**

Cover reordered rows producing the same SHA-256 hash, changed dependencies producing a different hash, manifest version inclusion, five-minute expiry, exact confirmations, resolvable warnings, and absolute blockers.

- [ ] **Step 2: Verify manifest tests are red**

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle/admin-lifecycle.manifest.spec.ts`

Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement canonical manifests**

Sort arrays by stable identity, serialize a versioned normalized object, and hash it with SHA-256. Return UI-safe summaries separately from the complete internal effect plan.

- [ ] **Step 4: Write and verify evidence-inventory tests red**

Cover class records, scores, attempts, assessments, lessons, enrollment history, lifecycle events, and linked class/section identities.

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts`

Expected: FAIL because the evidence classifier does not exist.

- [ ] **Step 5: Implement and verify the evidence inventory**

Run both focused specs and expect PASS.

### Task 3: Student correction, withdrawal, and transfer

**Files:**

- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts`
- Create: `backend/src/modules/admin-lifecycle/student-lifecycle.service.ts`
- Create: `backend/src/modules/admin-lifecycle/student-lifecycle.service.spec.ts`

**Interfaces:**

- Produces: `previewStudent(dto, actorId)`, `executeStudent(dto, actor)`, and focused student mutation helpers.
- Consumes: current academic state, classes, sections, enrollments, class records/participants/scores, assessments/attempts, operation/event tables, audit, and notifications.

- [ ] **Step 1: Write failing preview tests**

Cover evidence-free correction, evidence-bearing correction blocker, current-period withdrawal, same-year/same-grade/capacity transfer validation, duplicate memberships, ambiguous/missing subject mappings, compatible class transfer, and finalized-history preservation.

- [ ] **Step 2: Verify preview tests are red**

Run the two student/service specs; expected failure is missing implementation.

- [ ] **Step 3: Implement read-only student snapshot and preview**

Use a repeatable-read, read-only transaction. Never return password hashes or raw unrelated student data.

- [ ] **Step 4: Write failing execution tests**

Cover wrong password, disabled flag, stale/expired manifest, missing confirmation, successful atomic status/event/participant changes, transfer rollback, completed idempotent replay, key/payload conflict, in-progress conflict, and failed identical retry.

- [ ] **Step 5: Implement minimal student execution**

Claim the operation outside `academicTransaction`; recompute the manifest under the academic lock; create destination memberships first; close source rows; update only draft current/future participant rows; insert events, operation result, audit, and deduplicated notification rows; mark rollback failure outside the transaction.

- [ ] **Step 6: Run focused student tests green**

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts src/modules/admin-lifecycle/student-lifecycle.service.spec.ts`

Expected: PASS with rollback and replay assertions.

### Task 4: Class, section, and purge lifecycle commands

**Files:**

- Create: `backend/src/modules/admin-lifecycle/class-lifecycle.service.ts`
- Create: `backend/src/modules/admin-lifecycle/class-lifecycle.service.spec.ts`
- Create: `backend/src/modules/admin-lifecycle/section-lifecycle.service.ts`
- Create: `backend/src/modules/admin-lifecycle/section-lifecycle.service.spec.ts`
- Create: `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts`
- Create: `backend/src/modules/admin-lifecycle/purge-lifecycle.service.spec.ts`
- Modify: `backend/src/modules/classes/classes.service.ts`
- Modify: `backend/src/modules/classes/classes.service.spec.ts`
- Modify: `backend/src/modules/sections/sections.service.ts`
- Modify: `backend/src/modules/sections/sections.service.spec.ts`

**Interfaces:**

- Produces: class/section/purge preview and apply helpers consumed by `AdminLifecycleService`.
- Preserves: teacher/adviser identity and all linked academic evidence.

- [ ] **Step 1: Write the target-class archival regression test**

The test SHALL prove a section-only or sibling-class enrollment no longer blocks an empty target class, while an active target-class enrollment does.

- [ ] **Step 2: Verify the regression test is red, then narrow the guard**

Run the focused ClassesService test before and after the minimal query change.

- [ ] **Step 3: Write failing class lifecycle tests**

Cover archive-now, required learner outcome, complete/drop, compatible replacement transfer, incompatible replacement, and required-current-curriculum blocker.

- [ ] **Step 4: Implement and verify class lifecycle**

Apply all target enrollment changes and archive the class in one transaction without clearing teacher ownership.

- [ ] **Step 5: Write failing section lifecycle tests**

Cover missing learner outcome, grouped destinations, incompatible learners, annual-transition redirect, linked classes, and all-or-nothing rollback.

- [ ] **Step 6: Implement and verify section lifecycle**

Reuse the tested student/class primitives. Archive the section only after every learner and linked class has a valid outcome.

- [ ] **Step 7: Write failing purge inventory/guard tests**

Cover empty archived targets and every retained evidence category. Confirm no confirmation or role can bypass evidence.

- [ ] **Step 8: Implement and verify shared purge safeguards**

Use the same evidence inventory from governed and legacy direct purge entrypoints.

### Task 5: Controller, module, feature flag, and API envelopes

**Files:**

- Create: `backend/src/config/admin-lifecycle.config.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.controller.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.controller.spec.ts`
- Create: `backend/src/modules/admin-lifecycle/admin-lifecycle.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `.env.compose.example`

**Interfaces:**

- Produces: operation-specific preview/execute routes and `GET /operations/:operationId` using `success/message/data`.
- Security: global JWT plus explicit `@Roles(RoleName.Admin)` and endpoint throttling.

- [ ] **Step 1: Write failing controller contract tests**

Verify every route delegates the correct concrete DTO, formats the canonical envelope, redacts secrets, rejects non-admin callers, and exposes operation lookup only to administrators.

- [ ] **Step 2: Verify controller tests are red**

Run the focused controller spec and confirm missing controller/module failures.

- [ ] **Step 3: Implement configuration, controller, and module wiring**

Preview remains callable when disabled; every execute method checks `adminLifecycle.enabled` before password verification or mutation.

- [ ] **Step 4: Verify backend lifecycle tests**

Run: `npm --prefix backend test -- --runInBand src/modules/admin-lifecycle src/modules/classes/classes.service.spec.ts src/modules/sections/sections.service.spec.ts`

Expected: PASS.

### Task 6: Contextual web lifecycle workflow

**Files:**

- Create: `next-frontend/src/types/admin-lifecycle.ts`
- Create: `next-frontend/src/services/admin-lifecycle-service.ts`
- Create: `next-frontend/src/services/admin-lifecycle-service.test.ts`
- Create: `next-frontend/src/components/admin/lifecycle/AdminLifecycleDialog.tsx`
- Create: `next-frontend/src/components/admin/lifecycle/AdminLifecycleDialog.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx`
- Modify: corresponding page tests under the same route directories

**Interfaces:**

- Consumes: concrete backend preview/execute envelopes.
- Produces: reusable `AdminLifecycleDialog` configured for student, class, section, or purge context.

- [ ] **Step 1: Write failing service-wrapper tests**

Assert exact URLs and request bodies for all operation pairs and operation lookup, including propagation of structured blocker and stale-manifest errors.

- [ ] **Step 2: Implement the typed service and pass its tests**

Run: `npm --prefix next-frontend test -- --runInBand src/services/admin-lifecycle-service.test.ts`

- [ ] **Step 3: Write failing dialog behavior tests**

Cover initial preview, intent selection, changed/preserved summaries, blocker-disabled execution, required confirmation/reason/password, stale refresh retaining inputs, feature-disabled execution, success operation ID, and recoverable failure.

- [ ] **Step 4: Implement the reusable dialog and pass its tests**

Use existing admin tokens and dialog primitives; do not introduce a competing visual system.

- [ ] **Step 5: Write failing route integration tests**

Verify ambiguous removal is replaced for admins, bulk `Promise.all` removal is removed, contextual archive opens the lifecycle dialog, purge stays separate, failed selections remain selected, and copy says teacher/adviser history is preserved.

- [ ] **Step 6: Integrate routes and pass focused frontend tests**

Run the new dialog/service tests plus the four affected admin route specs.

### Task 7: Plan synchronization, verification, and shipment

**Files:**

- Modify: `docs/architecture/admin-lifecycle-resolution-plan.md`
- Modify: `openspec/changes/governed-admin-lifecycle/tasks.md`

**Interfaces:**

- Produces: traceable plan-to-code status and exact-SHA release evidence.

- [ ] **Step 1: Synchronize documentation and complete OpenSpec tasks**

Run: `openspec validate governed-admin-lifecycle --strict`

Expected: valid, with every implemented task checked.

- [ ] **Step 2: Run mandatory backend gates**

Run: `npm --prefix backend run check:migrations`, `npm --prefix backend run lint`, `npm --prefix backend run build`, `npm --prefix backend test -- --runInBand`, and applicable academic/seed smokes against the configured stack.

Expected: all required checks pass; unavailable runtime prerequisites are explicit blockers, not silent skips.

- [ ] **Step 3: Run mandatory frontend gates**

Run: `npm --prefix next-frontend run lint`, `npm --prefix next-frontend run typecheck`, `npm --prefix next-frontend test -- --runInBand`, `npm --prefix next-frontend run build`, and an authenticated browser flow for preview plus one evidence-free correction on disposable seeded data.

Expected: all required checks pass with no task-caused warning increase.

- [ ] **Step 4: Review and commit scoped changes**

Run `git diff --check`, inspect every changed file and staged hunk, confirm no mobile/APK inputs changed, then commit with `feat(admin): add governed lifecycle resolution`.

- [ ] **Step 5: Push and observe exact revision**

Fetch and verify every outgoing commit, push `developement`, confirm zero divergence, track CI and Railway deployment for the exact SHA, confirm migration application and provider success, then enable `ADMIN_LIFECYCLE_ENABLED=true` and verify live health plus an admin-only preview. Any post-enable failure requires disabling execution before diagnosis.
