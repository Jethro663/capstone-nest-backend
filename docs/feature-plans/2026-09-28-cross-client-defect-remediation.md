# Cross-Client Defect Remediation Implementation Plan

> **For agentic workers:** Execute inline in the current checkout through the authorized `finish-and-ship` workflow. Use test-driven development for every behavior change and preserve unrelated work.

**Goal:** Repair the four confirmed defects in the 2026-09-28 forensic report without changing public response envelopes, erasing academic history, or replacing established web/mobile procedures.

**Architecture:** Use the existing `performance-recompute` BullMQ queue for a new, explicitly typed performance-analysis job and a dedicated producer/reconciler service. Keep backend academic state authoritative through the existing authenticated `/academic-state/current` clients, retain deliberate planning-year input, and model load failures separately from successful empty data. Extend existing contract/release gates so these regressions cannot silently return.

**Tech stack:** NestJS 11, BullMQ, Drizzle/PostgreSQL, Next.js 16/React 19, Expo 54/React Native 0.81, TanStack Query, Jest, Node.js release tooling.

**Execution status:** Authorized for implementation, mobile packaging when required, commit, push to the current `developement` upstream, configured CI/deployment observation, and final before/after handoff.

## 1. Decision summary and feature brief

Implement all four findings from `docs/feature-analysis/2026-09-28-whole-system-web-mobile-defect-forensic.md`:

1. F-01: make performance diagnostics durable across backend interruption.
2. F-02: make backend academic state the initial source for web Calendar and mobile Calendar/Class/Section creation.
3. F-03: distinguish rejected reads from successful empty results on the affected web/mobile admin surfaces.
4. F-04: let Android release verification discover the standard Gradle `android/local.properties` SDK path.

### Selected decisions

- Reuse the existing `performance-recompute` queue but add a separate `PerformanceAnalysisQueueService`. This avoids another Redis queue while keeping diagnostic-specific reconciliation out of fire-and-forget recompute logic.
- Preserve `POST`/`GET` HTTP response shapes for performance diagnostics and academic state. The only new contract is an internal BullMQ payload.
- Keep school-year fields editable where future planning already exists. Their initial value comes from backend academic state; no device-year value is presented as official.
- A successful empty response alone may render business empty-state copy. A rejected request renders an error and retry path while retaining last known rows where possible.
- Read Android SDK discovery in deterministic order: explicit function option, explicit environment, `android/local.properties`, then clear failure.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend performance queue producer, processor dispatch, bootstrap reconciliation, module wiring, and regression tests.
- A bounded web analysis timeout/error path for a job that never reaches a terminal state.
- Web Admin Calendar academic-state initialization and event-read error states.
- Web Admin Announcements class/announcement read error states.
- Mobile Admin Calendar, Classes, and Sections official-year initialization plus Calendar read error state.
- Route-contract test coverage for page-level TypeScript/TSX request sites and native `fetch`.
- Android SDK discovery and release-script tests.
- Required builds, tests, APK packaging because mobile bundle inputs change, commit/push, CI/deployment and delivered-artifact verification.

### Non-goals

- No schema or migration change.
- No bulk correction or deletion of existing classes, sections, events, jobs, or audit records.
- No visual redesign, navigation reorganization, or unrelated refactor.
- No direct mobile or web call to `ai-service`.
- No change to the `success/message/data` envelope.
- No claim of physical-device acceptance without an attached device and executed checks.

### Permissions and assumptions

- The user's current request separately authorizes implementation and shipping after this plan, satisfying the planning-only boundary of `feature-impact-planner`.
- Existing future-year planning remains allowed because current section/event contracts accept explicit years; the repair changes the default/source label, not that capability.
- The existing Android version/release scripts remain the version authority. Do not hard-code a historical build number.

## 3. Current-state evidence ledger

| Evidence | Status | Consequence |
|---|---|---|
| `PerformanceService.createPerformanceAnalysisJob()` inserts a pending database row and starts work with `setTimeout` (`performance.service.ts:1732-1783`). | Confirmed | Persistent job and execution trigger have different lifetimes. |
| The existing performance BullMQ queue and processor are registered in `performance.module.ts` and already run under the system-reset barrier. | Confirmed | A durable in-module execution seam exists and should be extended. |
| The status endpoint keeps pending/processing jobs nonterminal; web polls every 10 seconds (`teacher/performance/page.tsx:801-838`). | Confirmed | A stranded row can keep the UI waiting indefinitely. |
| Backend owns authenticated `GET /academic-state/current`; both web and mobile have typed/authenticated `getCurrent()` wrappers. | Confirmed | No new public endpoint is needed. |
| Web Admin Calendar calls raw nonexistent `/api/academic-state/active`, swallows failure, and falls back to device year. | Confirmed | Route/auth drift is current. |
| Mobile Calendar, Classes, and Sections initialize school year from device time and send it on writes. | Confirmed | Backend fallback cannot protect these callers. |
| Web Calendar and Announcements, plus mobile Calendar, collapse rejected reads into zero/empty UI. | Confirmed | Admins cannot distinguish outage/auth failure from no data. |
| Contract test scans only `.ts` under API/service/lib roots, not app/screen TSX or native fetch. | Confirmed | The wrong web route is not guarded by CI. |
| Plain `npm run release:verify` fails while `android/local.properties` points to an installed SDK containing `aapt` and `apksigner`; setting `ANDROID_SDK_ROOT` makes the same verification pass. | Confirmed | Release tooling diverges from Gradle checkout configuration. |
| Existing production rows match their intended academic year. | Unverified | Only a read-only audit could establish this; do not mutate data in this change. |
| Physical Android/iOS flows and live authenticated web pages pass after the change. | Unverified until execution | Report device/browser limits honestly in handoff. |

## 4. End-to-end impact and consumer map

| Producer | Contract/state | Consumers | Planned impact |
|---|---|---|---|
| Performance controller/service | Existing create/status/result HTTP envelope | Web teacher performance page | HTTP-compatible; create now durably enqueues, status can expose terminal failure, web wait is bounded. |
| New performance-analysis queue producer | Internal job `{ jobId, classId, teacherId, studentId?, note? }` | Existing performance queue processor | New internal dispatch branch; deterministic BullMQ `jobId`; bootstrap requeues nonterminal DB rows. |
| `PerformanceService` runner | DB job/output rows | Queue processor, status/result endpoints | Make processor-callable, idempotently skip terminal/output-complete work, preserve public-safe error. |
| Backend academic-state current route | Existing authenticated response | Web Calendar; mobile Calendar, Classes, Sections | New consumers only; no backend response change. |
| Web Calendar/Announcements query state | Local React state | Admin page UI | Add load error, retry, and last-good-data behavior. |
| Mobile academic-state/query state | TanStack Query | Three admin forms and Calendar list | Official default, explicit error notice/retry, no device-year authority. |
| Backend route-contract test | Static route inventory | CI | Add relevant TSX roots and native `fetch` recognition; no runtime effect. |
| Release tool resolver | SDK path discovery | `release:verify`, local/CI release operations | Local Gradle path fallback with explicit env precedence. |

## 5. Conflicts, invariants, risks, and design options

### Invariants

- Backend remains the public auth/RBAC and official academic-state authority.
- Long-running analysis work is restart-safe through backend-owned BullMQ.
- Web/mobile continue consuming backend `/api` contracts.
- Official records are not rewritten by AI diagnostics.
- Existing academic/audit history is preserved.
- Core Compose and system-reset barriers remain intact.

### Options considered

#### Option A — Existing performance queue plus dedicated diagnostic producer (selected)

Add a focused producer/reconciler to the already registered performance queue and dispatch a new job name in the existing processor.

- Benefits: smallest Redis/Module footprint; reuses reset fencing; internal contract only; clear ownership.
- Risks: the queue name includes “recompute,” so job-name typing and processor branches must stay explicit.

#### Option B — Put diagnostics on the general AI-generation queue

- Benefits: mature retries and existing AI job patterns.
- Risks: performance diagnostics are currently built from backend evidence without an AI-service request; mixing them into the AI queue blurs ownership and adds coupling to an unrelated processor.

#### Option C — Retain the timer and add a database sweeper

- Benefits: few immediate code changes.
- Risks: still has two sources of execution and duplicate/race hazards; violates the durable orchestration invariant. Rejected.

### Main implementation risks

- Duplicate queue delivery could create duplicate outputs. Mitigate with deterministic BullMQ IDs and an output-exists/terminal-state guard before computation.
- Queue unavailability after row insertion could strand a row. Mark that row failed with the public-safe message and return a service-unavailable response; bootstrap reconciliation covers interrupted nonterminal rows.
- Automatically overwriting an admin's chosen planning year when academic state refreshes could corrupt intent. Initialize only when the field is blank or reset from an existing record.
- Extending route scanning too broadly could flag test fixtures or non-backend URLs. Restrict to backend-looking absolute paths and exclude tests/generated output.
- Local properties can contain escaped Windows separators. Parse Gradle property escaping and preserve explicit environment precedence.

## 6. Recommended architecture, data flow, security, and error behavior

### Durable performance flow

1. Validate class/student access exactly as today.
2. Insert the pending database job.
3. Call `PerformanceAnalysisQueueService.enqueue()` with deterministic queue ID `performance-analysis-<dbJobId>` inside `runSystemResetWork`.
4. If enqueue fails, update the database job to `failed` with `PERFORMANCE_ANALYSIS_PUBLIC_ERROR` and throw `ServiceUnavailableException`.
5. Processor dispatches `performance-analysis` to a public/internal `PerformanceService.processPerformanceAnalysisJob()` method.
6. The method exits for terminal jobs; if a completed output already exists, it repairs job status to completed and exits; otherwise it transitions processing → output → completed. Exceptions retain private logs and public-safe stored errors.
7. On application bootstrap, the producer queries only nonterminal `performance_diagnostics` rows and re-enqueues their stored source filters. Deterministic queue IDs make the reconciliation idempotent against an existing Redis job.
8. The web limits pending/processing polling to a documented duration and tells the user to retry instead of waiting forever.

### Academic-state flow

- Web Calendar loads current academic state through `academicStateService.getCurrent()` and classes through their existing service. It does not infer an official year from the clock.
- Mobile screens use one small `useCurrentAcademicState` hook/query-key convention. When current state arrives, blank creation forms receive the official year. Editing an existing record always retains that record's year.
- If academic state cannot load, the UI renders an explicit notice and retry. Writes requiring a year remain disabled until a valid year is present; the user may deliberately enter a planning year where the existing field is editable.

### Read errors

- Initial rejection: show error + retry; do not show successful-empty copy.
- Refresh rejection with prior rows: keep rows, show that refresh failed.
- Successful empty response: show existing empty-state copy.
- Mutations retain their current user-facing save/delete errors.

### Security

- No guard/role change.
- Replacing raw fetch with the canonical API client restores bearer bootstrap/refresh behavior.
- Queue payload contains only IDs and the existing teacher note already stored in `sourceFilters`; it stays inside backend Redis.

## 7. Contract, schema, migration, and compatibility changes

- **HTTP contracts:** unchanged.
- **Database schema/migrations:** unchanged.
- **Internal queue contract:** add job name `performance-analysis` and payload fields `jobId`, `classId`, `teacherId`, optional `studentId`, optional `note`.
- **Web/mobile types:** reuse existing `AcademicStateCurrent`; no duplicate shape.
- **Backward compatibility:** older clients continue sending explicit school years. The backend does not silently rewrite them in this change.
- **Operational compatibility:** `AAPT_PATH`, `APKSIGNER_PATH`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` remain higher precedence than `local.properties`.

## 8. Ordered implementation phases with exact owners

### Task 1 — Durable performance-analysis queue

**Files:**

- Create `backend/src/modules/performance/performance-analysis-queue.service.ts`
- Create `backend/src/modules/performance/performance-analysis-queue.service.spec.ts`
- Modify `backend/src/modules/performance/performance-recompute.processor.ts`
- Modify `backend/src/modules/performance/performance-recompute.processor.spec.ts`
- Modify `backend/src/modules/performance/performance.service.ts`
- Modify `backend/src/modules/performance/performance.service.spec.ts`
- Modify `backend/src/modules/performance/performance.module.ts`

**TDD steps:**

- [ ] Write producer tests for deterministic enqueue, reset barrier, bootstrap reconciliation, and propagated enqueue failure.
- [ ] Run the new producer spec and confirm it fails because the service does not exist.
- [ ] Implement the producer/reconciler and module wiring.
- [ ] Write processor dispatch and service create-failure/idempotency tests; run them red.
- [ ] Replace the timer with enqueue, expose the runner to the processor, and add output-exists repair.
- [ ] Run focused performance specs green.

### Task 2 — Bound the web performance wait

**Files:**

- Modify `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`
- Modify or create its focused Jest test under the same route directory.

**TDD steps:**

- [ ] Add a fake-timer test proving a nonterminal job stops polling and renders a retryable timeout after the chosen bound.
- [ ] Run it red against the current infinite interval.
- [ ] Implement the bounded polling state without changing create/status/result service contracts.
- [ ] Run the focused page test green.

### Task 3 — Web academic-state and rejected-read truthfulness

**Files:**

- Modify `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.tsx`
- Create `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.test.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.test.tsx`

**TDD steps:**

- [ ] Test Calendar uses `academicStateService.getCurrent()`, does not call raw `/active`, and shows retryable errors without “No entries yet.”
- [ ] Test Announcements distinguishes class-load and feed-load errors from true empty responses and retains last good announcements on refresh failure.
- [ ] Run the focused tests red.
- [ ] Implement canonical academic-state loading plus explicit query errors/retries.
- [ ] Run focused tests green.

### Task 4 — Mobile official-year defaults and Calendar errors

**Files:**

- Create `mobile/src/hooks/useCurrentAcademicState.ts`
- Create `mobile/src/hooks/__tests__/useCurrentAcademicState.test.tsx` if hook behavior needs isolated coverage
- Modify `mobile/src/screens/AdminCalendarScreen.tsx`
- Modify `mobile/src/screens/AdminClassesWorkspaceScreen.tsx`
- Modify `mobile/src/screens/AdminSectionsScreen.tsx`
- Modify `mobile/src/screens/__tests__/admin-school-setup-contract.test.ts`
- Add focused screen behavior tests where the contract test cannot prove runtime state.

**TDD steps:**

- [ ] Add tests proving device year is not the default source and official backend year populates blank creation fields.
- [ ] Add Calendar rejected-read test proving an error notice/retry appears instead of a zero-record claim.
- [ ] Run them red.
- [ ] Implement the shared query hook and screen initialization/reset behavior without overwriting edited records.
- [ ] Run focused tests green.

### Task 5 — Expand client-route contract protection

**Files:**

- Modify `backend/src/common/contracts/client-route-contract.spec.ts`

**TDD steps:**

- [ ] Add a fixture/assertion demonstrating that a backend-looking native `fetch` in TSX is inventoried.
- [ ] Run the contract spec red against current scanning.
- [ ] Extend source discovery to relevant app/screen TSX and recognize native fetch while excluding tests.
- [ ] Run the contract spec green and confirm no unmatched current route remains.

### Task 6 — Gradle SDK discovery for release verification

**Files:**

- Modify `mobile/scripts/app-version-release.cjs`
- Modify `mobile/scripts/app-version-release.test.cjs`

**TDD steps:**

- [ ] Add tests for POSIX `sdk.dir`, escaped Windows path parsing, environment precedence, and missing/invalid properties.
- [ ] Run release-script tests red because `local.properties` is ignored.
- [ ] Implement a shared SDK-root resolver used by both `resolveAapt()` and `resolveApksigner()`.
- [ ] Run release-script tests and plain `npm run release:verify` green without SDK environment variables.

### Task 7 — Verification, packaging, and release

- [ ] Run focused tests after each task, then backend lint/build/full tests, web typecheck/lint/build/full tests, and mobile typecheck/design audit/full tests.
- [ ] Run backend migration-integrity/build entrypoint checks and the expanded route-contract gate.
- [ ] Run mobile release tests and plain `release:verify`.
- [ ] Because mobile source changed, use the existing release preparation/build flow, verify APK package/version/ABI/signature/alignment/API URL/checksum, and update the established download artifact/manifest.
- [ ] Review final diff against F-01–F-04 and this plan; run `git diff --check`.
- [ ] Stage only task-owned files, including the new forensic/plan artifacts; preserve the pre-existing user modification to `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` unless explicitly included by the user.
- [ ] Fetch, inspect divergence/outgoing history, commit, push `developement`, and verify remote SHA.
- [ ] Observe exact-SHA GitHub CI and Railway deployments; verify live health and delivered APK/manifest bytes/checksum when applicable.

## 9. Verification matrix and acceptance criteria

| Requirement | Focused proof | Broad proof | Acceptance |
|---|---|---|---|
| Performance job survives process interruption | Producer/reconciliation/processor Jest specs | Backend build + 178-suite baseline or higher | No `setTimeout` execution path; deterministic durable enqueue; nonterminal DB rows re-enqueued; duplicate delivery does not duplicate output. |
| Web polling is finite | Fake-timer page test | Web full suite/build | Nonterminal job reaches explicit retryable timeout; interval is cleared. |
| Web Calendar uses official state | Admin Calendar Jest test + route contract | Web full suite/build | Canonical authenticated service called; no `/academic-state/active`; state errors are visible. |
| Mobile forms use official state | Hook/screen/contract tests | Mobile typecheck/full suite/export | Device year is not authority; backend year initializes blank forms; existing edit years remain unchanged. |
| Failed reads are not empty business data | Web Calendar/Announcements and mobile Calendar tests | Web/mobile full suites | Error/retry displayed; successful empty response still renders empty copy; last good rows preserved on refresh failure. |
| Route drift is guarded | `client-route-contract.spec.ts` | Backend full suite | App/screen native fetch sites are scanned and current unmatched routes are zero. |
| Release verifier uses Gradle SDK config | Release-script unit tests + plain `release:verify` | APK release verification | No SDK env required when valid `local.properties` exists; explicit env still wins. |
| Ship is attributable | Git/CI/Railway/artifact evidence | Live health/download verification | Remote and deployed/tested revisions match final SHA; manifest and served APK match packaged checksum. |

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

- Ship one reviewed code/version commit plus a generated-artifact commit when required so the APK manifest can name the exact source revision it was built from; push them together as one release unit.
- Deploy through the existing push-triggered workflows only after all affected local gates pass.
- Publish a new Android artifact because mobile JavaScript changes; do not reuse an APK built from earlier inputs.

### Rollback

- If the queue path fails in deployment, pause new diagnostic requests at the API boundary and reconcile nonterminal rows before rolling code back. Do not restore the process-local timer while durable queue jobs remain.
- Web and mobile presentation changes can be reverted independently without data migration.
- Release resolver can fall back to env-only behavior by reverting the local-properties resolver; existing CI env behavior remains unchanged.
- Never delete diagnostic job/audit rows or academic records as rollback.

### Observability and cleanup

- Log diagnostic enqueue/reconciliation counts and queue failures without teacher-note content.
- After deployment, inspect pending/processing `performance_diagnostics` age if safe read access is available.
- Keep failed queue jobs under the existing bounded retention policy.
- Do not modify existing year-mismatched data without a separate previewed repair authorization.

### Unverified boundaries

- Production data alignment remains unverified unless a read-only audit is available.
- Physical Android/iOS behavior remains unverified without devices.
- AI-service full tests remain dependent on a correctly provisioned Python environment; this change does not touch AI-service code.
- Provider behavior and deployed runtime are not complete until exact-SHA CI/Railway and health/artifact checks finish.

## Self-review record

- All four forensic findings map to a task and acceptance row.
- Public HTTP contracts, schema, auth, academic history, and future-planning compatibility are explicitly preserved.
- Failure paths include queue unavailability, restart reconciliation, duplicate delivery, rejected reads, and SDK discovery precedence.
- No placeholder, unrelated redesign, schema migration, or data mutation is included.
