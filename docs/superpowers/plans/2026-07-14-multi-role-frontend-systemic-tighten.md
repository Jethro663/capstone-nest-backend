# Multi-Role Frontend Systemic Tighten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Admin, Teacher, and Student critical web routes truthful async/RBAC behavior and a restrained, theme-safe visual hierarchy, then replace the baseline audit claims with fresh multi-role browser evidence.

**Architecture:** Keep page-owned service calls and response envelopes intact. Add one presentation-only dashboard state primitive, explicit local state machines per owning page or independent region, a non-destructive protected-layout role redirect, one bounded Academic State read-role change, and shared-shell/core-flow tightening inside existing role tokens. Do not introduce a generic fetching layer, a second design system, or a backend fix for Performance diagnostics.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind and `app/globals.css`, Jest and Testing Library, Playwright Chromium, NestJS 11 decorators and Jest, Docker Compose, Serena, role-frontend-auditor, and uncodixify `tighten` mode.

**Approved design:** `docs/superpowers/specs/2026-07-14-multi-role-frontend-systemic-tighten-design.md`

## Global Constraints

- Preserve the backend `success/message/data` envelopes and all existing frontend service wrappers.
- Never call `ai-service` from web code.
- Do not edit `backend/src/modules/performance/performance.service.ts`; its diagnostics upsert failure remains a separately owned backend residual.
- The only backend behavior change in this plan is Academic State authorization metadata: Admin and Teacher may read `current`; Admin alone retains preview and transition authority.
- Preserve the user-owned untracked files `SECURITY_HARDENING_ROADMAP.md` and `docs/CODEX_MASTER_MANUAL_PROMPT.md`.
- Stage only the exact files named by each task. Never use `git add .` in this dirty worktree.
- Keep all nine existing Student theme IDs; add no palette and remove no theme.
- Use existing role variables. Fixed values are allowed only as neutral fallbacks when no role token exists.
- Routine controls transition color, border, or opacity in 140–180 ms. Remove ordinary entrance translation and hover lift.
- Reserve pills for status and mutually exclusive controls. Do not add decorative eyebrows, icon chips, gradients, or filler metrics.
- Browser work is safe and reversible. Do not delete, archive, bulk-enroll, post grades, publish/finalize assessments, submit assessments, or transition academic state.
- Generated `next-frontend/playwright-report/`, `next-frontend/test-results/`, and `next-frontend/tests/e2e/.sessions/` are local evidence and must not be committed.
- Use `superpowers:test-driven-development` before implementation work in Tasks 1–13; the red test must be observed before its production change.
- Every behavior task follows red-green-refactor: add or change the focused test, run it and record the expected failure, implement the smallest owning change, rerun the focus set, then commit exact paths.
- Before every commit, run `git diff --check` and inspect `git diff --cached --stat`.

---

## Task 1: Replace Role-Mismatch Logout With a Session-Preserving Redirect

**Files:**

- Modify: `next-frontend/src/lib/dashboard-route-access.test.ts`
- Modify: `next-frontend/app/(dashboard)/layout.test.tsx`
- Modify: `next-frontend/app/(dashboard)/layout.tsx`

**Contracts:**

- Preserve `isDashboardRolePathAllowed(pathname, role)` as the render gate.
- Reuse `getDefaultDashboardRouteForRole(role)` for the redirect target.
- Use session marker `nexora.dashboard.roleMismatchNotice`.
- Foreign children must never render and `logoutAction` must never run.

- [ ] Expand the route helper test to cover every role-to-scope pairing, shared routes, unknown roles, and all role defaults.

```ts
const scopedPaths = {
  admin: '/dashboard/admin/users',
  teacher: '/dashboard/teacher/classes',
  student: '/dashboard/student/courses',
} as const;

for (const [role, ownPath] of Object.entries(scopedPaths)) {
  it(`${role} can open only its own scoped path`, () => {
    expect(isDashboardRolePathAllowed(ownPath, role)).toBe(true);
    for (const [otherRole, otherPath] of Object.entries(scopedPaths)) {
      if (otherRole === role) continue;
      expect(isDashboardRolePathAllowed(otherPath, role)).toBe(false);
    }
    expect(isDashboardRolePathAllowed('/dashboard/notifications', role)).toBe(true);
  });
}
```

- [ ] Replace the two logout expectations in `layout.test.tsx` with assertions for one redirect, one marker, hidden foreign content, no logout, and one neutral notice after the allowed route renders.

```ts
expect(screen.getByTestId('app-orbit-loader')).toBeInTheDocument();
expect(screen.queryByText('foreign content')).not.toBeInTheDocument();
await waitFor(() => {
  expect(replaceMock).toHaveBeenCalledWith('/dashboard/student');
});
expect(window.sessionStorage.getItem('nexora.dashboard.roleMismatchNotice')).toBe('pending');
expect(logoutActionMock).not.toHaveBeenCalled();
```

- [ ] Run the focused tests and confirm the new redirect assertions fail because the layout still calls `logoutAction('role-mismatch')`.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/lib/dashboard-route-access.test.ts' 'app/(dashboard)/layout.test.tsx'
```

Expected red result: the helper matrix passes, while layout tests report no `router.replace` call and an unexpected logout call.

- [ ] Implement a one-shot redirect and allowed-route notice in `layout.tsx`.

```ts
const ROLE_MISMATCH_NOTICE_KEY = 'nexora.dashboard.roleMismatchNotice';
const hasTriggeredMismatchRedirectRef = useRef(false);
const mismatchTarget = getDefaultDashboardRouteForRole(normalizedRole);

useEffect(() => {
  if (!shouldHandleRoleMismatch || hasTriggeredMismatchRedirectRef.current) return;
  hasTriggeredMismatchRedirectRef.current = true;
  window.sessionStorage.setItem(ROLE_MISMATCH_NOTICE_KEY, 'pending');
  router.replace(mismatchTarget);

  const fallback = window.setTimeout(() => {
    if (!isDashboardRolePathAllowed(window.location.pathname, normalizedRole)) {
      window.location.assign(mismatchTarget);
    }
  }, 750);

  return () => window.clearTimeout(fallback);
}, [mismatchTarget, normalizedRole, router, shouldHandleRoleMismatch]);

useEffect(() => {
  if (loading || shouldRedirect || shouldHandleRoleMismatch) return;
  if (window.sessionStorage.getItem(ROLE_MISMATCH_NOTICE_KEY) !== 'pending') return;
  window.sessionStorage.removeItem(ROLE_MISMATCH_NOTICE_KEY);
  toast.info('That page is not available for your account.');
}, [loading, shouldHandleRoleMismatch, shouldRedirect]);
```

- [ ] Remove the `logoutAction` import, add `toast`, import the role-default helper, and keep the loader branch unchanged.
- [ ] Rerun the focus set and confirm the redirect occurs exactly once and matching/shared routes still render.
- [ ] Commit only the three task files.

```bash
git add -- 'next-frontend/src/lib/dashboard-route-access.test.ts' 'next-frontend/app/(dashboard)/layout.test.tsx' 'next-frontend/app/(dashboard)/layout.tsx'
git commit -m "fix(frontend): preserve sessions on role mismatch"
```

---

## Task 2: Authorize Teacher Academic-State Reads and Make Quarter Verification Truthful

**Files:**

- Create: `backend/src/modules/academic-state/academic-state.controller.spec.ts`
- Modify: `backend/src/modules/academic-state/academic-state.controller.ts`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx`

**Contracts:**

- `GET /api/academic-state/current`: Admin and Teacher.
- `GET /api/academic-state/impact-preview`: Admin only.
- `POST /api/academic-state/transition`: Admin only.
- Quarter status: `loading | ready | error`.
- Draft saving may preserve the persisted quarter during an error. Publishing/releasing may not proceed until status is `ready`.

- [ ] Add controller metadata tests using the repository's `ROLES_KEY` pattern.

```ts
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AcademicStateController } from './academic-state.controller';

function method(name: keyof AcademicStateController) {
  return Object.getOwnPropertyDescriptor(AcademicStateController.prototype, name)?.value;
}

it('allows Admin and Teacher to read the current state', () => {
  expect(Reflect.getMetadata(ROLES_KEY, method('getCurrent'))).toEqual([
    RoleName.Admin,
    RoleName.Teacher,
  ]);
});

it('keeps preview and transition Admin-only', () => {
  expect(Reflect.getMetadata(ROLES_KEY, method('getImpactPreview'))).toEqual([RoleName.Admin]);
  expect(Reflect.getMetadata(ROLES_KEY, method('transition'))).toEqual([RoleName.Admin]);
});
```

- [ ] Add editor tests for loading, success, failure, retry, draft save, and blocked publish.

```ts
it('keeps quarter and publish controls unavailable until the system quarter is verified', async () => {
  let rejectQuarter!: (reason?: unknown) => void;
  mockedAcademicStateService.getCurrent.mockReturnValueOnce(
    new Promise<Awaited<ReturnType<typeof academicStateService.getCurrent>>>((_, reject) => {
      rejectQuarter = reject;
    }),
  );
  render(<AssessmentEditorPage />);
  expect(await screen.findByLabelText('Quarter')).toBeDisabled();
  expect(screen.getByRole('button', { name: /ready to give/i })).toBeDisabled();
  rejectQuarter(new Error('forbidden detail'));
  expect(await screen.findByText(/current quarter could not be verified/i)).toBeInTheDocument();
  expect(screen.queryByText('forbidden detail')).not.toBeInTheDocument();
});
```

- [ ] Run both focused suites and record the expected failures.

```bash
npm --prefix backend run test -- --runInBand --runTestsByPath src/modules/academic-state/academic-state.controller.spec.ts
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx'
```

Expected red result: controller methods have no method-level role metadata, and the editor enables quarter/publish controls after a failed read.

- [ ] Move role annotations from the controller class to the three methods.

```ts
@Get('current')
@Roles(RoleName.Admin, RoleName.Teacher)
async getCurrent() {
  const data = await this.academicStateService.getCurrentState();
  return { success: true, message: 'Current academic state retrieved', data };
}

@Get('impact-preview')
@Roles(RoleName.Admin)
async getImpactPreview(@Query() query: ImpactPreviewQueryDto) {
  const data = await this.academicStateService.getImpactPreview(query.schoolYear);
  return { success: true, message: 'Academic transition impact preview retrieved', data };
}

@Post('transition')
@Roles(RoleName.Admin)
async transition(@Body() dto: TransitionAcademicStateDto, @CurrentUser() user: any) {
  const actorId = user?.userId ?? user?.id;
  const data = await this.academicStateService.transition(dto, actorId);
  return { success: true, message: 'Academic state updated', data };
}
```

- [ ] Add the editor state machine and a retryable loader.

```ts
type AcademicQuarterStatus = 'loading' | 'ready' | 'error';

const [quarterStatus, setQuarterStatus] = useState<AcademicQuarterStatus>('loading');
const [lockedSystemQuarter, setLockedSystemQuarter] = useState<GradingPeriod | null>(null);

const loadCurrentAcademicQuarter = useCallback(async () => {
  setQuarterStatus('loading');
  try {
    const response = await academicStateService.getCurrent();
    const currentQuarter = response.data.quarter as GradingPeriod;
    setLockedSystemQuarter(currentQuarter);
    setQuarter(currentQuarter);
    setQuarterStatus('ready');
  } catch {
    setLockedSystemQuarter(null);
    setQuarterStatus('error');
  }
}, []);
```

- [ ] Disable every quarter selector when `isReadOnlyMode || quarterStatus !== 'ready'`. There are three active/legacy selector occurrences in the file; tests and source search must prove none retain `Boolean(lockedSystemQuarter)` as their only authority check.
- [ ] Disable `Ready to give` while verification is not ready. Disable `Save now` only when the selected availability is `given` and verification is not ready, so an existing draft may still save its persisted quarter.
- [ ] Add a safe inline failure panel with `Retry quarter check`; never render the caught object.
- [ ] Add an early `handleSave` guard for `availability === 'given' && quarterStatus !== 'ready'` before any update or release request.
- [ ] Rerun the two focus suites, then build the backend.

```bash
npm --prefix backend run build
```

- [ ] Commit the bounded backend and editor behavior together because they form one read contract.

```bash
git add -- 'backend/src/modules/academic-state/academic-state.controller.spec.ts' 'backend/src/modules/academic-state/academic-state.controller.ts' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx'
git commit -m "fix(academic-state): allow verified teacher quarter reads"
```

---

## Task 3: Add the Shared Safe Dashboard State and Error Surfaces

**Files:**

- Create: `next-frontend/src/components/layout/DashboardStatePanel.tsx`
- Create: `next-frontend/src/components/layout/DashboardStatePanel.test.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/error.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/error.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/add/error.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/add/error.test.tsx`
- Modify: `next-frontend/app/globals.css`

**Presentation contract:**

```ts
export type DashboardStateKind = 'error' | 'empty' | 'unavailable';

export type DashboardStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

export interface DashboardStatePanelProps {
  kind: DashboardStateKind;
  title: string;
  description: string;
  primaryAction?: DashboardStateAction;
  secondaryAction?: DashboardStateAction;
  className?: string;
}
```

- [ ] Write component tests for button actions, link actions, `aria-live="polite"` on failure/unavailable kinds, and no live announcement for a successful empty state.
- [ ] Write boundary tests that pass an error containing `relation student_concept_mastery does not exist`, click `Try again`, follow `Return to dashboard`, and assert the raw text is absent.
- [ ] Run the three new suites and confirm they fail because the components do not exist.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/components/layout/DashboardStatePanel.test.tsx' 'app/(dashboard)/dashboard/error.test.tsx' 'app/(dashboard)/dashboard/teacher/sections/[id]/students/add/error.test.tsx'
```

- [ ] Implement `DashboardStatePanel` as presentation only. Render a `Button` for `onClick` actions and a `Link` styled as a button for `href` actions. Do not accept an error object or fetch callback.

```tsx
<section
  className={cn('dashboard-state-panel', `dashboard-state-panel--${kind}`, className)}
  role={kind === 'empty' ? undefined : 'status'}
  aria-live={kind === 'empty' ? undefined : 'polite'}
>
  <h2>{title}</h2>
  <p>{description}</p>
  <div className="dashboard-state-panel__actions">
    {primaryAction ? <DashboardStateActionControl action={primaryAction} primary /> : null}
    {secondaryAction ? <DashboardStateActionControl action={secondaryAction} /> : null}
  </div>
</section>
```

- [ ] Implement the shared App Router boundary with safe fixed copy and no use of `error.message`, `error.stack`, or `error.digest`.

```tsx
'use client';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <DashboardStatePanel
      kind="error"
      title="We couldn't load this page"
      description="Try the page again. If the problem continues, return to your dashboard."
      primaryAction={{ label: 'Try again', onClick: reset }}
      secondaryAction={{ label: 'Return to dashboard', href: '/dashboard' }}
    />
  );
}
```

- [ ] Replace the Add Students boundary body with the same state panel and route-safe navigation.
- [ ] Add one global class family using role-token fallback chains for surface, border, text, accent, and focus. Use `rounded-xl`; no gradient, blur, large shadow, or icon chip.
- [ ] Rerun tests and confirm raw exception text is absent in both boundaries.
- [ ] Commit only the new primitive, boundaries, tests, and focused CSS.

```bash
git add -- 'next-frontend/src/components/layout/DashboardStatePanel.tsx' 'next-frontend/src/components/layout/DashboardStatePanel.test.tsx' 'next-frontend/app/(dashboard)/dashboard/error.tsx' 'next-frontend/app/(dashboard)/dashboard/error.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/add/error.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/add/error.test.tsx' 'next-frontend/app/globals.css'
git commit -m "feat(frontend): add safe dashboard state surfaces"
```

---

## Task 4: Separate Teacher List and Calendar Errors From Successful Empty Data

**Files:**

- Create: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx`

**Local state contract:**

```ts
type TeacherCollectionState = 'loading' | 'ready' | 'error' | 'partial';
```

- [ ] In each test file, characterize four outcomes: initial loading, owner request failure, successful zero records, and populated content. For Assessments and Lessons, add a two-class case in which one class request rejects and the other remains visible with a partial warning.
- [ ] For Calendar, test class-list failure separately from feed partial failure and successful zero scheduled items.

```ts
mockedClassService.getByTeacher.mockRejectedValueOnce(new Error('network detail'));
render(<TeacherAssessmentsPage />);
expect(await screen.findByText("Assessments couldn't be loaded")).toBeInTheDocument();
expect(screen.queryByText('No assessments yet')).not.toBeInTheDocument();
expect(screen.queryByText('network detail')).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /try again/i }));
expect(mockedClassService.getByTeacher).toHaveBeenCalledTimes(2);
```

- [ ] Run the new suites and record failures caused by rejected requests being converted to empty arrays.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/teacher/assessments/page.test.tsx' 'app/(dashboard)/dashboard/teacher/calendar/page.test.tsx' 'app/(dashboard)/dashboard/teacher/lessons/page.test.tsx'
```

- [ ] In Assessments and Lessons, keep previously valid collections during refresh, use `Promise.allSettled` for per-class fetches, and set:

  - `error` when the class owner request fails and no valid data exists;
  - `partial` when at least one per-class request fails and at least one succeeds;
  - `ready` only after successful ownership and collection requests.

- [ ] Render source-empty copy only when `state === 'ready' && source.length === 0`. Render filter-empty copy only when source records exist and the filtered list is empty.
- [ ] In Calendar, track `classState` and `feedState` independently. Use `Promise.allSettled` for assessments, announcements, and school events; preserve fulfilled regions and render `Some calendar items are temporarily unavailable` for partial data.
- [ ] Route retry buttons to the owning callback: class retry reloads classes; feed retry reloads only the selected school-year feed.
- [ ] Rerun the suites and ensure the safe failure copy is persistent, not toast-only.
- [ ] Commit the six page/test files.

```bash
git add -- 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx'
git commit -m "fix(teacher): distinguish collection errors from empty states"
```

---

## Task 5: Make Class Record State Truthful and Move the Workbook Forward

**Files:**

- Modify: `next-frontend/src/hooks/use-teacher-class-record.ts`
- Modify: `next-frontend/src/hooks/use-teacher-class-record.test.ts`
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx`
- Modify: `next-frontend/app/globals.css`

**Hook additions:**

```ts
type ClassRecordLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TeacherClassRecordState {
  recordsStatus: ClassRecordLoadStatus;
  spreadsheetStatus: ClassRecordLoadStatus;
  refresh: () => Promise<void>;
}
```

- [ ] Extend the hook tests to prove an initial record failure reports `error`, a spreadsheet failure reports its own `error`, and a failed refresh preserves the last valid `classRecords` and `spreadsheet`.
- [ ] Add page tests for class-list error, no assigned classes, no selected class, missing quarter record, populated workbook, refresh retry, and the compact structural hierarchy.

```ts
expect(screen.getByRole('heading', { name: 'Class Record' })).toBeInTheDocument();
expect(screen.queryByTestId('class-record-decorative-icon')).not.toBeInTheDocument();
expect(screen.getByRole('combobox', { name: /class/i })).toBeInTheDocument();
expect(screen.getByRole('region', { name: /class record workbook/i })).toBeInTheDocument();
```

- [ ] Run the hook and new page suite; confirm the hook exposes no status and the page reuses empty rendering after class-list rejection.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/hooks/use-teacher-class-record.test.ts' 'app/(dashboard)/dashboard/teacher/class-record/page.test.tsx'
```

- [ ] Add `recordsStatus` and `spreadsheetStatus`. Set loading only for an initial request with no truthful data. On refresh failure, retain the data and set the relevant status to `error`.
- [ ] Replace the three `motion.section` wrappers with semantic `header`, `section`, and workbook `section` elements.
- [ ] Remove the `FileSpreadsheet` decorative chip, dark hero, category badge row, entrance `y` transforms, and oversized duplicate class title.
- [ ] Compose one compact header/toolbar containing title, description, class selector, quarter segmented control, refresh, and export. Render category weights as a small `dl` or plain inline definitions.
- [ ] Put `TeacherClassRecordWorkbook` immediately after the toolbar and give its owning section `aria-label="Class record workbook"`.
- [ ] Use `DashboardStatePanel` for failed class list, no classes, no selection, and missing record; use `unavailable` above an existing workbook when a refresh fails.
- [ ] Rerun focused tests and confirm the workbook survives refresh failure.
- [ ] Commit the hook/page slice and focused global styles.

```bash
git add -- 'next-frontend/src/hooks/use-teacher-class-record.ts' 'next-frontend/src/hooks/use-teacher-class-record.test.ts' 'next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx' 'next-frontend/app/globals.css'
git commit -m "refactor(teacher): tighten class record workspace"
```

---

## Task 6: Scope Performance Diagnostics Failure Without Hiding Healthy Panels

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`

**Region contract:**

```ts
type DiagnosticsStatus = 'idle' | 'loading' | 'ready' | 'error';
```

- [ ] Add tests for rejected diagnostics, successful empty diagnostics, populated diagnostics, and targeted retry. In the rejection test, assert Priority Learners and summary data remain visible.

```ts
mockedPerformanceService.getClassDiagnostics.mockRejectedValueOnce(new Error('sql detail'));
render(<TeacherPerformancePage />);
expect(await screen.findByText('Diagnostics temporarily unavailable')).toBeInTheDocument();
expect(screen.getByText('Liam Navarro')).toBeInTheDocument();
expect(screen.queryByText('No concept focus areas yet')).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /retry diagnostics/i }));
expect(mockedPerformanceService.getClassSummary).toHaveBeenCalledTimes(1);
expect(mockedPerformanceService.getClassDiagnostics).toHaveBeenCalledTimes(2);
```

- [ ] Run the focused suite and confirm rejected diagnostics currently render the same zero-signal copy as a successful empty response.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/teacher/performance/page.test.tsx'
```

- [ ] Track diagnostics status independently inside the existing `Promise.allSettled` result handling. Reset it to `idle` when no class is selected.
- [ ] Add `retryDiagnostics()` that calls only `performanceService.getClassDiagnostics(selectedClassId)`, preserves healthy panels, and sets `loading`, `ready`, or `error` for that region.
- [ ] Render `DashboardStatePanel kind="unavailable"` with `Retry diagnostics` in both diagnostics-dependent views when status is `error`.
- [ ] Render `No concept focus areas yet` and `No assessment signals yet` only when status is `ready` and the successful arrays are empty.
- [ ] Keep the existing partial warning toast as supplemental feedback.
- [ ] Rerun the suite. Do not change or test the backend SQL in this task.
- [ ] Commit the focused page and test.

```bash
git add -- 'next-frontend/app/(dashboard)/dashboard/teacher/performance/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx'
git commit -m "fix(teacher): expose scoped diagnostics outages"
```

---

## Task 7: Give Student Dashboard, Announcements, Calendar, and Performance Explicit States

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/student/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/announcements/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/announcements/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/calendar/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/calendar/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/performance/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx`

**Local state contract:**

```ts
type StudentPageStatus = 'loading' | 'ready' | 'error' | 'partial';
```

- [ ] Add failure-vs-empty tests to each existing suite. Assert safe copy, retry ownership, and absence of raw exception text.
- [ ] Add partial tests to Dashboard and Calendar by rejecting only one independent feed while keeping successful class/content data visible.

```ts
mockedPerformanceService.getStudentOwnSummary.mockRejectedValueOnce(new Error('500 body'));
render(<StudentPerformancePage />);
expect(await screen.findByText("Performance couldn't be loaded")).toBeInTheDocument();
expect(screen.queryByText(/no class scores/i)).not.toBeInTheDocument();
expect(screen.queryByText('500 body')).not.toBeInTheDocument();
```

- [ ] Run the four focused suites and record that Dashboard, Announcements, and Calendar collapse failures to empty data; Performance's existing fallback must be tightened to persistent error/retry copy.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/student/page.test.tsx' 'app/(dashboard)/dashboard/student/announcements/page.test.tsx' 'app/(dashboard)/dashboard/student/calendar/page.test.tsx' 'app/(dashboard)/dashboard/student/performance/page.test.tsx'
```

- [ ] Dashboard: treat class ownership as the required request and use `Promise.allSettled` for lesson, assessment, announcement, school-event, and attempt feeds. Show a compact partial notice while keeping fulfilled sections.
- [ ] Announcements: use `Promise.allSettled` across enrolled classes. Distinguish `No posts yet` from `No announcements match these filters` and from a request failure.
- [ ] Calendar: track class-list and feed status separately, as in Teacher Calendar. Preserve successful event sources and retry only the failed feed set.
- [ ] Performance: add `status`, preserve the last valid summary on refresh failure, and render a state panel when no valid summary exists.
- [ ] Keep page-specific loaders and all existing service wrappers. Do not create a cross-page fetch hook.
- [ ] Rerun focused suites and confirm every rejected request has persistent, safe, retryable UI.
- [ ] Commit the eight files.

```bash
git add -- 'next-frontend/app/(dashboard)/dashboard/student/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/page.tsx' 'next-frontend/app/(dashboard)/dashboard/student/announcements/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/announcements/page.tsx' 'next-frontend/app/(dashboard)/dashboard/student/calendar/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/calendar/page.tsx' 'next-frontend/app/(dashboard)/dashboard/student/performance/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx'
git commit -m "fix(student): make critical route states explicit"
```

---

## Task 8: Preserve Student Class Detail During Partial Region Failures

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.modules-link.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx`

**Region model:**

```ts
type ClassRegion = 'modules' | 'assessments' | 'announcements' | 'calendar' | 'attempts';
type ClassPageStatus = 'loading' | 'ready' | 'error' | 'forbidden';
```

- [ ] Add tests for required class request failure, 403, successful class with no modules, one failed secondary region, and retry of failed regions without refetching the class owner request.
- [ ] Assert server-provided exception bodies are not rendered; use fixed safe copy for forbidden, not-found, and general errors.
- [ ] Run the focused suite and confirm secondary service rejections currently become indistinguishable empty arrays.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/student/classes/[id]/page.modules-link.test.tsx'
```

- [ ] Keep `classService.getById(classId)` as the required owner request. Convert the four secondary requests to `Promise.allSettled` and collect failed region keys without clearing fulfilled data.
- [ ] Add `retryFailedRegions()` that dispatches only the services named by the failure set and merges successful results back into current state.
- [ ] Show `Class content is partially unavailable` above the active class workspace when any secondary region fails.
- [ ] Keep per-tab successful-empty copy only for fulfilled regions. A failed Modules request must not say `0 modules available`.
- [ ] Render `DashboardStatePanel` for general class error and forbidden access, with `Back to Courses`; never pass the caught response message.
- [ ] Rerun the suite and commit the two files.

```bash
git add -- 'next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.modules-link.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx'
git commit -m "fix(student): retain class content through partial failures"
```

---

## Task 9: Restore and Characterize the Existing Nine-Theme Contract

**Root cause evidence:** `ThemeProvider.tsx` was changed in commit `5f974eb7` to force `DEFAULT_THEME` and filter `THEME_OPTIONS`; commit `10a9ad9b` retained a no-op setter. `themes.ts`, `StudentThemeSwitcher.tsx`, and `globals.css` still define nine themes. The provider is the failing boundary.

**Files:**

- Create: `next-frontend/src/providers/ThemeProvider.test.tsx`
- Modify: `next-frontend/src/providers/ThemeProvider.tsx`

- [ ] Add a provider consumer test that verifies nine options, storage restoration, setter behavior, root `data-theme`, and `data-student-route`.

```tsx
function ThemeProbe() {
  const { theme, themes, setTheme } = useTheme();
  return (
    <div>
      <span>{theme}</span>
      <span>{themes.length} themes</span>
      <button type="button" onClick={() => setTheme('soft-ocean')}>Use Soft Ocean</button>
    </div>
  );
}
```

- [ ] Run the focused test and confirm it reports one option and a no-op setter.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/providers/ThemeProvider.test.tsx'
```

- [ ] Restore state at the provider boundary with hydration-safe storage reading, `normalizeThemeId`, all `THEME_OPTIONS`, and a real setter.

```ts
const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

useEffect(() => {
  if (!isHydrated) return;
  setThemeState(normalizeThemeId(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? DEFAULT_THEME);
}, [isHydrated]);

const setTheme = useCallback((nextTheme: ThemeId) => {
  setThemeState(nextTheme);
}, []);

const value = useMemo<ThemeContextValue>(() => ({
  theme,
  resolvedTheme: getThemeDefinition(theme),
  themes: THEME_OPTIONS,
  isHydrated,
  setTheme,
}), [isHydrated, setTheme, theme]);
```

- [ ] Keep the existing effect as the single place that writes `document.documentElement.dataset.theme`, `dataset.studentRoute`, and local storage after hydration.
- [ ] Rerun the provider test. This task restores the existing contract only; do not add themes or redesign the switcher.
- [ ] Commit the provider and test.

```bash
git add -- 'next-frontend/src/providers/ThemeProvider.test.tsx' 'next-frontend/src/providers/ThemeProvider.tsx'
git commit -m "fix(student): restore persisted theme selection"
```

---

## Task 10: Tighten Shared Admin and Teacher Shells

**Files:**

- Create: `next-frontend/src/components/admin/AdminPageShell.test.tsx`
- Modify: `next-frontend/src/components/admin/AdminPageShell.tsx`
- Create: `next-frontend/src/components/teacher/TeacherPageShell.test.tsx`
- Modify: `next-frontend/src/components/teacher/TeacherPageShell.tsx`
- Modify: `next-frontend/app/globals.css`
- Modify targeted Admin call sites: `next-frontend/app/(dashboard)/dashboard/admin/page.tsx`, `users/page.tsx`, `classes/page.tsx`, `class-templates/page.tsx`, `diagnostics/page.tsx`, `system-settings/page.tsx`
- Modify targeted Teacher call sites: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx`, `lessons/page.tsx`, `performance/page.tsx`

- [ ] Add shared component tests proving the title is first-level content, default eyebrow text is absent, decorative header icons are absent, actions remain accessible, and stat icon props do not create decorative chips.
- [ ] Run both suites and record failures from the default badges and header icons.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/components/admin/AdminPageShell.test.tsx' 'src/components/teacher/TeacherPageShell.test.tsx'
```

- [ ] Remove automatic `Admin Workspace` and `Teacher Workspace` defaults. Keep `badge?: string` and Admin `icon?: LucideIcon` as compatibility props, but do not render a decorative icon. If an old badge remains, render it as quiet supporting context after the description.
- [ ] Remove the Teacher `BarChart3` import and icon block.
- [ ] Remove gradient layers and icon chips from `AdminStatCard` and `TeacherStatCard`; keep real labels, values, captions, and restrained semantic border accents.
- [ ] Change shared header/card radii to normal `rounded-lg`/`rounded-xl` equivalents, remove `teacher-figma-page` and `teacher-figma-stagger` entrance animation, and remove `teacher-panel-hover` translation.
- [ ] Keep focus rings and 140–180 ms border/color/opacity transitions.
- [ ] Remove `badge` and `icon` props from the listed targeted pages and clean only imports that become unused.
- [ ] Run both shared tests plus the existing Admin dashboard/users/classes/templates and Teacher Performance tests.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/components/admin/AdminPageShell.test.tsx' 'src/components/teacher/TeacherPageShell.test.tsx' 'app/(dashboard)/dashboard/admin/page.test.tsx' 'app/(dashboard)/dashboard/admin/users/page.test.tsx' 'app/(dashboard)/dashboard/admin/classes/[id]/page.test.tsx' 'app/(dashboard)/dashboard/admin/class-templates/page.test.tsx' 'app/(dashboard)/dashboard/teacher/performance/page.test.tsx'
```

- [ ] Commit the shell primitives, targeted call sites, tests, and focused CSS. Do not rewrite unrelated global style sections.

```bash
git add -- 'next-frontend/src/components/admin/AdminPageShell.test.tsx' 'next-frontend/src/components/admin/AdminPageShell.tsx' 'next-frontend/src/components/teacher/TeacherPageShell.test.tsx' 'next-frontend/src/components/teacher/TeacherPageShell.tsx' 'next-frontend/app/globals.css' 'next-frontend/app/(dashboard)/dashboard/admin/page.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/class-templates/page.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/diagnostics/page.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx'
git commit -m "refactor(frontend): tighten shared role shells"
```

---

## Task 11: Tighten the Teacher Assessment Editor Workbar

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/assessment-editor.css`

- [ ] Add structural tests for one direct title field, back action, grouped Preview/Draft/Ready/Save controls, visible warning text, quiet save/quarter metadata, and the first question before advanced panels in document order.
- [ ] Assert the editor contains no `Assessment name` eyebrow and no `Editable` decorative label.
- [ ] Run the focused suite and record the structural failures.
- [ ] Delete the unreachable `{false ? oldFlattenedLayout : activeEditor}` branch and render `buildContentBody` directly. Preserve dialogs, drawer, question actions, and all service calls.
- [ ] Recompose the sticky header into a compact two-zone workbar:

  - left: Back, title input, concise class/quarter context;
  - right: safe save state text, Preview, Draft/Ready control, Save now;
  - warning/help controls retain accessible labels;
  - quarter failure from Task 2 remains visible and retryable.

- [ ] Replace routine `font-black`, rounded-full action shells, colored save-state pill, and redundant icon framing in the workbar with moderate weights, plain metadata, and `rounded-lg`/`rounded-xl` controls.
- [ ] Reduce header/panel vertical padding so the first question begins earlier at desktop and mobile widths. Keep panel/drawer transitions because they explain state change.
- [ ] Keep keyboard order: Back, title, tool tabs, warning/help, Preview, availability, Save, then question content.
- [ ] Rerun the editor Jest suite and the existing Playwright editor spec.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx'
npm --prefix next-frontend run test:e2e -- tests/e2e/teacher-assessment-editor.spec.ts
```

Expected e2e condition: it may require the seeded runtime and credentials from Task 14; if unavailable now, record it as pending and run it there rather than weakening the test.

- [ ] Commit the editor page, test, and CSS.

```bash
git add -- 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/assessment-editor.css'
git commit -m "refactor(teacher): tighten assessment editor workbar"
```

---

## Task 12: Recompose Learners Path and Distinguish Source-Empty From Filter-Empty

**Files:**

- Modify: `next-frontend/src/components/student/lxp/StudentLxpExperience.test.tsx`
- Modify: `next-frontend/src/components/student/lxp/StudentLxpExperience.tsx`
- Create: `next-frontend/src/components/student/lxp/StudentLxpExperience.css`

- [ ] Extend tests for request error, zero eligible paths, filter-empty, populated data, deep-link actions, controlled AI outage, help, and compact semantic count definitions.

```ts
mockedLxpService.getEligibility.mockResolvedValueOnce({
  data: { paths: [], eligibleClasses: [] },
} as never);
render(<StudentLxpExperience />);
expect(await screen.findByText('No Learners Paths yet')).toBeInTheDocument();
expect(screen.queryByText('No paths match these filters')).not.toBeInTheDocument();
```

- [ ] Run the focused suite and confirm zero source paths currently use filter-empty copy.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/components/student/lxp/StudentLxpExperience.test.tsx'
```

- [ ] Import a focused component stylesheet and replace hard-coded header/control colors with existing `--student-*` variables.
- [ ] Remove redundant page background/padding, decorative eyebrow, three colored count pills, and the two explainer cards.
- [ ] Build one direct header followed by one responsive control row and a compact `dl` for Total, In progress, and Completed.
- [ ] Extract the existing mapped card section into a file-local `PathGrid`; it changes composition only and keeps the current card keys, course presentation helper, and open callback.

```tsx
function PathGrid({
  paths,
  onOpenPath,
}: {
  paths: LxpPathSummary[];
  onOpenPath: (classId: string) => void;
}) {
  return (
    <section className="student-lxp-grid">
      {paths.map((path, index) => {
        const choice = resolveStudentCoursePresentation(undefined, undefined, index);
        return (
          <PathCard
            key={`${path.classId}-${path.interventionCaseId ?? 'path'}`}
            path={path}
            heroStyle={toStudentHeroStyle(choice)}
            buttonTint={choice.buttonTint}
            onOpenPath={onOpenPath}
          />
        );
      })}
    </section>
  );
}
```

- [ ] Use `DashboardStatePanel` with these exact branches:

```tsx
{error ? (
  <DashboardStatePanel
    kind="error"
    title="Learners Paths couldn't be loaded"
    description="Try again to load your current support paths."
    primaryAction={{ label: 'Try again', onClick: () => void fetchPaths() }}
  />
) : loading ? (
  <PathListSkeleton />
) : paths.length === 0 ? (
  <DashboardStatePanel
    kind="empty"
    title="No Learners Paths yet"
    description="Your support paths will appear here when they become available."
  />
) : filteredPaths.length === 0 ? (
  <DashboardStatePanel
    kind="empty"
    title="No paths match these filters"
    description="Clear the search or choose another path status."
    primaryAction={{ label: 'Reset filters', onClick: resetFilters }}
  />
) : (
  <PathGrid paths={filteredPaths} onOpenPath={openPath} />
)}
```

- [ ] Preserve path-card data, keyboard navigation, route URLs, help guide, and AI outage location. Tighten card borders/radii and remove ordinary hover translation without changing card actions.
- [ ] Rerun the suite and ensure controlled AI outage does not replace path content.
- [ ] Commit the component, test, and focused CSS.

```bash
git add -- 'next-frontend/src/components/student/lxp/StudentLxpExperience.test.tsx' 'next-frontend/src/components/student/lxp/StudentLxpExperience.tsx' 'next-frontend/src/components/student/lxp/StudentLxpExperience.css'
git commit -m "refactor(student): tighten learners path workspace"
```

---

## Task 13: Tighten Student Lesson Detail and Add a Truthful Load Failure

**Files:**

- Create: `next-frontend/src/components/student/lesson/StudentLessonReaderPanel.test.tsx`
- Modify: `next-frontend/src/components/student/lesson/StudentLessonReaderPanel.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.structured.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.return-to.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/student-module-detail.css`
- Delete: `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/lesson-view.css`

- [ ] Add reader tests for direct title/course context, semantic metadata definitions, sparse content, completion state, attachments, and absence of the decorative `M1` chip/four metadata pills.
- [ ] Add page tests for load error/retry, not-found, preserved `returnTo`, and no raw service error.
- [ ] Run focused tests and confirm the page currently turns load failure into `Lesson not found.` and the reader renders decorative hero metadata.

```bash
npm --prefix next-frontend run test -- --runInBand --runTestsByPath 'src/components/student/lesson/StudentLessonReaderPanel.test.tsx' 'app/(dashboard)/dashboard/student/lessons/[id]/page.structured.test.tsx' 'app/(dashboard)/dashboard/student/lessons/[id]/page.return-to.test.tsx'
```

- [ ] Add `loadStatus: 'loading' | 'ready' | 'not-found' | 'error'`. Treat an explicit 404 as not-found and other rejection as error. Retry calls only `fetchData`.
- [ ] Use `DashboardStatePanel` for error and not-found, preserving `Back to Courses`/source navigation and safe copy.
- [ ] Replace the reader hero with direct title and course context. Render only available facts in a semantic `dl`: Module, Availability (`Draft` or `Available`), Required progress, and Overall progress. Do not invent duration data because the `Lesson` contract has none.
- [ ] Keep one primary reader surface, optional attachments, and completion footer. Sparse lessons should not gain filler panels.
- [ ] Convert the reader CSS subset to `--student-*` tokens, normal radii, solid surfaces, and 140–180 ms border/color transitions.
- [ ] Delete `lesson-view.css` after a repository search again proves it has no imports or class consumers.
- [ ] Rerun focused tests and existing lesson reader Playwright spec when the seeded runtime is available.
- [ ] Commit the reader/page/test/CSS slice and the confirmed unused file deletion.

```bash
git add -- 'next-frontend/src/components/student/lesson/StudentLessonReaderPanel.test.tsx' 'next-frontend/src/components/student/lesson/StudentLessonReaderPanel.tsx' 'next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.structured.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.return-to.test.tsx' 'next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.tsx' 'next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/student-module-detail.css' 'next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/lesson-view.css'
git commit -m "refactor(student): tighten lesson reading surface"
```

---

## Task 14: Run Full Static, Seeded Browser, Responsive, Theme, and Audit Verification

**Files:**

- Create: `next-frontend/tests/e2e/multi-role-systemic-tighten.spec.ts`
- Modify: `docs/testing/admin-frontend-audit.md`
- Modify: `docs/testing/admin-frontend-fix-plan.md`
- Modify: `docs/testing/teacher-frontend-audit.md`
- Modify: `docs/testing/teacher-frontend-fix-plan.md`
- Modify: `docs/testing/student-frontend-audit.md`
- Modify: `docs/testing/student-frontend-fix-plan.md`
- Modify: `docs/testing/multi-role-ui-ux-walkthrough.md`
- Temporary, never commit: `.nexora-ui-tighten.env`
- Temporary, never commit: `.nexora-ui-tighten.compose.yml`

### 14A. Static verification

- [ ] Inspect scripts immediately before lint. Confirm frontend lint is non-mutating (`eslint --max-warnings 5`) and do not run the backend mutating lint path.
- [ ] Run the targeted authorization spec, complete frontend Jest suite, frontend lint/build, and backend build.

```bash
npm --prefix backend run test -- --runInBand --runTestsByPath src/modules/academic-state/academic-state.controller.spec.ts
npm --prefix next-frontend run test -- --runInBand
npm --prefix next-frontend run lint
npm --prefix next-frontend run build
npm --prefix backend run build
```

Expected green result: all commands exit 0. If a pre-existing failure appears, capture the exact command/output, prove ownership, and do not relabel it as fixed.

- [ ] Run the route/app-shell boot smoke.

```bash
npm --prefix next-frontend run dev:smoke
```

### 14B. Playwright evidence spec

- [ ] Create `multi-role-systemic-tighten.spec.ts` using `loginAs`, `resolveTeacherAssessmentEditUrl`, and `resolveStudentLessonUrl` from the existing e2e helpers.
- [ ] Cover the 17 baseline routes:

  - Admin: dashboard, users, classes, class templates, diagnostics, system settings;
  - Teacher: classes, class record, assessments, seeded editor, interventions, performance;
  - Student: dashboard, courses, Learners Path, performance, seeded lesson.

- [ ] Add Teacher Calendar/Lessons and Student Announcements/Calendar/seeded class detail as state-surface spot checks.
- [ ] Derive the seeded class detail URL by opening Student Courses and reading the first visible link whose `href` starts with `/dashboard/student/classes/`; fail with a clear seed-fixture assertion if none exists.
- [ ] Capture `console.error`, uncaught page errors, and non-allowed failed responses. Allow only the documented Performance diagnostics 500 and controlled AI-unavailable responses; assert their persistent UI is present.
- [ ] Test one live foreign-role redirect per role:

  - Admin opens `/dashboard/student` and returns to `/dashboard/admin`;
  - Teacher opens `/dashboard/admin` and returns to `/dashboard/teacher/classes`;
  - Student opens `/dashboard/teacher/classes` and returns to `/dashboard/student`.

  In every case, assert foreign content is absent, the neutral notice appears once, and a subsequent valid API-backed page proves the session remains authenticated.

- [ ] Use Playwright request context to log in through `/api/auth/login`, then verify Teacher receives 200 and Student receives 403 from `/api/academic-state/current`. Do not call transition.
- [ ] At widths `390x844`, `768x1024`, and `1280x800`, assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1` on Class Record, Assessment Editor, Learners Path, and lesson detail. Tables may keep their own controlled overflow.
- [ ] For each of the nine IDs from `THEME_OPTIONS`, use the visible Student theme switcher, revisit Dashboard, Learners Path, and lesson detail, and assert `document.documentElement.dataset.theme` equals the selected ID and state-panel text remains visible.
- [ ] Use keyboard navigation for primary actions, filters, segmented controls, retry actions, and help. Assert visible focus on each changed core flow.

### 14C. Isolated runtime and command

- [ ] Use `apply_patch` to create `.nexora-ui-tighten.env` with disposable local-only values. Do not derive from or expose user secrets.

```dotenv
POSTGRES_PASSWORD=nexora_audit_local_20260714
BACKEND_DATABASE_URL=postgresql://postgres:nexora_audit_local_20260714@postgres:5432/capstone
AI_DATABASE_URL=postgresql+asyncpg://postgres:nexora_audit_local_20260714@postgres:5432/capstone
JWT_SECRET=nexora_audit_access_secret_20260714_only
JWT_REFRESH_SECRET=nexora_audit_refresh_secret_20260714_only
OTP_PEPPER=nexora_audit_otp_pepper_20260714_only
AI_SERVICE_SHARED_SECRET=nexora_audit_ai_shared_secret_20260714_only
RUN_DB_MIGRATIONS=true
RUN_DB_SEED=true
NEXT_PUBLIC_API_URL=http://127.0.0.1:3300
NEXT_PUBLIC_WS_URL=http://127.0.0.1:3300
FRONTEND_PORT=3301
```

- [ ] Use `apply_patch` to create `.nexora-ui-tighten.compose.yml`. Compose v5 supports `!override`, so the isolated project will not also claim the default ports.

```yaml
services:
  backend:
    ports: !override
      - "3300:3000"
    environment:
      CORS_ALLOWED_ORIGINS: http://127.0.0.1:3301,http://localhost:3301
      FRONTEND_URL: http://127.0.0.1:3301
      NEXT_FRONTEND_URL: http://127.0.0.1:3301
      AI_DEGRADED_ALLOWED: "true"
  frontend:
    build:
      args:
        NEXT_PUBLIC_API_URL: http://127.0.0.1:3300
        NEXT_PUBLIC_WS_URL: http://127.0.0.1:3300
    ports: !override
      - "3301:3001"
```

- [ ] Validate the merged config, then start only PostgreSQL, Redis, Backend, and Frontend. AI-service/Ollama remain intentionally absent so controlled AI-unavailable states are testable without downloading models.

```bash
docker compose --project-name nexora-ui-tighten-20260714 --env-file .nexora-ui-tighten.env -f docker-compose.yml -f .nexora-ui-tighten.compose.yml config --quiet
docker compose --project-name nexora-ui-tighten-20260714 --env-file .nexora-ui-tighten.env -f docker-compose.yml -f .nexora-ui-tighten.compose.yml up -d --build postgres redis backend frontend
docker compose --project-name nexora-ui-tighten-20260714 --env-file .nexora-ui-tighten.env -f docker-compose.yml -f .nexora-ui-tighten.compose.yml ps
curl --fail --retry 60 --retry-delay 2 http://127.0.0.1:3300/api/health/ready
curl --fail --retry 60 --retry-delay 2 http://127.0.0.1:3301/login
```

Expected result: Backend and Frontend are healthy at `3300/3301`, the disposable database is migrated and seeded, and AI-dependent pages report the controlled degraded state.

- [ ] Extract credentials with the auditor helper into a shell variable without printing them, then run the focused Playwright spec.

```bash
AUDIT_CREDS="$(python3 .agents/skills/role-frontend-auditor/scripts/extract_seed_credentials.py backend/seed-database.js)"
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3301 PLAYWRIGHT_API_ORIGIN=http://127.0.0.1:3300 PLAYWRIGHT_ADMIN_EMAIL="$(jq -r '.roles.admin.primary.email' <<<"$AUDIT_CREDS")" PLAYWRIGHT_ADMIN_PASSWORD="$(jq -r '.roles.admin.primary.password' <<<"$AUDIT_CREDS")" PLAYWRIGHT_TEACHER_EMAIL="$(jq -r '.roles.teacher.primary.email' <<<"$AUDIT_CREDS")" PLAYWRIGHT_TEACHER_PASSWORD="$(jq -r '.roles.teacher.primary.password' <<<"$AUDIT_CREDS")" PLAYWRIGHT_STUDENT_EMAIL="$(jq -r '.roles.student.primary.email' <<<"$AUDIT_CREDS")" PLAYWRIGHT_STUDENT_PASSWORD="$(jq -r '.roles.student.primary.password' <<<"$AUDIT_CREDS")" npm --prefix next-frontend run test:e2e -- tests/e2e/multi-role-systemic-tighten.spec.ts tests/e2e/teacher-assessment-editor.spec.ts tests/e2e/student-lesson-reader.spec.ts
unset AUDIT_CREDS
```

Expected result: safe flows pass; the known diagnostics request may remain HTTP 500 but must be explicitly allowed only when `Diagnostics temporarily unavailable` renders and its retry control remains usable.

- [ ] Tear down the disposable project and volumes even if the browser suite fails. Then delete both temporary files with `apply_patch` and verify they are absent.

```bash
docker compose --project-name nexora-ui-tighten-20260714 --env-file .nexora-ui-tighten.env -f docker-compose.yml -f .nexora-ui-tighten.compose.yml down -v --remove-orphans
test ! -e .nexora-ui-tighten.env
test ! -e .nexora-ui-tighten.compose.yml
```

### 14D. Evidence artifacts

- [ ] Build normalized role JSON payloads from the current source inventory and browser evidence with `role`, `routes`, `findings`, `skipped`, and `runMeta`. Every remaining finding must include route, action, symptom, evidence, owner, source, severity, repro, fix intent, and verification.
- [ ] Run the auditor renderer once for each role, then enrich the generated files with state tables, resolved findings, exact command results, browser widths, theme matrix, and residual ownership.

```bash
python3 .agents/skills/role-frontend-auditor/scripts/render_audit_report.py /tmp/nexora-admin-findings.json --output-dir docs/testing
python3 .agents/skills/role-frontend-auditor/scripts/render_audit_report.py /tmp/nexora-teacher-findings.json --output-dir docs/testing
python3 .agents/skills/role-frontend-auditor/scripts/render_audit_report.py /tmp/nexora-student-findings.json --output-dir docs/testing
```

- [ ] Update `multi-role-ui-ux-walkthrough.md` from proposed to shipped evidence. Include:

  - before/after hierarchy for shared shells, Class Record, Assessment Editor, Learners Path, and lesson detail;
  - all exact test/build/browser commands and outcomes;
  - the 17-route baseline plus added route spot checks;
  - role mismatch session-preservation results;
  - Teacher 200 and Student 403 Academic State runtime proof;
  - nine-theme and `390/768/1280` responsive results;
  - deliberately skipped destructive actions;
  - the Performance diagnostics SQL defect as an unresolved backend-owned residual unless separately fixed and verified.

- [ ] Search all seven artifacts for stale intent language (`proposed`, `pending approval`, `will implement`) and replace it only with evidence-supported shipped or residual status.
- [ ] Confirm the reports do not include passwords, access tokens, cookies, raw exception bodies, or generated report paths.
- [ ] Run final hygiene checks.

```bash
git diff --check
git status --short
rg -n "Pending approval|proposed state|will implement|CHANGE_ME|Bearer " docs/testing/admin-frontend-audit.md docs/testing/admin-frontend-fix-plan.md docs/testing/teacher-frontend-audit.md docs/testing/teacher-frontend-fix-plan.md docs/testing/student-frontend-audit.md docs/testing/student-frontend-fix-plan.md docs/testing/multi-role-ui-ux-walkthrough.md
```

Expected result: `rg` finds no stale intent or secret markers. `git status` still shows the two pre-existing user-owned untracked files untouched.

- [ ] Commit the e2e spec and seven verified documentation artifacts.

```bash
git add -- 'next-frontend/tests/e2e/multi-role-systemic-tighten.spec.ts' 'docs/testing/admin-frontend-audit.md' 'docs/testing/admin-frontend-fix-plan.md' 'docs/testing/teacher-frontend-audit.md' 'docs/testing/teacher-frontend-fix-plan.md' 'docs/testing/student-frontend-audit.md' 'docs/testing/student-frontend-fix-plan.md' 'docs/testing/multi-role-ui-ux-walkthrough.md'
git commit -m "test(frontend): verify multi-role systemic tighten"
```

---

## Completion Gate

- [ ] Re-run `git diff --check`, targeted backend authorization tests, full frontend Jest, frontend lint/build, backend build, dev smoke, and the focused multi-role Playwright suite from a clean runtime.
- [ ] Confirm there are no uncommitted implementation or evidence files except explicitly preserved user-owned files.
- [ ] Review the acceptance criteria in the approved design one by one and link each to a test, command result, or browser evidence row.
- [ ] Use `superpowers:verification-before-completion` before claiming the goal complete.
- [ ] Request code review with `superpowers:requesting-code-review` after all evidence is green or accurately documents the one backend-owned diagnostics residual.
- [ ] Mark the active goal complete only after the application changes, verification, and all seven artifacts are actually finished.
