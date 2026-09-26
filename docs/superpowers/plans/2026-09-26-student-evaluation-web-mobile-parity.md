# Student Evaluation Web/Mobile Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one deliberate, accessible 0–5 student evaluation experience across backend, web, and mobile, then publish the verified Android/web release.

**Architecture:** Keep the existing LXP routes, response envelopes, eligibility policy, JSON persistence, and audit trail. Widen the teacher rating validator to match the existing system/JA 0–5 contract, replace the cramped web table with a responsive evaluation workspace, promote the existing mobile screen into the student drawer/tab navigator, and adapt the form to a touch-first full-screen layout.

**Tech Stack:** NestJS 11, Jest, Next.js 16, React 19, Tailwind 4, Expo 54, React Native 0.81, React Navigation, TanStack Query, PostgreSQL/Drizzle, Android Gradle.

## Global Constraints

- Use this scale verbatim on web and mobile: `0 Not observed`, `1 Rarely`, `2 Sometimes`, `3 Usually`, `4 Consistently`, `5 Excellent`.
- Unanswered is `null`/missing client state; 0 is a deliberate valid answer.
- Preserve existing endpoint paths, payload keys, success envelopes, roles, eligibility/finalization rules, duplicate prevention, persistence, and audit actions.
- Preserve GABHS red, white, and navy; use restrained borders and flat content hierarchy rather than decorative dashboards.
- Keep the pre-existing edit in `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` out of the task commit.
- Stay in the current checkout under the explicitly requested finish-and-ship workflow; do not create a worktree.

---

### Task 1: Reconcile the authoritative teacher rating boundary

**Files:**
- Modify: `backend/src/modules/lxp/lxp.service.spec.ts`
- Modify: `backend/src/modules/lxp/lxp.service.ts:442-476`

**Interfaces:**
- Consumes: `normalizeTeacherEvaluationRatings(evaluationType, ratings)` and backend-provided evaluation category keys.
- Produces: normalized `Record<string, number>` whose values are integers 0–5.

- [x] **Step 1: Write a failing test that accepts a deliberate zero and rejects out-of-range values**

Add focused assertions through the existing service instance:

```ts
const normalize = (ratings: Record<string, unknown>) =>
  (service as unknown as {
    normalizeTeacherEvaluationRatings: (
      type: 'teacher_class',
      values: Record<string, unknown>,
    ) => Record<string, number>;
  }).normalizeTeacherEvaluationRatings('teacher_class', ratings);

expect(normalize(validRatingsWithZero)).toEqual(validRatingsWithZero);
expect(() => normalize(ratingsWithMinusOne)).toThrow(BadRequestException);
expect(() => normalize(ratingsWithSix)).toThrow(BadRequestException);
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --runInBand src/modules/lxp/lxp.service.spec.ts -t "teacher evaluation rating"` from `backend/`.

Expected: the zero case fails with `must be an integer from 1 to 5`.

- [x] **Step 3: Widen the lower bound only**

Change `parsedValue < 1` to `parsedValue < 0` and the error copy to `integer from 0 to 5`.

- [x] **Step 4: Run focused tests and confirm GREEN**

Run the same command and expect all selected tests to pass.

### Task 2: Redesign the web evaluation workspace

**Files:**
- Modify: `next-frontend/src/components/student/evaluations/StudentTeacherEvaluationsPage.test.tsx`
- Modify: `next-frontend/src/components/student/evaluations/StudentTeacherEvaluationsPage.tsx`

**Interfaces:**
- Consumes: existing `lxpService` dashboard and mutation methods.
- Produces: `EVALUATION_RATING_SCALE` and a controlled `RatingScale` accepting `questionKey`, `value: number | null`, and `onChange`.

- [x] **Step 1: Add failing interaction tests**

Cover:

```ts
expect(screen.getByRole('radio', { name: /0 stars, Not observed/i })).toBeVisible();
expect(screen.getByRole('radio', { name: /5 stars, Excellent/i })).toBeVisible();
expect(screen.getByText('The behavior or result was not demonstrated.')).toBeVisible();
expect(screen.getByRole('button', { name: 'Submit Evaluation' })).toBeDisabled();
```

Submit both a teacher form and a system form with a deliberate 0 and assert exact payload keys.

- [x] **Step 2: Run the component suite and confirm RED**

Run: `npm test -- --runInBand src/components/student/evaluations/StudentTeacherEvaluationsPage.test.tsx` from `next-frontend/`.

Expected: semantic names/tooltips and the new layout markers are absent.

- [x] **Step 3: Implement the scale and responsive workspace**

Use six radio-like buttons with `aria-checked`, question-specific group labels, tooltip IDs, hover/focus tooltip panels, and a persistent selected-description region. Remove the fixed 19-rem rating column, 720-pixel table minimum, and 30-rem nested scroll. Use a wide bounded page, a slim inbox rail, and full-width flat question rows.

- [x] **Step 4: Confirm GREEN and keep current submission behavior**

Run the focused suite and inspect that zero is preserved through `Number(value)`, all questions are required, and failures retain local state.

### Task 3: Adapt mobile evaluation interaction to limited space

**Files:**
- Create: `mobile/src/screens/__tests__/student-evaluations.test.tsx`
- Modify: `mobile/src/screens/StudentEvaluationsScreen.tsx`

**Interfaces:**
- Consumes: `evaluationsApi`, `RoleHeaderNavigationButton`, current queries and theme tokens.
- Produces: a student-tab screen with list/form local states, nullable ratings, 3-by-2 touch rating choices, and identical semantic copy.

- [x] **Step 1: Write failing rendered tests**

Assert that the screen:

```ts
expect(renderedText).toContain('Not observed');
expect(renderedText).toContain('Excellent');
expect(mockSubmitEvaluation).not.toHaveBeenCalled(); // while incomplete
```

Then select every question including a 0, submit, and assert exact teacher/system payloads. Reject a mutation and assert the active form and selected meaning remain rendered.

- [x] **Step 2: Run the focused screen test and confirm RED**

Run: `npm test -- --runInBand src/screens/__tests__/student-evaluations.test.tsx` from `mobile/`.

Expected: current screen preselects 5, has no 0 choice, and uses a modal.

- [x] **Step 3: Implement the mobile list/form workspace**

Replace the modal with local screen state. Initialize each question to `null`; use 48-pixel-minimum buttons in two rows of three; show the exact selected label/meaning; disable submission until every backend key is answered; keep values on error. Use a hamburger in list mode and local Back while a form is open.

- [x] **Step 4: Run focused tests and confirm GREEN**

Run the new suite together with `src/api/__tests__/evaluations-api.test.ts`.

### Task 4: Promote Evaluations and categorize the student drawer

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/student-route-manifest.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/navigation/role-drawer-model.ts`
- Modify if required: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`
- Modify: `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Consumes: `MainTabParamList`, `studentTabRouteNames`, `ROLE_DRAWER_GROUPS`, `backBehavior="history"`.
- Produces: `MainTabs/StudentEvaluations` and drawer groups Learning, School life, Feedback.

- [x] **Step 1: Add failing route/group assertions**

```ts
expect(studentTabRouteNames).toContain('StudentEvaluations');
expect(ROLE_DRAWER_GROUPS.student.map(group => group.label)).toEqual([
  'Learning',
  'School life',
  'Feedback',
]);
expect(flattenRoleDrawerDestinations('student').filter(item => item.route === 'StudentEvaluations')).toHaveLength(1);
```

- [x] **Step 2: Run navigation suites and confirm RED**

Run the three named navigation/drawer suites.

- [x] **Step 3: Move route ownership into tabs**

Add the route to `MainTabParamList`, the student tab manifest/map/switch, and the Feedback drawer group. Remove the duplicate root type/screen. Keep Profile navigation targeting the sibling tab and retain tab history.

- [x] **Step 4: Run navigation suites and confirm GREEN**

Verify drawer ordering, single destination, Profile/footer/logout, typed route inventories, and tab history.

### Task 5: Verify all affected workspaces and browser behavior

**Files:**
- Update checkboxes in this plan only after each command passes.

- [x] **Step 1: Run focused backend/web/mobile suites**
- [x] **Step 2: Run backend lint, build, unit tests, and relevant LXP e2e coverage**
- [x] **Step 3: Run web lint, typecheck/test, and production build**
- [x] **Step 4: Run mobile typecheck and full tests**
- [x] **Step 5: Inspect web desktop/narrow interaction in a real browser and record any authentication limitation**

  The protected local route redirected to Sign In; the local backend was not running and no student credentials were available, so authenticated desktop/narrow visual acceptance remains unverified. Component interaction, responsive structure, and payload behavior are covered by the focused test suite and production build.
- [x] **Step 6: Review `git diff --check`, task-owned files, and the approved requirements one by one**

  Independent review found and the implementation now covers explicit web/mobile loading and retry states, keyboard-aware mobile form controls, static submitted-history semantics, radio arrow-key behavior, accessible rating meanings, draft retention, hardware Back, exact-key validation, and zero-inclusive summary averages.

### Task 6: Build and verify Android release

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Add: versioned release files under `next-frontend/public/downloads/android/`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`

- [x] **Step 1: Bump from `0.1.49`/50 to the next valid native version/build**
- [x] **Step 2: Build ARM64 release with explicit production `EXPO_PUBLIC_API_URL`**
- [x] **Step 3: Generate release metadata with truthful evaluation/drawer notes**
- [x] **Step 4: Run release tests/verifier and check package, version, ABI, signature, alignment, installer permission, API URL, size, and SHA-256**
- [x] **Step 5: Install/launch on an available emulator or device; report physical-device evidence separately**

  Build 51 is a 37,653,982-byte ARM64 APK for `com.nexora.lms.mobile` version `0.1.50`, signed by certificate SHA-256 `46cbcee985a7e0ecfda5a8fddfbdd679d9f0312ee07d96a593817302eb7c0a39`, aligned for 16 KB pages, and hashed as `6031caf0767f9300b78dbadfa9b084d53c24283e5b57183133f9d906f264dd24`. The production API occurs in the rebuilt bundle, installer permission is embedded, archive integrity passed, and release metadata binds the immutable artifact to source `da3238beb2c328dc3b9d87e61b04b5f385c231c6`. `adb devices -l` found no connected emulator or physical device, so install/launch and physical-device acceptance remain unverified rather than inferred.

### Task 7: Ship and observe the exact revision

**Files:**
- Stage only task-owned source, tests, plans, and release artifacts.

- [x] **Step 1: Fetch origin and verify no unexpected outgoing commits**
- [x] **Step 2: Review staged diff and commit on `developement`**
- [ ] **Step 3: Push and confirm local/upstream divergence is `0 0`**
- [ ] **Step 4: Identify and wait for CI run(s) matching the exact pushed SHA**
- [ ] **Step 5: Correlate Railway deployment to the tested SHA and verify provider success/health**
- [ ] **Step 6: Compare live manifest/APK bytes to repository artifacts and verify updater decisions for previous/current builds**
- [ ] **Step 7: Complete the goal only after the requirement-by-requirement audit has no missing evidence**
