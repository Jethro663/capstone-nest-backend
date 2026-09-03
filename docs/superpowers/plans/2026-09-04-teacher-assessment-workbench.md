# Teacher Assessment Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lifecycle-aware teacher assessment workbench that prioritizes actionable student status, avoids false zero analytics, and keeps grading and score release readable and responsive.

**Architecture:** Keep all backend contracts unchanged. The route owns settled multi-request loading and active-view navigation; a new focused `AssessmentOverview` owns derived lifecycle presentation and progressive analytics; the existing review and score components retain their domain behavior while adopting the shared workbench language and responsive layout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Jest 30, Testing Library, Radix UI primitives, Tailwind 4, route CSS.

## Global Constraints

- Scope is `next-frontend/` plus these design and plan documents; do not change backend, mobile, or AI contracts.
- Preserve the existing assessment, submissions, statistics, analytics, attempt review, grading, score release, preview, and Excel export APIs.
- Use `Overview`, `Review & grade`, and `Scores` as the primary view labels.
- Use `Release score` and `Released` consistently in visible UI while retaining backend method names.
- Missing response data must render as `No performance data yet`, never as a real zero score.
- Use calm solid surfaces, navy text, Nexora red for the primary action, semantic text-backed statuses, 8 to 10 pixel radii, at least 14 pixel supporting text, and no staggered routine motion.
- Work test-first and preserve unrelated worktree changes.

---

### Task 1: Lifecycle-aware assessment overview

**Files:**
- Create: `next-frontend/src/components/teacher/assessment/assessment-overview.test.tsx`
- Create: `next-frontend/src/components/teacher/assessment/assessment-overview.tsx`

**Interfaces:**
- Consumes: `Assessment`, `AssessmentStats | null`, `QuestionAnalyticsResponse | null`, and `SubmissionsResponse | null` from `@/types/assessment`.
- Produces: `AssessmentOverview` with callbacks `onOpenReview(): void` and `onOpenScores(): void`, plus exported pure `getAssessmentOverviewState()` for lifecycle characterization.

- [x] **Step 1: Write failing overview tests**

Create tests that render a draft with zero submissions and assert that `Draft — students cannot see this assessment`, `Continue setup`, `No performance data yet`, and the four operational counts appear while `0% average score` does not. Add a published fixture with turned-in work and assert that `2 submissions need review`, `Review submissions`, the submitted count, real average/pass-rate values, and the question-insights disclosure appear.

```tsx
render(
  <AssessmentOverview
    assessment={draftAssessment}
    submissions={emptySubmissions}
    stats={emptyStats}
    analytics={emptyAnalytics}
    onOpenReview={onOpenReview}
    onOpenScores={onOpenScores}
  />,
);
expect(screen.getByText(/students cannot see/i)).toBeInTheDocument();
expect(screen.getByText('No performance data yet')).toBeInTheDocument();
expect(screen.queryByText('0% average score')).not.toBeInTheDocument();
```

- [x] **Step 2: Verify the tests fail for the missing component**

Run: `npm run test -- --runInBand src/components/teacher/assessment/assessment-overview.test.tsx`

Expected: FAIL because `assessment-overview.tsx` does not exist.

- [x] **Step 3: Implement the minimal overview and state derivation**

Implement the lifecycle callout, operational-count grid, ordered student worklist, conditional class performance, and a native `<details>` question-insights section. Use real response counts to decide whether performance exists.

```ts
export function getAssessmentOverviewState(
  assessment: Assessment,
  submissions: SubmissionsResponse | null,
) {
  const summary = submissions?.summary;
  const submitted = (summary?.turnedIn ?? 0) + (summary?.returned ?? 0);
  if (!assessment.isPublished) return { stage: 'draft', submitted } as const;
  if (submitted === 0) return { stage: 'waiting', submitted } as const;
  if ((summary?.turnedIn ?? 0) > 0) return { stage: 'review', submitted } as const;
  return { stage: 'released', submitted } as const;
}
```

- [x] **Step 4: Verify overview tests pass**

Run: `npm run test -- --runInBand src/components/teacher/assessment/assessment-overview.test.tsx`

Expected: PASS with the draft no-data and active-review behaviors covered.

### Task 2: Resilient workbench route and navigation

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/assessment-detail.css`

**Interfaces:**
- Consumes: `AssessmentOverview` from Task 1 and the existing `ReviewTab` and `PostScoresTab`.
- Produces: one assessment header, three primary views, partial-request warning with Retry, initial critical-error state, and background refresh callbacks.

- [x] **Step 1: Write failing route tests**

Mock the four assessment service methods and child workbench components. Assert that the route has one `Back to assignments` link and tabs named Overview, Review & grade, and Scores. Add a partial failure test where analytics rejects but assessment and submissions resolve; assert that the title remains visible with `Some assessment information is unavailable` and a Retry button. Add a background-refresh test that clicks the mocked child refresh callback and asserts the full-page skeleton does not replace the title.

```tsx
mockedAssessmentService.getQuestionAnalytics.mockRejectedValueOnce(
  new Error('analytics unavailable'),
);
render(<TeacherAssessmentDetailPage />);
await screen.findByRole('heading', { name: draftAssessment.title });
expect(screen.getByText('Some assessment information is unavailable')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
```

- [x] **Step 2: Verify route tests fail against the old page**

Run: `npm run test -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/page.test.tsx'`

Expected: FAIL because the old route has duplicate Back controls, old tab labels, and all-or-nothing loading.

- [x] **Step 3: Implement settled loading and workbench structure**

Replace `Promise.all` with `Promise.allSettled`, treat assessment identity as critical, retain fulfilled optional sections, collect optional section failures, and distinguish initial loading from background refresh. Replace the decorative hero with the workbench header and wire the new tabs.

```ts
const results = await Promise.allSettled([
  assessmentService.getById(assessmentId),
  assessmentService.getSubmissions(assessmentId),
  assessmentService.getStats(assessmentId),
  assessmentService.getQuestionAnalytics(assessmentId),
]);
if (results[0].status === 'rejected') {
  setLoadError('We could not load this assessment.');
  return;
}
setAssessment(results[0].value.data);
```

Use `void fetchData('background')` from grading and score callbacks so mutation refreshes preserve the active workspace.

- [x] **Step 4: Replace route styling with the shared workbench language**

Define the header, lifecycle badge, tabs, inline warning, operational cards, worklist, performance, question disclosure, empty state, and responsive rules in `assessment-detail.css`. Set supporting text to at least 14 pixels and primary controls to at least 40 pixels. Avoid decorative gradients, oversized pills, and transform animation.

- [x] **Step 5: Verify route and overview tests pass together**

Run: `npm run test -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/page.test.tsx' src/components/teacher/assessment/assessment-overview.test.tsx`

Expected: PASS with zero failures.

### Task 3: Responsive review and consistent score-release language

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/_components/review-tab.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/_components/review-tab.tsx`
- Modify: `next-frontend/src/components/teacher/assessment/post-scores-tab.test.tsx`
- Modify: `next-frontend/src/components/teacher/assessment/post-scores-tab.tsx`

**Interfaces:**
- Consumes: unchanged `ReviewTabProps` and `PostScoresTabProps`.
- Produces: accessible learner search, non-animated responsive review layout, and consistent `Awaiting release`, `Released`, and `Release selected` copy.

- [x] **Step 1: Write the failing review accessibility test**

Render `ReviewTab` with one submitted learner while mocking `getAttemptResults`. Assert that `Search students` is discoverable by label, the learner button is present without relying on motion, and the released/pending status copy uses the new terminology.

```tsx
await screen.findByRole('searchbox', { name: 'Search students' });
expect(screen.getByRole('button', { name: /Cruz, Ana/i })).toBeInTheDocument();
expect(screen.getByText('Awaiting release')).toBeInTheDocument();
```

- [x] **Step 2: Verify the review test fails against the old component**

Run: `npm run test -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/_components/review-tab.test.tsx'`

Expected: FAIL because the search input has no label and the old copy says `Pending Score` or `Posted`.

- [x] **Step 3: Implement responsive layout and copy changes**

Replace the fixed flex wrapper with a one-column grid that becomes `18rem minmax(0,1fr)` at the large breakpoint. Replace `motion.button` learner rows with normal buttons, add an explicit label, enlarge supporting text from 11 pixels to 12 or 14 pixels, and replace visible `Return Grade`/`Posted` wording with `Release score`/`Released`. Keep API calls and state transitions unchanged.

- [x] **Step 4: Update the score roster language**

Rename the visible filter copy to All students, Awaiting release, Released, and No submission. Rename `Post Selected` to `Release selected`, `Pick` to `Select`, `Score State` to `Status`, and the confirmation copy to explain that selected scores become visible immediately. Do not change `bulkReturnGrades` or exported column contracts.

- [x] **Step 5: Verify focused review and score tests**

Run: `npm run test -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/_components/review-tab.test.tsx' src/components/teacher/assessment/post-scores-tab.test.tsx`

Expected: PASS with existing score posting behaviors preserved and new review accessibility assertions green.

### Task 4: Remove drift and add browser regression coverage

**Files:**
- Delete: `next-frontend/src/components/teacher/assessment/responses-tab.tsx`
- Delete: `next-frontend/src/components/teacher/assessment/review-tab.tsx`
- Delete: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/_components/responses-tab.tsx`
- Delete: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/_components/post-scores-tab.tsx`
- Create: `next-frontend/tests/e2e/teacher-assessment-workbench.spec.ts`
- Modify: `next-frontend/tests/e2e/helpers/seeded-routes.ts`

**Interfaces:**
- Consumes: existing seeded teacher authentication and assessment discovery helpers.
- Produces: `resolveTeacherAssessmentDetailUrl()` and a browser regression for hierarchy, keyboard access, and contained overflow.

- [x] **Step 1: Confirm obsolete component references are gone**

Run: `rg -n "responses-tab|ResponsesTab" next-frontend --glob '!node_modules/**' --glob '!.next/**'`

Expected: no live imports or symbol references outside the two obsolete files.

- [x] **Step 2: Delete obsolete detail components**

Remove both unused response implementations, the unused shared review implementation, and the redundant route-local score re-export after confirming there are no live imports.

- [x] **Step 3: Add seeded detail-route discovery and the browser test**

Derive the detail route from the existing assessment discovery call and allow `PLAYWRIGHT_TEACHER_ASSESSMENT_DETAIL_URL` override. The Playwright test logs in as teacher, skips only when credentials or seeded assessment data are unavailable, opens desktop and tablet viewports, and asserts one Back link, Overview/Review & grade/Scores tabs, readable minimum essential text, keyboard focus, and no document overflow.

```ts
const detailUrl = await resolveTeacherAssessmentDetailUrl();
await page.goto(detailUrl!);
await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
await page.getByRole('tab', { name: 'Review & grade' }).focus();
await expect(page.getByRole('tab', { name: 'Review & grade' })).toBeFocused();
```

- [x] **Step 4: Run all assessment-workbench tests**

Run: `npm run test -- --runInBand assessment-overview page.test review-tab post-scores`

Expected: all matching suites pass with zero failures.

### Task 5: Full verification and exact-commit delivery

**Files:**
- Review: all files listed in Tasks 1 through 4.

**Interfaces:**
- Produces: verified commit on `developement`, pushed without unrelated files, with exact GitHub Actions status checked to terminal completion.

- [x] **Step 1: Run static and unit gates**

Run from `next-frontend/`:

```bash
npm run typecheck
npm run lint
npm run test -- --runInBand
npm run build
```

Expected: every command exits 0; Jest reports zero failed suites and tests.

- [x] **Step 2: Run runtime-oriented checks**

Run `npm run dev:smoke`, wait for the explicit `[dev-smoke] OK` result, and then stop the development server. Run `npm run test:e2e -- tests/e2e/teacher-assessment-workbench.spec.ts`; a credential-based skip must be reported as missing live coverage, not as a runtime pass.

Expected: dev smoke reports HTTP 200 when its backend health dependency is available; the focused browser test passes when seeded credentials and services are available.

- [x] **Step 3: Review scope and diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- docs/superpowers/specs/2026-09-04-teacher-assessment-workbench-design.md docs/superpowers/plans/2026-09-04-teacher-assessment-workbench.md next-frontend/app/\(dashboard\)/dashboard/teacher/assessments/\[id\] next-frontend/src/components/teacher/assessment next-frontend/tests/e2e/helpers/seeded-routes.ts next-frontend/tests/e2e/teacher-assessment-workbench.spec.ts
```

Expected: only reviewed assessment-workbench and documentation paths are changed; `git diff --check` is silent.

- [ ] **Step 4: Commit the reviewed scope**

Stage only the files listed in this plan and commit:

```bash
git commit -m "feat(frontend): redesign teacher assessment workbench"
```

Expected: one new commit containing the complete verified workbench change.

- [ ] **Step 5: Recheck divergence and push**

Run `git fetch origin` followed by `git rev-list --left-right --count origin/developement...HEAD`.

Expected before push: `0 1`. Push with `git push origin developement`, then verify the divergence is `0 0` and the remote branch resolves to the local commit SHA.

- [ ] **Step 6: Watch exact-commit workflows and deployment logs**

Use GitHub CLI to list runs for the pushed SHA, watch every relevant workflow to terminal completion, and inspect failed logs rather than relying on branch-level status.

```bash
gh run list --commit "$(git rev-parse HEAD)" --json databaseId,name,status,conclusion,url
gh run watch <run-id> --exit-status
```

Expected: all required runs for the exact pushed commit reach `completed` with `success`. If deployment or CI fails, inspect `gh run view <run-id> --log-failed`, fix in scope, rerun verification, commit, push, and watch the new exact SHA.
