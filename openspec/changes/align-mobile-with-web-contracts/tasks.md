## 1. Contract baseline and safeguards

- [x] 1.1 Add a normalized client-to-controller route manifest test with reviewed handling for dynamic paths and query strings.
- [x] 1.2 Add a production-adapter guard test proving rejected HTTP calls cannot become sample data or successful mutations.
- [x] 1.3 Add backend-derived fixtures for evaluation dashboards/summaries, assessment attempts/results, AI settings, and paginated envelopes.

## 2. Evaluation parity

- [x] 2.1 Replace the nonexistent mobile evaluation routes and fake fallback/success behavior with the student teacher-evaluation dashboard and submission contract, using failing adapter tests first.
- [x] 2.2 Update student evaluation types and screen behavior for pending/completed periods, backend definitions, durable submission, and visible errors.
- [x] 2.3 Replace the mobile teacher evaluation summary model and screen with overview, category averages, comments, trends, classes, and policy-provided periods.
- [x] 2.4 Add assigned system-evaluation list/submission services and respondent UI for both student and teacher roles.
- [x] 2.5 Add administrator system-evaluation campaign list/create/status controls with RBAC and cache-invalidation tests.

## 3. Assessment execution parity

- [x] 3.1 Add mobile attempt fields for server question order, current-question timing, deadline, nullable result values, feedback status, and rubric scores.
- [x] 3.2 Add tested pure runtime helpers for ordered-question projection, overall/per-question countdown, server resynchronization, and submitted-state resolution.
- [x] 3.3 Update the assessment taker to use server order/deadlines and handle resume, foreground, expiry, auto-advance, and auto-submit without stale navigation.
- [x] 3.4 Add screen tests for randomized resume, per-question expiry, offline failure, background/foreground recalculation, and strict navigation.

## 4. Assessment grading and feedback parity

- [x] 4.1 Extend the mobile grade-return adapter to send rubric and manual-response scores and verify request bodies against backend DTO fixtures.
- [x] 4.2 Add rubric grading and response-level manual scoring to the teacher review screen while preserving explicit direct-score override.
- [x] 4.3 Render awaiting-return, delayed/locked feedback, indeterminate correctness, hints, and rubric breakdown in student and teacher result views.
- [x] 4.4 Add teacher assessment statistics, question analytics, all/ongoing attempts, rubric review, and guarded bulk-return actions.

## 5. AI draft contract parity

- [x] 5.1 Add a failing mobile adapter test proving non-default nested assessment settings are missing from the outbound create-job body.
- [x] 5.2 Make nested assessment settings canonical through create/retrieve/update/retry/preview/apply and remove conflicting hard-coded defaults.
- [x] 5.3 Add semantic round-trip tests for all settings and update the existing assessment-authoring OpenSpec runtime evidence without overstating live provider coverage.

## 6. Pagination and complete data

- [x] 6.1 Preserve assessment pagination envelopes and update every list, calendar, dashboard, course, lesson, and live-notification consumer.
- [x] 6.2 Preserve announcement pagination envelopes and update student, teacher, class, calendar, and dashboard consumers.
- [x] 6.3 Preserve file-library pagination/folder metadata and update teacher library and source-selection consumers.
- [x] 6.4 Remove single-page admin archive assumptions and add deterministic page loading with authoritative totals.
- [x] 6.5 Add JA activity-history and Ask-thread pagination services, types, UI, and deduplication/order tests.

## 7. Account, notification, and navigation parity

- [x] 7.1 Add mobile incomplete-profile state, protected navigation gate, completion screen, update/refetch flow, and role-resume tests.
- [x] 7.2 Add mobile password-change service, validation, secure form, failure behavior, and sensitive-input clearing tests.
- [x] 7.3 Map teacher/admin announcement tabs to announcement workspaces and expose notifications under a truthful route label.
- [x] 7.4 Add read-all notifications with list/count invalidation and failure tests.

## 8. LXP generated content parity

- [x] 8.1 Add the generated-remedial-lesson service/type contract and backend-derived adapter fixture.
- [x] 8.2 Add a typed generated-lesson navigation destination, renderer, failure/retry state, and playlist link.

## 9. Teacher tooling parity

- [x] 9.1 Replace local official report CSV generation with protected backend export/download while keeping any visible-row export distinctly labelled.
- [x] 9.2 Add lesson version/history/restore, recent/bulk lifecycle, delete, and class reorder services and mobile controls.
- [x] 9.3 Add module-section update, grading-scale replacement, and authorized core-release services and controls.
- [x] 9.4 Add library folder, storage-summary, and retry-index services and controls with pagination-aware invalidation.

## 10. Administrator workspace parity

- [x] 10.1 Replace the admin Home placeholder with a data-backed overview and truthful loading/empty/error states.
- [x] 10.2 Add admin user, profile, class, section, roster, and enrollment workspaces using backend DTOs and paginated envelopes.
- [x] 10.3 Add admin assessment, announcement, calendar, library, report, and evaluation workspaces.
- [x] 10.4 Add admin audit, diagnostics, roster-import, system-settings, class-template, and academic-record navigation/workspaces.
- [x] 10.5 Add state-alignment preview/execute to mobile academic recovery with manifest-hash, confirmation, password, stale-preview, and audit safeguards.
- [x] 10.6 Replace every remaining generic admin placeholder or misleading tab with its real domain screen and add a role navigation manifest test.

## 11. Cross-surface verification and documentation

- [x] 11.1 Run focused tests after every slice and resolve all new failures before broadening scope.
- [ ] 11.2 Run backend build/lint/unit/integration/e2e coverage required by touched contracts and distinguish service prerequisites from code failures.
- [ ] 11.3 Run web lint/test/build and relevant smoke/e2e coverage for shared contract fixtures and reference behavior.
- [ ] 11.4 Run mobile typecheck/test/build plus available Expo/device authenticated student, teacher, and admin workflows.
- [ ] 11.5 Exercise cross-client create/resume/grade/evaluate/AI/pagination/export scenarios and record unavailable provider/device coverage explicitly.
- [x] 11.6 Update the 2026-09-02 audit matrix and every finding with implemented files, tests, runtime evidence, and any explicitly unverified gate.

### Verification exceptions still open

- 11.2 remains open only for service-backed integration/e2e evidence: the final check found PostgreSQL healthy but no backend or Redis service. Backend lint/build and all 117 suites / 1,262 tests passed.
- 11.3 remains open only for authenticated/smoke/e2e evidence: web TypeScript, lint, production build, and all 157 suites / 660 tests passed, but `127.0.0.1:3000/api/health/live` was unavailable.
- 11.4 remains open only for authenticated device coverage: mobile TypeScript, Android Expo production export, and all 57 suites / 291 tests passed. Mobile has no repository lint script.
- 11.5 remains open because no disposable backend/Redis stack, authenticated device session, or live AI provider/worker was available for a fresh cross-client run. This is an evidence gate, not a known contract failure.
