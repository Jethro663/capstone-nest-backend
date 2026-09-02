# Web-to-Mobile Contract and Functional Parity Audit

**Audit date:** 2026-09-02

**Repository snapshot:** `developement` at `e755b4b8`, including the existing uncommitted working-tree changes listed in the audit notes below

**Scope:** Backend-owned contracts, Next.js web consumers, and Expo mobile consumers

**Mode:** Analysis and solution planning only. No application code, schema, migration, configuration, or test code was changed.

## Executive conclusion

Mobile is not uniformly broken. Its core session bootstrap, class access, lesson/module reading, most teacher class and content mutations, academic lifecycle controls, notification listing, and LXP intervention endpoints are connected to real backend routes.

The audit did, however, confirm several cases where mobile cannot behave like web even when the backend is healthy:

- The student/teacher evaluation inbox calls two backend routes that do not exist, substitutes sample records after failures, and reports failed submissions as successful.
- Teacher evaluation analytics consumes an obsolete response shape, so real backend results render as zero or empty data.
- The student assessment taker ignores the backend's randomized question order and per-question deadline state.
- Mobile grading cannot submit rubric scores or manually scored question results, and its result model omits feedback-release and rubric data.
- The AI draft screen collects complete assessment settings, but its API adapter discards them and sends hard-coded defaults.
- Several list consumers silently stop at the backend's first 20 results.
- The admin mobile workspace is mostly a placeholder and does not provide the basic administrative functions available on web.

The highest-risk issue is false success: evaluation failures are hidden from users and appear to create durable submissions when they do not. The highest-risk academic issue is the assessment taker's missing server timing/order semantics.

## How to read this report

Status labels:

- **Broken** — a current mobile flow is wired to a nonexistent or incompatible contract.
- **Incorrect** — the route exists, but mobile ignores or misrepresents authoritative server state.
- **Incomplete** — the main route works, but important web-supported contract fields or actions are missing.
- **Missing** — the web capability has no mobile consumer or usable screen.
- **Aligned** — the inspected mobile path uses the same backend contract and supports its essential behavior.
- **Not runtime verified** — source behavior is known, but a real authenticated device/provider round trip was not completed in this audit.

Priorities:

- **P0:** can falsely claim a write succeeded, corrupt user trust, or violate assessment rules.
- **P1:** core role workflow cannot complete correctly or loses material data.
- **P2:** important parity, completeness, or auditability gap with a workaround.
- **P3:** quality-of-life or long-tail parity debt.

## Audit method and limits

The audit used the backend as the contract authority and compared it with both client implementations. It included:

1. A literal HTTP verb/path inventory across all mobile service files against Nest controller routes.
2. Focused request and response shape comparison for auth/profile, classes, sections, content, assessments, AI drafts, evaluations, academic lifecycle, reports, files, notifications, JA, and LXP.
3. Navigation and screen reachability comparison against the web role routes.
4. Consumer checks to distinguish a missing type field from a field that actually affects rendered behavior.
5. Existing mobile verification: `npm run typecheck` passed; `npm run test -- --runInBand` passed 44 suites and 238 tests.

The endpoint sweep found **249 unique mobile literal verb/path calls** and **430 backend routes**. Apart from variable query-string/upload-path normalization, the only literal mobile routes with no backend controller match were the two evaluation routes documented in F-01. That is useful evidence that the dominant problem is not widespread wrong URLs; it is stale response models, dropped fields, hidden errors, missing pagination, and absent mobile capabilities.

The green mobile unit suite does not contradict these findings. No mobile test/spec currently references `evaluationsApi`, `TeacherEvaluationSummaryResponse`, `questionOrder`, or `currentQuestionDeadlineAt`. The AI draft screen test verifies that the screen passes `assessmentSettings` to a mocked `aiApi`, but does not verify the real adapter's outbound HTTP body. The failures are therefore outside the assertions that passed.

This was a static/source audit, not a production-device certification. It did not mutate production or local data and did not execute authenticated flows against a disposable stack. The in-progress OpenSpec change `mobile-assessment-authoring-parity` still leaves its runtime integration gate (task 4.2) open; live AI provider/worker generation and extraction remain specifically unverified.

The working tree already contained unrelated/uncommitted auth, roster-import, academic integration-test, and OpenSpec evidence changes. They were treated as part of the current observable snapshot but were not modified by this audit. Any implementation should first decide whether those changes are intended and stable.

## Major-module parity matrix

| Area | Web baseline | Mobile status | Result |
|---|---|---|---|
| Authentication and session | Login, refresh, logout, verification, reset, initial password, forced profile completion, password change | Core auth routes exist; no forced complete-profile gate; password change explicitly unavailable | **Incomplete** |
| Student dashboard and classes | Class, upcoming activity, module/lesson navigation | Core class/content routes exist | **Mostly aligned** |
| Student lessons and modules | Read content, completion, visibility, protected files | Essential read/completion paths exist | **Mostly aligned** |
| Student assessments | List/detail/start/resume/submit/history/result with randomized and timed behavior | Core routes exist; question order and per-question deadline are ignored; first-page listing only | **Incorrect** |
| Student evaluations | Teacher evaluation and assigned system-evaluation dashboards/submission | Uses nonexistent routes and fake fallback/success; system evaluations absent | **Broken** |
| Student LXP/remedial | Playlist, generated lesson, guided assessment, progress | Playlist and guided assessment exist; generated lesson detail is absent | **Incomplete** |
| JA assistant | Hub, practice, Ask, Review, paginated history/thread | Core practice/Ask/Review routes exist; activity history and thread pagination are absent | **Incomplete** |
| Notifications | List, unread count, read one, read all | Everything except read-all exists | **Mostly aligned** |
| Teacher classes/sections/roster | Lists, details, enrollment and student views | Essential routes/screens exist | **Mostly aligned** |
| Teacher lessons/modules | Authoring, ordering, versions, section/grading configuration, release operations | Main CRUD/editor exists; versioning, bulk actions, section update, grading-scale replacement, and some release actions are absent | **Incomplete** |
| Teacher announcements | Cross-class feed plus create/edit/delete/schedule/pin | Per-class composer exists, but main Announcements tab opens notifications; lists stop at 20 | **Incorrect** |
| Teacher assessment authoring | Atomic editor, attachments, settings, question types, explicit publish | Most editor behavior exists; runtime gate remains open | **Mostly aligned / not fully runtime verified** |
| Teacher AI draft | Readiness, sources, complete settings, job lifecycle, review/apply | Job lifecycle exists; creation adapter drops complete settings | **Incorrect** |
| Teacher grading/results | Per-attempt review, manual response scores, rubric scoring, feedback state, bulk return, analytics | Direct score/feedback only; result contract is incomplete; bulk/analytics absent | **Incomplete** |
| Teacher performance/interventions | Overview, case detail, assign/activate/resolve, generated artifacts | Major routes/screens exist | **Mostly aligned** |
| Teacher evaluations | Assigned system evaluations and real aggregate insight shape | Inbox uses fake contract; aggregate screen uses obsolete fields; assigned system evaluation absent | **Broken** |
| Teacher reports | Typed reports plus server CSV export and audit event | Five reports load; local flattened CSV bypasses server export/audit; student master list absent | **Incomplete** |
| Teacher library | Files, folders, paging, storage, indexing actions | Basic file CRUD exists; first page only; folders/storage/retry-index absent | **Incomplete** |
| Admin | Dashboard, users, classes, sections, templates, reports, evaluations, audit, diagnostics, roster import, settings, announcements, calendar, library, academic records | Academic lifecycle/recovery is substantial and archive browsing is read-only; most other tabs are placeholders or notifications | **Mostly missing** |

## Confirmed contract failures and incorrect behavior

### F-01 — P0: Evaluation reads and writes are fabricated after HTTP failure

**Status:** Broken; data-integrity and trust failure.

**Evidence**

- `mobile/src/api/services/evaluations.ts:30-57` requests `GET /evaluations/my-inbox`; no backend `evaluations` controller owns that route. On any error it returns two hard-coded sample evaluations.
- `mobile/src/api/services/evaluations.ts:68-75` records the evaluation ID in an in-memory set before calling `POST /evaluations/submit`; on any error it returns `{ success: true }`.
- The backend's real student-teacher evaluation routes are `GET /lxp/me/teacher-evaluations` and `POST /lxp/me/teacher-evaluations` in `backend/src/modules/lxp/lxp.controller.ts:173-191`.
- The real submission request is class/period/type based with `ratings: Record<string, number>`; web uses it in `next-frontend/src/services/lxp-service.ts:238-253`.
- Both `StudentEvaluationsScreen` and `TeacherEvaluationsScreen` consume the broken `evaluationsApi` inbox/submission abstraction.

**User impact**

- A network, authorization, validation, or missing-route error becomes demo data.
- A failed submission is shown as successful and only survives in process memory.
- Reopening the app loses the fabricated submitted state.
- Payload fields do not identify the real class, grading period, or evaluation definition expected by the backend.

**Required contract fix**

- Delete the synthetic transport behavior from the production path.
- Replace the inbox model with the backend-owned teacher-evaluation dashboard contract.
- Submit the exact class/period/evaluationType/ratings payload.
- Surface HTTP failures and keep the item pending unless the server confirms persistence.
- Keep demo fixtures only behind an explicit test/story/demo adapter that cannot ship as the production API implementation.

**Acceptance evidence**

- A real pending evaluation returned by Nest renders on mobile.
- A real successful submission becomes completed after refetch/app restart.
- 4xx, 5xx, offline, and timeout cases never show success or mutate durable-looking local state.

### F-02 — P1: Teacher evaluation summaries use an obsolete response shape

**Status:** Broken read contract.

**Evidence**

- Mobile expects `overallAverage`, `responseCount`, `classAverages`, and `gradingPeriodBreakdown` in `mobile/src/types/teacher.ts:484-499`.
- The mobile normalizer supplies zero/empty defaults for those obsolete fields in `mobile/src/api/services/lxp.ts:342-359`.
- The current backend returns `classes`, `periods`, `overview`, `categoryAverages`, `comments`, and `trends`; see `backend/src/modules/lxp/lxp.service.ts:5650-5688`.
- Web models the current shape in `next-frontend/src/types/lxp.ts:798-835`.
- The mobile screen renders only its obsolete fields in `mobile/src/screens/TeacherEvaluationsScreen.tsx:143-205`.

**User impact**

Valid responses can render as zero responses, N/A overall average, and no class rows. Comments, category averages, response rate, eligible count, and trends are inaccessible.

**Required contract fix**

Use the backend/web response model without defaulting missing legacy fields. Render `overview`, category averages, comments, trends, available classes, and policy-provided periods. Treat an invalid shape as a visible contract error, not an empty dataset.

### F-03 — P0: Mobile assessment execution ignores authoritative question order and per-question deadlines

**Status:** Incorrect assessment behavior.

**Evidence**

- The backend creates and returns `questionOrder`, `currentQuestionStartedAt`, `currentQuestionDeadlineAt`, `timedQuestionsEnabled`, and `questionTimeLimitSeconds` in `backend/src/modules/assessments/assessments.service.ts:3101-3145`.
- Web includes the attempt fields in `next-frontend/src/types/assessment.ts:245-274` and uses them in the assessment taker.
- Mobile's `AssessmentAttempt` omits all three server attempt fields in `mobile/src/types/assessment.ts:202-229`.
- `AssessmentTakeScreen` uses `assessment.questions` in static order and builds only the overall timer from `expiresAt` in `mobile/src/screens/AssessmentTakeScreen.tsx:235-249`.
- No production mobile assessment screen references `questionOrder` or `currentQuestionDeadlineAt`.

**User impact**

- `randomizeQuestions` is ineffective on mobile.
- Per-question timed assessments show no question countdown and do not auto-advance consistently with server state.
- The backend can advance or auto-submit based on deadlines while the mobile UI still presents an older question.
- Resume behavior can disagree with the authoritative attempt order/index.

**Required contract fix**

- Add the server-owned ordering/timing fields to the mobile attempt contract.
- Derive displayed questions from `attempt.questionOrder`, falling back only when the server explicitly returns no order.
- Drive the per-question timer from `currentQuestionDeadlineAt`, resynchronize after every progress response, and handle server auto-advance/auto-submit responses.
- Keep overall assessment timing and per-question timing separate.

**Acceptance evidence**

- Randomized order remains identical across resume/restart and differs from stored assessment order when enabled.
- Question countdown survives background/foreground transitions by recalculating from server timestamps.
- Expired-question, offline-resume, strict-navigation, and server-auto-submit cases match web and backend behavior.

### F-04 — P1: Mobile grade return cannot express rubric or manual-response scoring

**Status:** Incomplete write contract.

**Evidence**

- The backend `ReturnGradeDto` accepts `teacherFeedback`, `directScore`, `rubricScores`, and `manualResponseScores` in `backend/src/modules/assessments/DTO/assessment.dto.ts:549-570`.
- Web forwards all four grading paths in `next-frontend/src/services/assessment-service.ts:428-441`.
- Mobile only permits `teacherFeedback` and `directScore` in `mobile/src/api/services/assessments.ts:247-258`.
- The mobile review screen provides direct-score and feedback controls but no criterion-level rubric or response-level manual scoring workspace.

**User impact**

Rubric-based file submissions and short/fill responses requiring manual marking cannot be graded with the same semantics as web. A direct percentage is only an override; it does not preserve criterion or question evidence.

**Required contract fix**

Adopt the complete return DTO and provide separate grading modes based on assessment type: response scoring, rubric scoring, and explicit direct-score override. Preserve validation, totals, and teacher ownership rules from the backend.

### F-05 — P1: Mobile assessment results omit feedback-release and rubric state

**Status:** Incomplete response contract and potentially misleading rendering.

**Evidence**

- Backend student results can return null scores before teacher return and attach `feedbackStatus`; returned results may include `rubricScores` (`backend/src/modules/assessments/assessments.service.ts:4273-4320`).
- Web types score/passed as nullable and models both `feedbackStatus` and `rubricScores` (`next-frontend/src/types/assessment.ts:299-323`).
- Mobile requires numeric score/boolean passed, does not model `feedbackStatus` or rubric scores, and makes `isCorrect` merely optional (`mobile/src/types/assessment.ts:276-303`).
- Mobile result screens do not show feedback unlock/delay state or rubric breakdown and can label a response without a boolean correctness result as needing correction.

**User impact**

Delayed/detailed feedback appears incomplete without explaining why; rubric evidence disappears; manually reviewed answers can receive misleading correctness labels.

**Required contract fix**

Use the nullable backend result contract, render the feedback state first, distinguish ungraded from incorrect, and display rubric results when present.

### F-06 — P1: AI draft creation discards the settings collected by the mobile UI

**Status:** Broken request adapter.

**Evidence**

- `TeacherAiDraftScreen` passes `assessmentSettings: settings` at creation (`mobile/src/screens/TeacherAiDraftScreen.tsx:174-191`).
- `aiApi.createQuizDraftJob` never copies `payload.assessmentSettings`; it hard-codes quiz type, 60 passing score, standard feedback, written-work category, and published-default source policy (`mobile/src/api/services/ai.ts:162-180`).
- Backend AI authoring accepts and persists the complete settings object. Web sends that object directly.
- The in-progress OpenSpec design explicitly requires complete assessment settings through job creation, retrieval, update, retry, and preview.

**User impact**

Title/description, quarter, category, due/close rules, attempts, timers, randomization, strict mode, passing score, and feedback policy selected before generation are not part of the created job. The screen later reloads backend defaults, so the teacher must notice and re-enter/resave settings before applying.

**Required contract fix**

Make `assessmentSettings` the canonical creation payload. Remove conflicting hard-coded legacy fields or derive compatibility fields from the same settings object. Add a service-level contract test, because the existing screen mock only proves that the screen passes settings into the adapter—not that the adapter sends them over HTTP.

### F-07 — P1: First-page-only list contracts silently hide records

**Status:** Incorrect data completeness.

**Confirmed instances**

| Resource | Backend behavior | Mobile behavior | Affected surfaces |
|---|---|---|---|
| Assessments by class | Defaults to page 1, limit 20; max 100 (`backend/src/modules/assessments/assessments.controller.ts:133-160`) | Sends no page/limit and unwraps only `data` (`mobile/src/api/services/assessments.ts:114-116`) | Student/teacher assessment lists, calendar, course/lesson views, dashboard/live notifications |
| Announcements by class | Defaults to page 1, limit 20 (`backend/src/modules/announcements/announcements.service.ts:206-246`) | Sends no query and returns only the array (`mobile/src/api/services/announcements.ts:10-14`) | Student announcements, class views, teacher composer/feed, calendars |
| Library files | Returns data plus total/page/limit/totalPages; default service limit is 20 (`backend/src/modules/file-upload/file-upload.controller.ts:151-168`) | Query has no page/limit and drops metadata (`mobile/src/api/services/file-upload.ts:7-12`) | Teacher library and source selection |
| Admin archive browser | Admin class/section endpoints are paginated | Requests a single page with limit 100 (`mobile/src/screens/RoleWorkspaceScreen.tsx:80-93`) | Active/archive totals and archive browsing above 100 records |

**User impact**

Older records disappear without a loading affordance, warning, or total count. Searches and filters operate only on the loaded subset, which can look authoritative.

**Required contract fix**

Preserve each endpoint's pagination envelope. Add explicit page/cursor loading or a bounded fetch-all helper only where the dataset is guaranteed small. Counts must come from backend metadata, not the current array length.

**Acceptance evidence**

Fixtures with 21, 101, and multiple pages prove that lists, searches, calendar aggregation, and totals are complete or clearly paginated.

### F-08 — P2: Teacher and admin Announcements tabs open notification inboxes

**Status:** Incorrect navigation mapping.

**Evidence**

- Teacher `Announcements` is mapped to `NotificationsInboxScreen` in `mobile/src/navigation/AppNavigator.tsx:695-710`.
- Admin `Announcements` is also mapped to `NotificationsInboxScreen` in `mobile/src/navigation/AppNavigator.tsx:843-858`.
- A real `TeacherAnnouncementsScreen` exists and is reachable through Teacher More, not the named primary tab.

**User impact**

The tab label promises announcement management but opens personal notifications. Teacher functionality is discoverable only through a secondary route; admin announcement management does not exist.

**Required fix**

Map role navigation labels to the matching role workspace. Give notifications their own label/route. Do not reuse a visually similar feed as a substitute for another domain contract.

### F-09 — P2: Profile/session behavior differs from web

**Status:** Incomplete auth/profile parity.

**Evidence**

- Web derives `isProfileIncomplete` from missing first/last name and redirects authenticated dashboard users to `/complete-profile` (`next-frontend/src/providers/AuthProvider.tsx:163-175`; `next-frontend/app/(dashboard)/layout.tsx:31-56`).
- Mobile chooses a role navigator whenever `isAuthenticated` is true and has no complete-profile gate (`mobile/src/navigation/AppNavigator.tsx:884-904`).
- Mobile profile explicitly says password changes are unavailable (`mobile/src/screens/ProfileScreen.tsx:1085-1101`), while web calls the real `/auth/change-password` contract.

**User impact**

An account that web considers incomplete can enter mobile role screens. Users must leave mobile to change a known password.

**Required fix**

Share the same completeness predicate and add a dedicated completion route before role navigation. Add change-password request validation and error handling equivalent to web.

### F-10 — P2: Mobile report export bypasses the server's complete and audited CSV contract

**Status:** Incomplete export contract.

**Evidence**

- Web requests `export=csv` from the selected report endpoint (`next-frontend/src/services/report-service.ts:77-82`).
- Backend server export logs `reports.exported` with filters before returning CSV (`backend/src/modules/reports/reports.controller.ts:71-97`).
- Mobile report service exposes only JSON reads (`mobile/src/api/services/reports.ts:28-66`).
- `TeacherReportsScreen` flattens the currently loaded rows into a local two-column CSV and shares the local file.

**User impact**

Mobile exports can omit later pages and structured report columns, and no backend audit event records the export. Searching before export also exports only the filtered visible subset without making that scope authoritative.

**Required contract fix**

Use the backend CSV endpoint for official export, preserve the selected report/filter contract, and download/share the protected response. If a local convenience export remains, label it as “export visible rows” and keep it separate from the official audited export.

## Missing web-equivalent capabilities

These are not necessarily malformed HTTP calls. They are functions present on web and supported by backend contracts but absent or materially incomplete on mobile.

### M-01 — P1: Assigned system evaluations are absent

Web supports student and teacher assigned system-evaluation dashboards/submission through `/lxp/me/system-evaluations` and `/lxp/me/system-evaluations/:assignmentId/submit`, and admin campaign creation/list/status management. Mobile has none of these service methods or screens. This compounds F-01: the mobile evaluation UI is not only wired incorrectly; it also cannot fulfill the current evaluation model.

### M-02 — P1: Generated remedial lesson detail is absent

Web loads `/lxp/me/playlist/:classId/generated-lessons/:assignmentId` and has a generated-lesson route. Mobile models generated lesson content inside some LXP responses but has no equivalent fetch method or navigation destination. A playlist assignment that points to a generated lesson therefore cannot be completed with web-equivalent behavior.

### M-03 — P1: Admin mobile is mostly a placeholder, not an admin client

`RoleTabs` exposes Home, Classes, Assessments, Announcements, Academic, and Profile. Only Academic has a substantial operational screen; Classes is a read-only archive browser. Home, Assessments, and Profile render generic placeholder copy and logout; Announcements opens notifications.

Web admin capabilities with no equivalent usable mobile workspace include:

- user list/create/detail/lifecycle administration;
- class and section create/edit, roster, and student enrollment workflows;
- class-template and core-content management;
- assessment administration;
- admin announcements and calendar;
- audit log and diagnostics/health views;
- roster import;
- system settings;
- system-evaluation campaign administration;
- reports, user reports, and student master list;
- admin library management;
- admin chatbot;
- academic record/access-student navigation outside the mobile academic controls.

If admin parity is a product requirement, this is a planned product slice rather than a small contract patch.

### M-04 — P2: Academic state-alignment preview/execute is web-only

Mobile academic administration does support period activation, year transition, workbook access, back subjects, completion, audit, and multiple explicit repairs. It does not expose the backend's state-alignment preview and execute contracts that web uses in `AcademicStateAlignmentRecovery`. These operations require a manifest hash and confirmations, so they must not be approximated by the older single-state repair payload.

### M-05 — P2: Teacher content lifecycle tools are incomplete

Compared with the web service layer, mobile lacks:

- lesson versions/create-version/restore-version, recent lesson feed, bulk delete, bulk draft-state update, delete from the service facade, and class-level lesson reorder;
- module-section update, grading-scale replacement, and core module/item release operations;
- assessment statistics, question analytics, all/ongoing attempt views, bulk return/return-all, rubric-source upload/review, and core release;
- library folders, storage summary, and retry-index actions.

These should be triaged by product necessity. They are not all blockers for day-to-day mobile teaching, but mobile cannot currently claim the same teacher function set as web.

### M-06 — P3: Notification “read all” is absent

Mobile lists notifications, counts unread items, and marks one item read. It has no consumer for `PATCH /notifications/read-all`, which web exposes.

### M-07 — P3: JA history and pagination are incomplete

Web exposes paginated JA activity history and paginated Ask-thread retrieval. Mobile has no activity-history service and calls an Ask thread without `limit`/`before`. Long conversations and historical practice activity therefore cannot reach feature parity even though the core Ask/Practice/Review flows are connected.

## Latent contract debt (not yet proven as a visible break)

Handwritten web and mobile models have also drifted in fields that may become visible as screens evolve. These should be reconciled during contract generation, but they are not promoted to confirmed failures unless a current consumer depends on them.

- Mobile assessment models omit or narrow fields including rubric criteria/results, current-question timestamps/order, feedback state, and nullable result values.
- Mobile class/module types omit some grading-profile, grading-scale, core/template, image, and completion-count fields present in web/backend responses.
- Mobile class-record types omit some policy-exclusion and examination-component metadata.
- Mobile user types omit several admin/teacher profile fields used on web.
- AI DTOs retain legacy top-level fields alongside the newer nested settings contract, making it easy for an adapter to silently choose conflicting defaults.
- Generic `normalizeObject`/`normalizeArray` helpers can turn incompatible envelopes into plausible empty data, delaying detection of server/client drift.

## Behaviors found aligned or substantially aligned

To prevent the remediation effort from replacing working code unnecessarily, the following areas should be preserved and regression-tested rather than rewritten:

- Mobile auth uses backend `/auth` endpoints for login, refresh/session bootstrap, logout, forgot/reset password, verification, resend, initial password, current user, and profile update.
- Student/teacher class routes, class detail, section lists, enrollment/master-list/profile/overview routes, and most roster actions match backend ownership.
- Lesson and module read paths, completion, content block CRUD/order, module/item attachment/order, and protected downloads use real contracts.
- The atomic assessment editor, teacher attachment/image upload, explicit draft/publish workflow, and AI job lifecycle endpoints largely follow the current backend design.
- Mobile academic state screens use policy-provided periods rather than treating hard-coded labels as authoritative, and include guarded preview/password/reason workflows for major mutations.
- Notifications list/unread/read-one contracts match the backend.
- Teacher LXP intervention queue/history/detail, assignment, activation, resolution, regeneration, and generated-artifact approval/rejection routes are represented.
- JA Hub, Practice, Ask send/create, and Review endpoints are real backend routes; the gap is completeness/history, not a fake endpoint.

## Root causes

1. **Three handwritten contract copies.** Backend DTOs/services, web TypeScript types, and mobile TypeScript types can evolve independently.
2. **Transport adapters alter meaning.** The AI adapter accepts a complete object but constructs a different legacy DTO; normalizers default stale fields rather than rejecting them.
3. **Error swallowing in production API code.** The evaluation adapter converts every failure category into sample data or success.
4. **Pagination metadata is discarded.** Array-only mobile APIs hide server paging and make partial data look complete.
5. **Screen mocks stop at the wrong boundary.** The AI screen test proves the screen calls the mobile adapter correctly, but not that the adapter sends the same payload to Nest.
6. **Navigation labels are not contract-tested.** A screen can exist while the primary route points to another domain.
7. **Parity is tracked by route presence more than behavioral invariants.** Timers, randomized order, feedback release, idempotency, and audit events require semantic tests.

## Recommended solution direction

Use the backend OpenAPI/DTO surface as the single public contract source, generate or mechanically validate client request/response types, and keep platform-specific adapters thin. Web should be treated as a useful working consumer—not the authority when it conflicts with backend policy.

Three approaches were considered:

1. **Patch mobile types and calls manually.** Fastest for F-01 through F-07, but preserves the drift mechanism.
2. **Share web service/type files directly with mobile.** Reduces duplication but couples browser and React Native transport/file concerns and would import web assumptions into mobile.
3. **Recommended: generated contract core plus explicit web/mobile adapters.** Generate schemas/types from Nest's public OpenAPI contract; keep small platform adapters for Axios configuration, files, secure storage, and navigation. Add contract fixtures for complex polymorphic responses such as assessments and LXP.

Approach 3 should be introduced incrementally: repair P0/P1 behavior first, then replace handwritten types module by module.

## Implementation plan (no code executed in this audit)

### Phase 0 — Freeze and characterize the contract baseline

**Goal:** prevent remediation against an unstable or unreviewed workspace.

- Review and either commit, separate, or discard the pre-existing auth/roster/academic changes through the normal owner workflow.
- Export the current authenticated public OpenAPI document from the backend.
- Build a checked endpoint manifest containing verb, normalized path, roles, request DTO, response envelope, pagination, and owning module.
- Add characterization fixtures for evaluation dashboards, teacher evaluation summaries, assessment start/resume/results, AI draft creation, files, announcements, and reports.

**Exit gate:** backend, web, and mobile owners agree on the current response shapes and nullability; no fix depends on uncommitted accidental behavior.

### Phase 1 — Remove false success and repair evaluation contracts

**Scope:** F-01, F-02, M-01.

- Replace the mobile evaluation abstraction with separate, backend-owned contracts for teacher evaluations and assigned system evaluations.
- Remove hard-coded fallback records and catch-and-success behavior.
- Adopt the current teacher summary shape and render its overview/categories/comments/trends.
- Add student and teacher assigned system-evaluation inbox/submission flows.
- Add admin campaign support only if admin mobile parity is approved; otherwise mark it explicitly web-only.

**Exit gate:** failed writes remain failed; server-persisted submissions survive restart; teacher summary fixtures render non-zero real data; no mobile production service returns demo evaluation content.

### Phase 2 — Make assessment execution and grading server-authoritative

**Scope:** F-03, F-04, F-05.

- Reconcile assessment attempt/result types with backend nullability and timing/order fields.
- Implement ordered question projection and deadline-driven per-question timing/resume.
- Add explicit handling for backend auto-advance and auto-submit.
- Add manual-response and rubric grading payloads/UI; keep direct score as an explicit override.
- Render feedback lock/delay/unlock states and rubric results.

**Exit gate:** the same seeded assessment produces equivalent order, timing transitions, grade evidence, and feedback visibility on web and mobile.

### Phase 3 — Repair AI draft settings end to end

**Scope:** F-06 and the remaining OpenSpec runtime gate.

- Make nested `assessmentSettings` canonical at the mobile HTTP boundary.
- Validate that create, retrieve, update, retry, preview, and apply preserve every supported field.
- Resolve legacy top-level field precedence so conflicting values cannot silently override nested settings.
- Complete disposable-service authenticated tests and a device recovery/publication pass.
- Run a live provider/worker generation and extraction check when credentials/runtime are available; report it separately from contract success.

**Exit gate:** a non-default settings object is byte/semantically equivalent across mobile request, backend job state, retry, preview, and created unpublished assessment.

### Phase 4 — Preserve pagination, export fidelity, and auditability

**Scope:** F-07 and F-10.

- Introduce response types that retain `data`, `total`, `page`, `limit`, and `totalPages`.
- Add page/cursor UI for assessments, announcements, files, and admin archives.
- Ensure aggregated dashboard/calendar consumers deliberately fetch all required pages or use a backend aggregation endpoint.
- Add the official server CSV download path to mobile and keep local visible-row export separately labeled if retained.

**Exit gate:** >20 and >100 record fixtures do not disappear; total counts are correct; official mobile exports create the backend audit event and match web CSV columns.

### Phase 5 — Correct navigation and account lifecycle parity

**Scope:** F-08, F-09, M-06.

- Route Announcements to announcement screens and Notifications to a notification screen for every role.
- Add mobile complete-profile gating with the same authoritative predicate as web.
- Add password change.
- Add read-all notifications.

**Exit gate:** route-name tests assert the rendered domain; incomplete accounts cannot enter role workspaces; password and read-all changes persist after refetch.

### Phase 6 — Deliver missing core parity by product priority

**Scope:** M-02 through M-05 and M-07.

Recommended order:

1. Generated remedial lesson detail, because it blocks completion of a backend-created student assignment.
2. Academic state-alignment preview/execute, if administrators are expected to recover state from mobile.
3. Teacher rubric/analytics/bulk grading and file-library paging/folders.
4. Lesson version history and module section/grading-scale management.
5. JA activity history and Ask pagination.
6. Admin mobile as its own approved product initiative; do not hide placeholders behind production navigation labels meanwhile.

**Exit gate:** every shipped tab has a real supported workflow; intentionally web-only functions are documented and absent from misleading navigation.

### Phase 7 — Prevent recurrence

- Generate public client contracts in CI from the backend OpenAPI document, with a reviewed allowlist for endpoints that cannot be generated cleanly.
- Fail CI when a literal client route has no backend match, a public schema changes without regenerated clients, or required pagination metadata is dropped.
- Add adapter-boundary tests that inspect the actual Axios request, not only screen-to-adapter calls.
- Ban catch blocks in production service adapters that return success or sample records after transport errors.
- Add semantic cross-client fixtures for assessment timing/order, feedback release, evaluation analytics, AI settings, and audited report export.
- Add role navigation manifest tests mapping labels, routes, screens, and required backend capabilities.

## Proposed work packages and ownership

| Package | Primary owner files | Depends on | Priority |
|---|---|---|---|
| Evaluation contract repair | `backend/src/modules/lxp/`, `mobile/src/api/services/evaluations.ts`, `mobile/src/api/services/lxp.ts`, evaluation screens/types | Phase 0 fixtures | P0/P1 |
| Assessment execution parity | Backend assessment contract/tests, `mobile/src/types/assessment.ts`, `AssessmentTakeScreen` | Stable attempt fixture | P0 |
| Grading/result parity | Assessment DTO/service fixtures, mobile review/result screens and service | Assessment type reconciliation | P1 |
| AI settings transport | `mobile/src/api/services/ai.ts`, AI adapter tests, OpenSpec evidence | Current backend settings contract | P1 |
| Pagination envelopes | Mobile assessment/announcement/file services and consuming screens | Contract generation conventions | P1 |
| Navigation/account lifecycle | App navigator, auth provider/screens, notifications | Current auth changes resolved | P2 |
| Official report export | Mobile report service/screen, backend export fixture | Protected file/download behavior | P2 |
| LXP generated lesson | Mobile LXP service/types/navigation/screen | Existing backend route | P1 |
| Academic alignment mobile | Mobile academic service/recovery UI | Approved admin-mobile scope | P2 |
| Admin parity initiative | Admin routes/services/screens | Product scope and threat model | P1 program |
| Generated-contract governance | Backend OpenAPI pipeline, both clients, CI | Incremental module adoption | Preventive |

## Verification plan

### Contract-level

- For every repaired request, assert verb, path, params/body, role, response envelope, nullability, and error mapping.
- Generate one shared fixture from a real Nest response for each complex read contract and run it through both web and mobile consumers.
- Run the literal endpoint-manifest comparison in CI.

### Backend integration

- Use disposable PostgreSQL and Redis where required.
- Cover evaluation persistence, assessment resume/deadline/auto-submit, rubric/manual grading, feedback filtering, AI job settings persistence/retry/apply, pagination totals, and report export audit logging.

### Mobile integration

- Exercise authenticated student, teacher, and—only if supported—admin sessions on Android and at least one second platform target.
- Include offline, expired token, 403, 404, 409/revision conflict, validation error, timeout, background/resume, and app restart cases.
- Verify no mutation toast/dialog is shown before a confirmed server response.

### Cross-client parity scenarios

1. Create/edit on web, resume/complete on mobile, inspect on web.
2. Create/edit on mobile, review/publish on web, reopen on mobile.
3. Start the same timed/randomized assessment on both clients and compare authoritative attempt state.
4. Grade rubric/manual answers on each client and compare the stored attempt/audit record.
5. Submit evaluations on each client and compare dashboards and teacher aggregates.
6. Generate an AI draft with non-default settings, retry it, preview/apply it, and compare the unpublished assessment.
7. Populate more than one page of assessments, announcements, files, and archive records and compare totals.
8. Export the same filtered report on both clients and compare columns, rows, filters, and audit events.

### Release gate

- Mobile typecheck, lint, unit/integration tests, and production build pass.
- Relevant backend and web suites pass.
- Authenticated device flows are recorded with request/response evidence.
- Live AI provider coverage is explicitly stated; backend deployment health alone is not accepted as proof of generation/extraction.
- The existing `mobile-assessment-authoring-parity` OpenSpec change is not archived until its runtime gate is actually complete.

## Immediate priority order

1. **Stop evaluation false success and demo fallback behavior (F-01).**
2. **Make assessment timing/order server-authoritative (F-03).**
3. **Repair teacher evaluation summary shape and assigned evaluation support (F-02, M-01).**
4. **Complete grading and results contracts (F-04, F-05).**
5. **Forward complete AI draft settings and finish its runtime gate (F-06).**
6. **Fix pagination/data completeness and official report export (F-07, F-10).**
7. **Correct navigation/profile lifecycle and unblock generated lessons (F-08, F-09, M-02).**
8. **Schedule admin and long-tail authoring parity as explicit product work, not incidental patches.**

## Final assessment

The mobile client currently has enough real integrations to remain a viable student/teacher client, but it cannot truthfully claim web parity. The evaluation flow is nonfunctional against the real backend and masks failure; assessment execution and grading omit server-authoritative semantics; AI draft creation drops user-selected settings; and several lists are silently incomplete. Admin mobile is a partial shell rather than an equivalent administrative client.

The remediation should begin with the P0/P1 contract corrections, then adopt generated/validated contracts so the same drift does not recur. Missing administrative and advanced authoring features should be approved as separate product scopes after correctness of the existing mobile workflows is restored.
