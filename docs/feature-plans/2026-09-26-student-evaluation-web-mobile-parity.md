# Student Evaluation Web/Mobile Parity Implementation Plan

**Date:** 2026-09-26

**Status:** Approved implementation packaged as Android 0.1.50/build 51; deployment verification in progress

**Source design:** `docs/superpowers/specs/2026-09-26-student-evaluation-web-mobile-redesign.md`

**Source analysis:** `docs/feature-analysis/2026-09-26-student-evaluation-web-mobile-parity.md`
**Authorization:** After design review, implement web first, then mobile, package Android, commit, push, observe CI/deployment, and verify shipped outputs.

## 1. Decision summary and feature brief

Implement the recommended responsive evaluation workspace. Web receives the visual redesign and semantic rating tooltips first. Then mobile receives the same scale and behavior in a touch-first full-screen form, plus a categorized student drawer and a first-class Evaluations destination.

All evaluation kinds will use deliberate integer ratings `0–5`. The only backend contract behavior change is widening teacher rating validation from `1–5` to `0–5`. Existing endpoint paths, payload keys, response envelopes, eligibility rules, persistence shapes, and audits remain unchanged.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend teacher rating boundary and focused regression coverage.
- Student web evaluation layout, rating semantics/tooltips, accessibility, responsive behavior, and component tests.
- Student mobile evaluation list/form redesign, deliberate completion, same rating semantics/payloads, error preservation, and screen tests.
- Student tab/route registration, categorized drawer, Profile quick-link compatibility, and navigation tests.
- Android packaging because mobile source changes; version/build becomes the next monotonic release after `0.1.49`/50.
- Commit, push, configured CI/Railway deployment, public artifact verification, and updater-policy verification under the existing finish-and-ship authority.

### Non-goals

- New evaluation questions, campaigns, analytics, anonymous-report behavior, draft persistence, offline submission queue, reminders, notification changes, or admin/teacher redesign.
- Database migration or historical data rewrite.
- Changes to auth, RBAC, enrollment, academic-period, finalization, duplicate-submission, or audit policy.
- Closing unrelated incomplete tasks in `align-mobile-with-web-contracts`.

### Assumptions

- A rating of 0 is an intentional answer meaning “Not observed,” not an unanswered value. Unanswered remains `null`/missing client state and cannot be submitted.
- The same generic labels are appropriate for all current backend-supplied evaluation questions.
- Existing JSON persistence safely stores 0 without a schema migration.

## 3. Current-state evidence ledger

| Status | Finding | Evidence |
|---|---|---|
| Confirmed | Web merges teacher and assigned system/JA inboxes and submits through current LXP services. | `StudentTeacherEvaluationsPage.tsx:124-274` |
| Confirmed | Web scale is compressed into a table and lacks semantic tooltip text. | `StudentTeacherEvaluationsPage.tsx:87-121, 409-470` |
| Confirmed | Mobile real-data evaluation screen/API already exist. | `StudentEvaluationsScreen.tsx`; `mobile/src/api/services/evaluations.ts:199-232` |
| Confirmed | Mobile screen is root/Profile-only, not in the student tab/drawer manifest. | `AppNavigator.tsx:243-251, 678-705`; `role-drawer-model.ts:114-151` |
| Confirmed | Mobile preselects all 5 and omits 0. | `StudentEvaluationsScreen.tsx:40-60, 187-190` |
| Confirmed | Teacher backend accepts 1–5 while system/JA accepts 0–5. | `lxp.service.ts:280-303, 442-476` |
| Confirmed | Rating maps are JSON; no schema range constraint requires migration. | `lxp.schema.ts:367, 541` |
| Confirmed | Existing focused web test passes 1/1 and mobile API/navigation tests pass 38/38. | Commands run 2026-09-26; current SHA `a11ab492` |
| Inferred | Moving Evaluations into student tabs gives correct drawer/header/history ownership. | Existing `RoleDrawerProvider`/`backBehavior="history"` composition in `AppNavigator.tsx:653-675` |
| Unverified | Physical-device layout and authenticated end-to-end submission. | Requires Phase 2 runtime target/account |

## 4. End-to-end impact and consumer map

| Producer/owner | Interface | Consumers | Planned effect |
|---|---|---|---|
| LXP service | Teacher `Record<string, number>` validation | Web and mobile teacher submissions; teacher summaries | Widen lower bound to 0; no shape change |
| LXP controller | Existing success envelope/routes | `lxpService`, `evaluationsApi` | Frozen |
| Web page component | Unified evaluation view | Student browser route | New layout/scale only |
| Mobile API client | Same endpoint DTOs | `StudentEvaluationsScreen` | Frozen; contract tests confirm exact calls |
| Student route manifest/AppNavigator | Typed tab registration | Drawer, Profile quick link, tab history | Add `StudentEvaluations` tab; remove duplicate root registration |
| Role drawer model | Student groups | `RoleNavigationDrawer` | Split categories and add Evaluations once |
| Android release metadata/artifact | Version policy and website APK | Installed Android clients | Monotonic package/release after verification |

No AI-service, job, event, Redis, external provider, or database migration consumer is affected.

## 5. Conflicts, invariants, risks, and options

### Highest-impact conflicts

1. **Rating lower bound:** client behavior is inconsistent with backend teacher validation. Resolve through a backward-compatible backend widening in the same revision.
2. **Navigation ownership:** simply adding a stack item to the drawer would leave the screen outside `RoleDrawerProvider`. Resolve by promoting it to a typed student tab.
3. **Mobile response bias:** automatic 5 defaults violate deliberate completion. Resolve with nullable local state and a completion guard.
4. **Tooltip-only semantics:** hover is unavailable on touch and insufficient for assistive technology. Resolve with hover/focus tooltips plus persistent selected text and accessible descriptions.

### Invariants

- Backend remains the authority for availability, eligibility, question keys, integer bounds, duplicate state, persistence, and audit.
- Both clients send the same values and keys but keep platform-appropriate layout.
- No fake data or success response on errors.
- Old `1–5` clients remain accepted after the backend widening.

### Design options

- **Recommended:** responsive split workspace with stacked question scales; best continuity and responsive behavior.
- Stepper: best focus, but extra state/interaction cost and slower review.
- Dense matrix: efficient desktop scanning, but repeats the current narrow-screen problem.

## 6. Recommended architecture, data flow, security, and errors

1. Backend rating normalization changes first and is protected by unit boundaries.
2. Web uses a local `EVALUATION_RATING_SCALE` constant and a controlled nullable scale component. Tooltip IDs derive from question key and rating.
3. Mobile uses the same six labels/descriptions in a local constant and nullable rating state. It never constructs a mutation until all backend-supplied keys have a number.
4. Existing bearer/cookie authentication and `@Roles(Student)` guards remain unchanged.
5. Existing service errors flow to toast/alert. Web and mobile retain the current selected form/draft on mutation failure.
6. Server success triggers the existing dashboard refetch and completed-state transition.

## 7. Contract, schema, migration, and compatibility

- **Request behavior:** teacher ratings widen from integer `1–5` to integer `0–5`.
- **Request shape:** unchanged.
- **Response shape/envelope:** unchanged.
- **Routes:** unchanged.
- **Persistence:** unchanged JSON maps; no migration.
- **Compatibility:** old clients sending 1–5 continue to work. New clients can send 0. Reverting code later would reject new 0 submissions but must not delete or rewrite accepted records.
- **Reporting:** existing average calculations include 0 naturally; tests must prevent truthiness-based omission.

## 8. Ordered implementation phases and exact owners

### Phase 2.1 — Test-drive backend contract reconciliation

Owners:

- `backend/src/modules/lxp/lxp.service.spec.ts`
- `backend/src/modules/lxp/lxp.service.ts`

Tasks:

1. Add a failing focused test for a teacher rating map containing 0 and boundary failures for -1/6/missing/unknown keys.
2. Change only `normalizeTeacherEvaluationRatings` lower bound/message from 1 to 0.
3. Run the focused LXP service spec, then backend lint/build/full required gates later.

### Phase 2.2 — Implement and verify the web redesign first

Owners:

- `next-frontend/src/components/student/evaluations/StudentTeacherEvaluationsPage.test.tsx`
- `next-frontend/src/components/student/evaluations/StudentTeacherEvaluationsPage.tsx`

Tasks:

1. Add failing tests for all six labels, hover/focus meaning, pressed state, no default, incomplete submit, and exact teacher/system payloads including 0.
2. Introduce the rating-scale constant and accessible tooltip/selected-description component.
3. Replace the nested table with full-width question rows/cards and normal document scrolling.
4. Expand the page workspace and ensure selected/navy states meet contrast requirements.
5. Verify desktop and narrow browser widths, loading, empty, selected, incomplete, error, and submitting states.

### Phase 2.3 — Implement mobile rating/form parity

Owners:

- Add `mobile/src/screens/__tests__/student-evaluations.test.tsx`
- Modify `mobile/src/screens/StudentEvaluationsScreen.tsx`
- Confirm `mobile/src/api/__tests__/evaluations-api.test.ts`

Tasks:

1. Add failing rendered tests for no preselection, 0–5 touch choices, persistent meaning, completion guard, failure retention, and exact mutation payloads.
2. Replace numeric default state with `number | null` values and derive answered/remaining count.
3. Replace modal form with in-screen list/detail rendering and mobile-safe 3-by-2 choices.
4. Use drawer-aware header in list mode and local Back in form mode; keep comment and submit reachable with keyboard/safe area.
5. Preserve refetch/invalidation and backend-derived error text.

### Phase 2.4 — Promote Evaluations and categorize student drawer

Owners:

- `mobile/src/navigation/types.ts`
- `mobile/src/navigation/student-route-manifest.ts`
- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/navigation/role-drawer-model.ts`
- `mobile/src/screens/ProfileScreen.tsx` only if typed sibling navigation requires adjustment
- `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`
- `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`
- `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

Tasks:

1. Add failing expectations for Learning, School life, Feedback, and a single Evaluations destination.
2. Add `StudentEvaluations` to `MainTabParamList`, tab manifest/map/render switch, and drawer Feedback group.
3. Remove the duplicate root-stack registration/type after Profile reaches the sibling tab.
4. Preserve `backBehavior="history"`, Profile footer, logout, and detail/support routes.

### Phase 2.5 — Cross-surface verification and review

1. Run focused backend, web, and mobile red/green suites.
2. Run affected typecheck, lint, unit suites, and production builds in all three workspaces.
3. Run browser interaction checks at representative desktop and narrow widths.
4. Review exact payload parity, route inventory, accessibility names/states, error preservation, and final diff.
5. Confirm the pre-existing modified `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` remains untouched by this task.

### Phase 2.6 — Android package and release

Owners are the existing release contract:

- `mobile/app.json`
- `mobile/android/app/build.gradle`
- `mobile/scripts/app-version-release.test.cjs`
- versioned APK/manifest under `next-frontend/public/downloads/android/`
- `next-frontend/public/downloads/nexora-student-mobile-release.json`

Tasks:

1. Bump monotonically from Android `0.1.49`/build 50 to the next repository-valid version/build.
2. Build the production ARM64 APK and generate the manifest with accurate evaluation/drawer release notes.
3. Verify package ID, version, ABI, signature, alignment, installer permission, embedded production API URL, byte size, and SHA-256.
4. Install/smoke on an available emulator/device. Keep physical-device evidence separate and explicitly unavailable if no target exists.

### Phase 2.7 — Ship and observe

1. Recheck `git status`, scoped diff, `git diff --check`, and `origin/developement...HEAD`.
2. Commit task-owned files on `developement` without including the unrelated pre-existing documentation edit.
3. Push the exact tested SHA.
4. Verify CI for that SHA, then the configured Railway deployment for the same SHA.
5. Verify live frontend/backend health and exact public APK/manifest bytes.
6. Verify updater policy: previous supported build receives the intended update classification and the new build receives `none`.

## 9. Verification matrix and acceptance criteria

| Requirement | Evidence |
|---|---|
| 0 has clear meaning; 1–5 rise monotonically | Web/mobile rendered tests and visual inspection |
| Every web rating has custom tooltip | Hover/focus test plus browser inspection |
| Tooltips are not hover-only | `aria-describedby`, focus visibility, persistent selected description |
| Web no longer displaces scale | No fixed rating column/min-width table; desktop/narrow screenshots or browser evidence |
| No accidental all-5 mobile response | Initial-null rendered test and disabled submit |
| Web/mobile payload parity | Exact mutation assertions for teacher and assigned-system paths |
| Backend accepts 0 everywhere | Teacher/system service boundary tests |
| Eligibility/RBAC/audit unchanged | Focused backend regression and diff review |
| Evaluations is a primary student destination | Tab manifest/drawer rendered tests |
| Drawer is categorized | Exact group/order test; Profile/logout footer regression |
| Submission failure preserves answers | Web/mobile failure-state tests |
| Release is exact and observable | SHA-correlated CI/Railway, artifact hashes, updater checks |

Acceptance requires all relevant checks to pass. A successful build is not a physical-device UI pass, and a successful push is not deployment proof.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

- Prefer one commit so backend widening, both clients, tests, package metadata, artifact, and release evidence identify one revision.
- Backend widening is safe to deploy with older clients because it only accepts one additional value.
- Mobile functionality reaches installed devices through the existing signed APK/updater path.

### Rollback

- Web regression: revert the page component/tests and redeploy; backend widening can remain safely.
- Mobile regression: issue a higher-version corrective APK; do not publish a lower `versionCode`.
- Rating-policy rollback: restore 1–5 validation only after deciding how already-persisted 0 teacher ratings should be reported; never delete them silently.
- Navigation regression: restore the root registration/Profile quick link while retaining API behavior.

### Observability

- Existing audit actions remain the authoritative submission trace.
- Existing CI, Railway health/provenance, public artifact hash/size, and updater responses provide release evidence.
- Client errors remain visible to users; no new telemetry dependency is introduced.

### Cleanup

- Remove the duplicate root `StudentEvaluations` route only after tab navigation tests are green.
- Do not touch unrelated OpenSpec tasks or the user's pre-existing modified analysis file.

### Boundaries not verified during Phase 0

- Authenticated browser/device visual acceptance and physical-device installation depend on available runtime accounts/targets.
- No production submission will be created solely as a release test without a safe assigned form; read-only and non-durable checks are preferred.

## Plan self-review

- Consequential claims are tied to current symbols, routes, schemas, tests, or command results.
- Backend, web, mobile, navigation, packaging, CI/deployment, compatibility, errors, and rollback all have named owners.
- The plan does not widen scope into evaluation authoring, analytics, notifications, or unrelated mobile parity work.
- No placeholder, contradictory rating range, missing consumer, or unowned implementation task remains.
