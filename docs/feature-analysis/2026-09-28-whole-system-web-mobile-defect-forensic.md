# Whole-System Web and Mobile Defect Forensic

Date: 2026-09-28
Repository state: `9fd10f6b` on `developement`, equal to `origin/developement` at audit time
Mode: full-forensic, analysis only
Scope: current backend contracts and durable jobs, Next.js web consumers, Expo mobile consumers, AI-service validation boundary, and Android release verification

## 1. Executive verdict

The inspected system is not broadly broken: backend, web, and mobile builds and static checks completed, and the full backend, web, and mobile test suites passed. The initial forensic pass found **four current defects supported by direct source and command evidence**. During the separately authorized release, exact-SHA Railway observation exposed a fifth operational defect. None are cosmetic findings or hypothetical refactors.

| ID | Severity | Status | Defect | Primary impact |
|---|---:|---|---|---|
| F-01 | High | Confirmed | Performance-diagnostics jobs are started with an in-process `setTimeout` instead of the repository's durable BullMQ path. | A backend restart can permanently strand a database job as `pending`; the web UI can poll it indefinitely. |
| F-02 | High data-integrity risk | Confirmed implementation defect; existing bad records unverified | Web Admin Calendar calls a nonexistent, unauthenticated academic-state path, while three mobile admin creation flows derive the school year from the device date instead of backend academic state. | Users can see or create records under the wrong official school year when the backend state differs from the device/calendar assumption. |
| F-03 | Medium | Confirmed | Several web and mobile reads convert request failure into truthful-looking empty data. | An authorization, network, or server failure is presented as “no records,” hiding the real problem from an admin. |
| F-04 | Low operational | Confirmed by reproduction | Android release verification ignores the valid Gradle `android/local.properties` SDK path. | The release gate fails on a correctly configured Android checkout unless an extra environment variable is exported. |
| F-05 | Medium operational | Confirmed by exact-SHA deployment failure | Railway's frontend upload includes every historical APK in `public/downloads/android`, producing a 219,397,737-byte upload that Cloudflare rejects with HTTP 413. | Backend and AI can deploy while the matching frontend and current APK fail to publish, leaving the release partially deployed. |

### Ownership and coupling

- F-01 is owned by backend performance/AI orchestration and consumed by the web teacher-performance page. It crosses persisted state, asynchronous execution, audit, and polling boundaries.
- F-02 is owned jointly by backend academic-state authority and web/mobile admin setup consumers. It crosses official academic state and persisted class, section, and school-event records.
- F-03 is owned by the affected presentation/query-state adapters. It does not require a backend contract change.
- F-04 is owned by the mobile release script and tests. It affects release operations, not the installed app runtime.
- F-05 is jointly owned by the frontend Railway upload scope and mobile release preparation. Git remains the artifact-history owner; the deploy context should contain only the current immutable APK and stable alias.

The whole system is not a removal candidate. Each defect is individually isolatable without replacing the public API. The recommended order is F-01, F-02, F-03, then F-04. No product code, configuration, schema, data, git history, or external system was changed during this audit.

### What was actually verified

| Surface | Current evidence |
|---|---|
| Backend | `npm test -- --runInBand --silent`: **178/178 suites and 1804/1804 tests passed**. Backend build, migration-integrity validation, and quiet lint also passed during this audit. Error logs in the test output came from deliberate negative-path tests; Jest exited `0`. |
| Web | Typecheck and lint passed; production build passed and generated 75 static pages; Jest passed **208/208 suites and 951/951 tests**. |
| Mobile | Typecheck and design audit passed; Jest passed **150/150 suites and 849/849 tests**; production Android Expo export passed with 1965 modules. Android release tests passed 16/16, iOS SideStore tests 7/7, and iOS TestFlight tests 6/6. |
| Release verifier | Plain `npm run release:verify` failed with “aapt was not found.” The same command passed when `ANDROID_SDK_ROOT=/home/jethro/Android/Sdk` was supplied, although `mobile/android/local.properties` already declares that exact path and both `aapt` and `apksigner` exist there. |
| Railway release observation | CI run `36427130885` passed all eight jobs for `65b1ab56e1e88a653840290b50801d1e8ea6f5e0`. Railway run `36427652729` checked out that exact SHA, but frontend upload failed with HTTP 413 at 219,397,737 bytes; the checkout held about 360 MB of historical/current APK copies. |
| AI service | Python source compilation passed. The Python test runner could not provide a valid suite result because the local interpreter lacks required packages including FastAPI, Pydantic, HTTPX, PyMuPDF, and SQLAlchemy. This is a coverage limitation, not proof of an AI product defect. |

Passing suites do not invalidate the findings: the inspected tests do not simulate the failure boundaries above.

## 2. Feature anatomy

The bounded feature for this forensic is **cross-client system integrity**: whether web and mobile use the backend's authoritative state and asynchronous contracts without turning infrastructure failures into incorrect business state.

### Flow A: teacher performance diagnostics

1. The web teacher-performance page creates a performance-analysis job.
2. The backend inserts a durable-looking `ai_generation_jobs` row with `status = pending`.
3. The backend schedules the actual work only through a process-local zero-delay timer.
4. The worker method updates the row to `processing`, creates an output, and marks it `completed`, or marks it `failed` after an exception.
5. The web polls the status endpoint every 10 seconds while the row remains `pending` or `processing`.

The persisted job row and the process-local trigger have different lifetimes. A process stop between steps 2 and 3 leaves a durable row with no durable execution message. The status endpoint has no stale-job reconciliation, and the client has no maximum pending duration.

### Flow B: official academic year

The backend exposes `GET /api/academic-state/current` behind JWT and Admin/Teacher role guards. Both web and mobile already have authenticated `academicStateService.getCurrent()` clients for that endpoint.

The affected screens bypass that authority:

- Web Admin Calendar calls raw `fetch('/api/academic-state/active')`. No such backend route exists, and raw fetch bypasses the shared API client's bearer-token bootstrap. The error is swallowed and the screen silently derives a year from the current date.
- Mobile Admin Calendar, Admin Classes, and Admin Sections initialize the year as `current device year`–`next device year` and do not fetch current academic state for the default.
- Mobile class creation always sends that guessed value. Backend class creation only falls back to the official year when the DTO omits `schoolYear`, so the backend fallback cannot protect this caller.
- Section and school-event creation accept and persist the supplied year. That can be valid for deliberate future-year planning, so the repair must preserve an explicit, labeled override rather than universally forcing the current year.

At the audit date, a device-derived `2026-2027` may happen to match the deployed academic state. That coincidence does not repair the authority defect, and this audit does not claim that corrupt records already exist.

### Flow C: rejected reads

Web Admin Calendar, web Admin Announcements, and mobile Admin Calendar all have a state collapse:

`request rejected` → `[]` or `undefined` → business empty-state copy / zero count

The affected UIs therefore cannot distinguish “the server says there are zero rows” from “the server did not answer successfully.” Mobile Admin Announcements already renders `feed.isError` through `AdminNotice`; it is a current in-repository example of the correct separation.

### Flow D: Android release verification

Gradle recognizes `mobile/android/local.properties` as the local Android SDK configuration. The release verifier recognizes only explicit function options and `AAPT_PATH` / `ANDROID_HOME` / `ANDROID_SDK_ROOT`. Consequently, Gradle can build with the local checkout configuration while the repository release gate fails before inspecting the APK.

### Flow E: frontend deployment artifact scope

The release repository intentionally retains immutable APK history, and the frontend also exposes a stable APK alias. Railway uploads the entire frontend context. Before F-05 was repaired, `.railwayignore` excluded caches and dependencies but not historical APK directories, so nine immutable APKs plus the stable alias entered the upload. The correct separation is to keep history in Git while allowing only the current immutable release directory and stable alias into the deploy archive.

## 3. Cascade map

This table is the relationship source of truth. “Direct” means an immediate caller/state effect; “transitive” means an effect through another component; “operational” means build, release, or runtime operations.

| Edge | Provider / owner | Interface or state | Consumer | Effect class and failure effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---:|---|---|---|
| E-01 | `PerformanceService` | `createPerformanceAnalysisJob()` inserts `aiGenerationJobs(status: pending)` | Performance status/result APIs | Direct persisted state is created before execution is durably scheduled. | High | Confirmed | `backend/src/modules/performance/performance.service.ts:1732-1771` | Keep the API and row; replace the execution trigger with a durable queue producer. |
| E-02 | `PerformanceService` | `setTimeout(...runPerformanceAnalysisJob..., 0)` | Node process event loop | Direct async trigger disappears if the process stops before the callback runs. | High | Confirmed | `backend/src/modules/performance/performance.service.ts:1773-1783` | Enqueue through backend-owned BullMQ with an idempotent job ID. |
| E-03 | `PerformanceService` | `runPerformanceAnalysisJob()` | `ai_generation_jobs` and `ai_generation_outputs` | Direct state transitions work only after E-02 fires; the method itself does not recover orphaned pending rows. | High | Confirmed | `backend/src/modules/performance/performance.service.ts:1661-1729` | Invoke from a processor; add stale pending/processing reconciliation. |
| E-04 | Performance status API | Pending/processing status | Web teacher-performance poller | Transitive: the web polls every 10 seconds until completed/failed; an orphan stays active without a deadline. | High | Confirmed | `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx:801-838`; `backend/src/modules/performance/performance.service.ts:1805-1837` | Add a server terminal/retry policy and a bounded client timeout/retry explanation. |
| E-05 | Backend academic-state controller | Authenticated `GET /academic-state/current` | Canonical web/mobile services | Direct authoritative contract already exists. | High | Confirmed | `backend/src/modules/academic-state/academic-state.controller.ts:16-20,48-61`; `next-frontend/src/services/academic-state-service.ts:43-49`; `mobile/src/api/services/academic-state.ts:43-49` | Reuse it; do not create a second “active” endpoint. |
| E-06 | Web Admin Calendar | Raw `GET /api/academic-state/active` | Calendar default/filter | Direct route mismatch; failure is swallowed. Raw fetch also bypasses shared bearer injection. | High | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.tsx:293-320`; bearer injection in `next-frontend/src/lib/api-client.ts:78-106` | Replace with canonical `academicStateService.getCurrent()` and explicit error state. |
| E-07 | Mobile admin screens | Device-date-derived year | Calendar, class creation, section creation | Direct authority drift; UI sends a guessed year as if official. | High | Confirmed | `mobile/src/screens/AdminCalendarScreen.tsx:39-41,101-112`; `mobile/src/screens/AdminClassesWorkspaceScreen.tsx:66-68,297-315`; `mobile/src/screens/AdminSectionsScreen.tsx:48-50,147-154,213-223` | Fetch current academic state for the initial value; label intentional planning-year overrides. |
| E-08 | Backend classes/sections | Supplied `schoolYear` | Persisted class/section state | Transitive: classes use official state only if the client omits a year; section creation persists the supplied year. | High | Confirmed | `backend/src/modules/classes/classes.service.ts:555-590,743-769`; `backend/src/modules/sections/sections.service.ts:959-986,1019-1046` | Preserve future planning where authorized, but validate and label active-vs-planning intent. Audit existing mismatches before any repair. |
| E-09 | Route-contract test | Scans only `.ts` in mobile API and web services/lib | CI contract protection | Operational blind spot: page-level `.tsx` raw fetches are outside the scan, so E-06 passes the contract test. | Medium | Confirmed | `backend/src/common/contracts/client-route-contract.spec.ts:23-29,129-170` | Expand scanning to relevant `.tsx` application code and native `fetch`, or ban raw backend fetches through lint. |
| E-10 | Web Admin Calendar | Catch → `setEvents([])` | Empty-state renderer | Direct: rejected read becomes “No entries yet.” | Medium | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.tsx:339-374,715-724` | Maintain distinct `loading`, `error`, `empty`, and `data` states; preserve last good data on refresh failure. |
| E-11 | Web Admin Announcements | Empty catch / catch → `setAnnouncements([])` | Counts and empty-state renderer | Direct: class or announcement read failure becomes zero classes/posts or “No announcements.” | Medium | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx:47-84,155-166` | Render a retryable load error and do not overwrite last good rows after a refresh failure. |
| E-12 | Mobile Admin Calendar | React Query error state is ignored | `0 scheduled records` and empty list | Direct: rejected read is presented as a zero count. | Medium | Confirmed | `mobile/src/screens/AdminCalendarScreen.tsx:27-32,136-157,239-243` | Branch on `events.isError`, show `AdminNotice`, and expose retry. |
| E-13 | Mobile release verifier | `resolveAapt()` / `resolveApksigner()` | `npm run release:verify` | Operational: ignores the SDK path already used by Gradle. | Low | Confirmed | `mobile/scripts/app-version-release.cjs:201-268`; `mobile/package.json:24` | Add `android/local.properties` fallback after explicit options/env and before failure. |
| E-14 | Android checkout | `android/local.properties` → `/home/jethro/Android/Sdk` | Gradle and installed build-tools | Operational: valid path contains `aapt` and `apksigner`, but E-13 does not read it. | Low | Confirmed | Reproduced: plain verifier exit `1`; same verifier with `ANDROID_SDK_ROOT` exit `0`; executables exist in build-tools 35.0.0 and 36.0.0. | Add resolver tests for Gradle properties, escaped paths, absent paths, and env precedence. |
| E-15 | Frontend deploy context | Historical immutable APK directories plus stable alias | Railway CLI upload | Operational: about 360 MB of APK content compressed to a 219,397,737-byte request and was rejected with HTTP 413. | Medium | Confirmed | GitHub Actions run `36427652729`, frontend job `108945482607`; `next-frontend/public/downloads/android` contained builds 47–55. | Ignore historical Android release directories in the deploy archive without deleting them from Git. |
| E-16 | Mobile release preparation | Current build/version/source revision | Frontend `.railwayignore` | Transitive: a static manual allowlist would become stale on the next build and reintroduce a missing immutable artifact or oversized archive. | Medium | Confirmed | Release metadata already owns `versionCode` and `sourceRevision`; `.railwayignore` previously had no managed release block. | Make `release:prepare` update the managed allowlist and make `release:verify` reject stale scope. |

### Consumer-search saturation

- A focused search for `performance_diagnostics`, `runPerformanceAnalysisJob`, and `createPerformanceAnalysisJob` found the database schema, performance service/controller/tests, and the web performance consumer, but no BullMQ producer or processor for this job type.
- An expanded literal-route AST scan compared 483 backend routes with 770 web/mobile request sites and identified one true unmatched literal request: `GET /api/academic-state/active` in web Admin Calendar. The repository contract test does not scan that location.
- Focused searches of web/mobile academic-state clients confirmed both platforms already own a canonical `getCurrent()` wrapper.
- Focused searches of affected screens and their tests found no rejected-read rendering assertion for the three E-10–E-12 consumers.

After the final focused searches, **no additional dependency was found within the inspected scope**. This is search saturation, not a guarantee that no other defect exists.

## 4. Isolation and disassembly plan

The plan below describes repair cuts only. It was not executed.

### Phase 1 — Lock failure behavior in tests

1. Add a backend integration test covering E-01–E-04: create the database row, interrupt before execution, restart the worker boundary, and prove the job becomes completed or explicitly failed rather than remaining pending.
2. Add web/mobile tests for E-06–E-12 using rejected `401`, `500`, and network requests. Assert that error copy and retry are rendered and that empty-state copy is not rendered.
3. Extend the contract gate around E-09 so the current raw `/api/academic-state/active` request fails before repairing the caller.
4. Add release resolver tests around E-13–E-14 with environment precedence and a temporary `local.properties` fixture.

Validation: the new tests must fail against the current implementation for the named reason.
Rollback: remove only the new tests if their harness is invalid; do not reinterpret a correctly failing regression test as a reason to retain current behavior.

### Phase 2 — Make performance execution durable

1. Keep the current public create/status/result response shapes from E-01 and E-04.
2. Replace E-02 with an existing backend-owned BullMQ queue/processor pattern. Use the database job ID as an idempotency key.
3. Make the processor claim only a valid nonterminal row and keep terminal writes idempotent, preserving the safety check already visible in E-03.
4. Add reconciliation for pre-existing stale `pending`/`processing` performance-diagnostics rows: requeue when safe or mark failed with a public-safe error and audit evidence.
5. Give E-04 a bounded user-visible waiting policy so even infrastructure failure cannot create endless “analyzing.”

Compatibility: no mobile contract is affected; the web API shape can remain unchanged.
Cleanup: reconcile existing stranded rows; do not delete their audit history.
Validation: create a job, restart backend/worker between persistence and execution, then prove one output and one terminal transition. Also test duplicate delivery.
Rollback: disable the new producer, drain/pause the new queue, and route unresolved IDs through the reconciler; never restore the timer while queued messages remain live.

### Phase 3 — Restore academic-state authority

1. Replace E-06 with the canonical authenticated service from E-05.
2. Initialize the E-07 forms from E-05. Show the loaded official year before enabling creation.
3. Decide and document which admin flows allow future-year planning. Where allowed, retain an explicit override labeled “planning year”; where not allowed, omit `schoolYear` so the backend applies its authoritative default.
4. Validate E-08 on writes: make active-year intent and future-planning intent distinguishable rather than accepting an accidental device default.
5. Run a read-only data audit for classes, sections, and school events whose years do not match their intended academic state. Do not bulk-edit or delete historical records from an inference.

Compatibility: existing API fields can remain; old clients continue to send a year. Stronger server validation must return actionable conflict text rather than silently rewriting records.
Validation: freeze the device/browser date to a year different from backend state and prove all three mobile forms plus web Calendar initially show the backend year. Verify deliberate future planning separately.
Rollback: revert client defaulting independently if needed; keep the backend data audit read-only until a separately approved repair plan exists.

### Phase 4 — Separate error, empty, loading, and data states

1. Repair E-10–E-12 using the established mobile `AdminNotice`/React Query error approach and the corresponding web admin error-state pattern.
2. Preserve last good data during a background refresh failure and show that it may be stale.
3. Offer an explicit retry action; do not make “create first record” the action after a rejected read.

Compatibility: presentation-only; no backend change is required.
Validation: cover initial failure, refresh failure with cached data, successful empty response, successful nonempty response, and retry recovery.
Rollback: components can revert independently without changing persisted data or contracts.

### Phase 5 — Close operational gates

1. Expand E-09 to cover relevant `.tsx` request sites and native `fetch`, or enforce all backend requests through typed services.
2. For E-13, resolve tools in this order: explicit option, explicit environment, Gradle `local.properties`, then documented failure. Parse escaped Windows paths as well as POSIX paths.
3. Keep environment variables authoritative so CI behavior does not change unexpectedly.
4. Scope the Railway frontend archive to the current immutable APK plus stable alias, and make release preparation/verification own that allowlist so it advances with every build.

Validation: the contract test must catch the current bad route fixture; plain `npm run release:verify` must pass with only the valid checkout `local.properties`; invalid/missing SDK paths must still fail clearly; Git-ignore semantics must exclude a prior immutable APK and include the current immutable APK plus stable alias.
Rollback: retain env-only resolution behind a small resolver seam if a platform-specific parser regression appears.

## 5. Improvements

### Required decoupling

1. **Durable execution seam:** database job creation must enqueue a durable message, never depend on a process-local callback for completion.
2. **Academic-state seam:** screens should consume one typed current-state provider; device time is only a display/calendar concern, not academic authority.
3. **Query-state seam:** business empty states must require a successful response. Errors need their own state and retry path.
4. **Contract-coverage seam:** route validation must inspect the places requests can actually be made, including page-level TSX/native fetch, or structurally prevent those calls.
5. **Android SDK discovery seam:** release tooling should share the checkout's standard Gradle SDK resolution with deterministic precedence.
6. **Deployment artifact seam:** immutable release history stays in Git, while release tooling advances a single current-build allowlist for the Railway frontend context.

### Optional evidence-backed enhancements

1. Add metrics for age/count of `pending` and `processing` jobs by `jobType`, with an alert threshold for stranded performance diagnostics.
2. Add a small shared web/mobile academic-year field model containing `officialYear`, `selectedYear`, and `selectionIntent` so a future-planning override cannot masquerade as the current state.
3. Add reusable “query failed / retry / showing cached data” admin components to reduce future E-10–E-12 drift.
4. Add the AI-service dependency bootstrap/test command to the standard validation workflow so Python behavior is not reduced to syntax validation on an under-provisioned host.

## 6. Uncertainty and coverage boundary

- Only PostgreSQL and Redis were running in the local Compose state. Backend, web, mobile, and AI runtime flows were not exercised through authenticated live sessions. Source, tests, builds, exports, and read-only commands provide the evidence above.
- No physical Android or iOS device was attached. Touch behavior, OS permissions, backgrounding, deep links, notifications, and real-device rendering remain unverified.
- The current production academic-state value and existing production rows were not queried. F-02 confirms incorrect authority sourcing; it does not assert that deployed records are already misfiled.
- AI-provider, Expo push-provider, and object-storage behavior were not invoked. Railway was observed only through the authorized exact-SHA release; its frontend upload failure is captured as F-05. The initial local Python environment lacked AI-service packages, while exact-SHA CI later passed the provisioned AI-service suite.
- The expanded route scan covered statically discoverable TypeScript/TSX request literals. Dynamically constructed paths, runtime plugin behavior, and external consumers may require separate runtime instrumentation.
- This report is a bounded full-forensic pass over cross-client contracts and high-risk state/async boundaries, not proof that the repository contains no other defects.
