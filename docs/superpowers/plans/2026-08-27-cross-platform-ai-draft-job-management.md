# Cross-Platform AI Draft Job Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one server-backed teacher quiz-generation job history shared by the web class Assignments tab and mobile Assessments tab, with meaningful titles, accessible status colors, selected-job resume, and non-cascading deletion.

**Architecture:** Add a read-only NestJS summary endpoint over the existing AI job, latest output, and linked assessment data. Both clients consume it; local storage remains only for remembering the current draft. The existing ownership-checked delete endpoint soft-cancels jobs and never deletes the linked assessment.

**Tech Stack:** NestJS 11, Drizzle/PostgreSQL, class-validator, Next.js 16/React 19, Jest/Testing Library, Expo 54/React Native 0.81, TanStack Query.

## Global Constraints

- Preserve the backend `success/message/data` envelope.
- Web and mobile call backend `/api` contracts and never call `ai-service` directly.
- Do not add or alter a database schema or migration.
- Always scope the list to `currentUser.id`; never accept a caller-supplied teacher ID.
- Deleting a job must never call an assessment delete API or remove its linked assessment.
- Default lists exclude `cancelled` jobs.
- Status meaning uses text plus a dot/icon and color; color alone is insufficient.
- Use amber `pending`, blue `processing`, violet `completed`, green `approved`, red `failed`, rose `rejected`, and gray `cancelled`.
- Preserve unrelated dirty files `next-frontend/app/page.tsx` and `next-frontend/app.json`.

---

### Task 1: Backend Teacher Job Summary Contract

**Files:**
- Create: `backend/src/modules/ai-mentor/DTO/list-teacher-ai-jobs-query.dto.ts`
- Create: `backend/src/modules/ai-mentor/teacher-ai-job-query.service.ts`
- Create: `backend/src/modules/ai-mentor/teacher-ai-job-query.service.spec.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`

**Interfaces:**
- Consumes: existing `DatabaseService`, `ai_generation_jobs`, `ai_generation_outputs`, `assessments`, and authenticated user ID.
- Produces: `TeacherAiJobQueryService.listTeacherJobs(userId, query)` and `GET /api/ai/teacher/jobs`.

- [ ] **Step 1: Write failing DTO and query-service tests**

Cover:

```ts
it('uses the generated title and terminal progress', async () => {
  mockDb.execute.mockResolvedValue({ rows: [approvedRow] });

  await expect(service.listTeacherJobs(TEACHER_ID, {
    classId: CLASS_ID,
    jobType: 'quiz_generation',
    limit: 6,
  })).resolves.toEqual([
    expect.objectContaining({
      jobId: JOB_ID,
      title: 'Generated fractions quiz',
      status: 'approved',
      progressPercent: 100,
      assessmentId: ASSESSMENT_ID,
    }),
  ]);
});

it('falls back through requested title to AI Draft Quiz', async () => {
  mockDb.execute.mockResolvedValue({ rows: [rowWithoutOutputTitle] });
  const [job] = await service.listTeacherJobs(TEACHER_ID, { limit: 20 });
  expect(job.title).toBe('Requested title');

  mockDb.execute.mockResolvedValue({ rows: [rowWithoutEitherTitle] });
  const [fallback] = await service.listTeacherJobs(TEACHER_ID, { limit: 20 });
  expect(fallback.title).toBe('AI Draft Quiz');
});
```

Validate `limit=51` and an invalid class UUID with `plainToInstance` plus `validate`.

- [ ] **Step 2: Run RED**

```bash
cd backend
npm test -- teacher-ai-job-query.service.spec.ts --runInBand
```

Expected: FAIL because the DTO and service do not exist.

- [ ] **Step 3: Implement the DTO**

```ts
export class ListTeacherAiJobsQueryDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsIn(['quiz_generation'])
  jobType: 'quiz_generation' = 'quiz_generation';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
```

- [ ] **Step 4: Implement the query service**

Export the exact summary:

```ts
export interface TeacherAiJobSummary {
  jobId: string;
  jobType: string;
  classId: string | null;
  title: string;
  status: AiGenerationStatus;
  progressPercent: number;
  statusMessage: string | null;
  errorMessage: string | null;
  outputId: string | null;
  assessmentId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Use one parameterized Drizzle `sql` query:

- Filter `teacher_id = userId`, `job_type = quiz_generation`, and `status <> cancelled`.
- Add the class predicate only when `query.classId` exists.
- Use a lateral subquery ordered by output `created_at DESC LIMIT 1`.
- Use a lateral assessment lookup by `ai_generation_output_id`.
- Order jobs by `updated_at DESC, created_at DESC` and apply the validated limit.
- Resolve title from `structured_output.title`, then `source_filters.title`, then `AI Draft Quiz`.
- Clamp numeric or string runtime progress; terminal statuses return 100, pending defaults to 5, processing to 60.
- Return ISO timestamps and explicit nulls.

- [ ] **Step 5: Verify service GREEN**

```bash
cd backend
npm test -- teacher-ai-job-query.service.spec.ts --runInBand
```

- [ ] **Step 6: Write the failing controller delegation test**

Mock `TeacherAiJobQueryService`, call `controller.listTeacherJobs(query, TEACHER_USER)`, and expect:

```ts
{
  success: true,
  message: 'Teacher AI generation jobs retrieved',
  data: summaries,
}
```

Also assert delegation uses `TEACHER_USER.id`, not an input teacher ID.

- [ ] **Step 7: Run controller RED**

```bash
cd backend
npm test -- ai-mentor.controller.spec.ts --runInBand
```

- [ ] **Step 8: Add the static route and provider**

Add before the parameterized status route:

```ts
@Get('teacher/jobs')
@Roles(RoleName.Teacher, RoleName.Admin)
@ApiOperation({ summary: 'List recent AI generation jobs owned by the current teacher' })
async listTeacherJobs(
  @Query() query: ListTeacherAiJobsQueryDto,
  @CurrentUser() user: { id: string; email: string; roles: string[] },
) {
  return {
    success: true,
    message: 'Teacher AI generation jobs retrieved',
    data: await this.teacherAiJobQueryService.listTeacherJobs(user.id, query),
  };
}
```

Inject and register `TeacherAiJobQueryService`. Add its mock provider to the controller test module.

- [ ] **Step 9: Verify and commit**

```bash
cd backend
npm test -- teacher-ai-job-query.service.spec.ts ai-mentor.controller.spec.ts --runInBand
npm run build
cd ..
git add backend/src/modules/ai-mentor
git commit -m "feat(ai): add teacher generation job summaries"
```

---

### Task 2: Web Job Summary Client

**Files:**
- Modify: `next-frontend/src/types/ai.ts`
- Modify: `next-frontend/src/services/ai-service.ts`
- Modify: `next-frontend/src/services/__tests__/ai-service.test.ts`

**Interfaces:**
- Consumes: backend `TeacherAiJobSummary[]` envelope.
- Produces: `aiService.listTeacherJobs(query)`.

- [ ] **Step 1: Write failing list-service test**

```ts
const result = await aiService.listTeacherJobs({ classId: 'class-1', limit: 6 });

expect(mockedApi.get).toHaveBeenCalledWith('/ai/teacher/jobs', {
  params: { classId: 'class-1', jobType: 'quiz_generation', limit: 6 },
});
expect(result.data[0]).toMatchObject({
  title: 'Generated fractions quiz',
  status: 'approved',
});
```

Mock the complete documented summary structure.

- [ ] **Step 2: Run RED**

```bash
cd next-frontend
npm test -- src/services/__tests__/ai-service.test.ts --runInBand
```

- [ ] **Step 3: Add summary/query types and normalization**

Add `TeacherAiJobSummary` with the exact backend fields and `ListTeacherAiJobsQuery` with optional `classId` and `limit`. Normalize malformed status to `processing`, clamp progress, use `AI Draft Quiz` for an absent title, and normalize nullable fields to `null`.

Implement:

```ts
async listTeacherJobs(query: ListTeacherAiJobsQuery = {}) {
  const params = {
    ...(query.classId ? { classId: query.classId } : {}),
    jobType: 'quiz_generation',
    limit: query.limit ?? 20,
  };
  const { data } = await api.get('/ai/teacher/jobs', { params });
  const envelope = normalizeEnvelope<unknown>(data);
  return {
    ...envelope,
    data: Array.isArray(envelope.data)
      ? envelope.data.map(normalizeTeacherAiJobSummary)
      : [],
  };
}
```

- [ ] **Step 4: Verify and commit**

```bash
cd next-frontend
npm test -- src/services/__tests__/ai-service.test.ts --runInBand
cd ..
git add next-frontend/src/types/ai.ts next-frontend/src/services/ai-service.ts next-frontend/src/services/__tests__/ai-service.test.ts
git commit -m "feat(web): add teacher AI job list client"
```

---

### Task 3: Web AI Draft Jobs Panel and Class Integration

**Files:**
- Create: `next-frontend/src/components/teacher/assessment/AiDraftJobsPanel.tsx`
- Create: `next-frontend/src/components/teacher/assessment/AiDraftJobsPanel.test.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.ai-draft-jobs.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/workspace.css`

**Interfaces:**
- Consumes: `TeacherAiJobSummary[]`, class ID, refresh and delete callbacks.
- Produces: an accessible panel that never uses UUID as the primary label.

- [ ] **Step 1: Write failing component tests**

Assert:

```tsx
expect(screen.getByText('Generated fractions quiz')).toBeInTheDocument();
expect(screen.queryByText('job-uuid-1')).not.toBeInTheDocument();
expect(screen.getByText('Approved')).toHaveAttribute('data-status', 'approved');
expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute(
  'href',
  '/dashboard/teacher/classes/class-1/ai-draft?jobId=job-uuid-1',
);
expect(screen.getByRole('link', { name: 'Open Assessment' })).toHaveAttribute(
  'href',
  '/dashboard/teacher/assessments/assessment-1/edit',
);
```

Cover all seven labels, conditional Open Assessment, active and approved confirmation copy, and rejected delete preserving the row.

- [ ] **Step 2: Run RED**

```bash
cd next-frontend
npm test -- src/components/teacher/assessment/AiDraftJobsPanel.test.tsx --runInBand
```

- [ ] **Step 3: Implement the panel**

Use an exhaustive `satisfies Record<AiGenerationStatus, ...>` mapping. Use `ConfirmationDialog` with danger tone.

- Active copy: `This will cancel generation and remove the job from the list.`
- Approved copy: `This removes the AI job entry. The approved assessment and its student records will remain.`

Use solid rows, restrained borders, visible status dots, `data-status`, keyboard focus, and no transforms or decorative effects.

- [ ] **Step 4: Verify component GREEN**

Run the component test again and expect zero failures.

- [ ] **Step 5: Write the failing class-page integration test**

Prove:

- `aiService.listTeacherJobs({ classId, limit: 6 })` supplies the panel.
- A 10-second interval exists only for pending/processing rows while Assignments is active.
- Delete calls only `aiService.deleteTeacherJob`, then refreshes.
- `assessmentService.delete` is not called by job deletion.
- A list failure leaves normal assignment content visible.

- [ ] **Step 6: Replace local-history reads**

Change the class page to `TeacherAiJobSummary[]`. Fetch the server list once per refresh. Remove local tracker reads/writes from this panel flow. Add inline error, per-row delete state, success/error toast, and active-only polling. Render `AiDraftJobsPanel` in the existing AI Draft Jobs position.

- [ ] **Step 7: Verify and commit**

```bash
cd next-frontend
npm test -- src/components/teacher/assessment/AiDraftJobsPanel.test.tsx app/'(dashboard)'/dashboard/teacher/classes/'[id]'/page.ai-draft-jobs.test.tsx --runInBand
npm run lint
cd ..
git add next-frontend/src/components/teacher/assessment next-frontend/app/'(dashboard)'/dashboard/teacher/classes/'[id]'/page.tsx next-frontend/app/'(dashboard)'/dashboard/teacher/classes/'[id]'/workspace.css next-frontend/app/'(dashboard)'/dashboard/teacher/classes/'[id]'/page.ai-draft-jobs.test.tsx
git commit -m "feat(web): manage AI draft jobs from class assignments"
```

---

### Task 4: Web Selected-Job Resume

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx`

**Interfaces:**
- Consumes: optional `jobId` URL query.
- Produces: selected-job hydration using existing status/result APIs.

- [ ] **Step 1: Add the failing query-selection test**

Mock `useSearchParams().get('jobId')` as `job-from-mobile`. Assert the page calls `getTeacherJobStatus('job-from-mobile')` rather than selecting the first cached job.

- [ ] **Step 2: Run RED**

```bash
cd next-frontend
npm test -- app/'(dashboard)'/dashboard/teacher/classes/'[id]'/ai-draft/page.test.tsx --runInBand
```

- [ ] **Step 3: Implement route priority**

Read `requestedJobId` from `useSearchParams`. Initialize the current job with `requestedJobId ?? cached[0]?.jobId ?? null`. Keep existing ownership validation, result loading, and compatibility tracker merge.

- [ ] **Step 4: Verify and commit**

Run the same test, then commit the two route files with message `feat(web): resume selected AI draft jobs`.

---

### Task 5: Mobile Job API, Query, and Compatibility Cleanup

**Files:**
- Modify: `mobile/src/types/ai.ts`
- Modify: `mobile/src/api/services/ai.ts`
- Modify: `mobile/src/api/__tests__/ai-api.test.ts`
- Modify: `mobile/src/api/hooks.ts`
- Modify: `mobile/src/api/teacher-ai-draft-jobs.ts`
- Modify: `mobile/src/api/__tests__/teacher-ai-draft-jobs.test.ts`

**Interfaces:**
- Consumes: backend list endpoint.
- Produces: `aiApi.listTeacherJobs`, `useTeacherAiJobs`, `queryKeys.teacherAiJobs`, and matching-ID cleanup.

- [ ] **Step 1: Write failing API and storage tests**

Assert:

```ts
expect(mockedApiClient.get).toHaveBeenCalledWith('/ai/teacher/jobs', {
  params: { jobType: 'quiz_generation', limit: 20 },
});
```

Assert `clearTeacherAiDraftJobIdIfMatches` clears only when the stored ID equals the requested deleted ID.

- [ ] **Step 2: Run RED**

```bash
cd mobile
npm test -- src/api/__tests__/ai-api.test.ts src/api/__tests__/teacher-ai-draft-jobs.test.ts --runInBand
```

- [ ] **Step 3: Implement API, hook, and cleanup**

Add the exact summary type and safe normalizer. Add `queryKeys.teacherAiJobs(limit)`. Add:

```ts
export const useTeacherAiJobs = (limit = 20) => useQuery({
  queryKey: queryKeys.teacherAiJobs(limit),
  queryFn: () => aiApi.listTeacherJobs({ limit }),
  refetchInterval: (query) =>
    query.state.data?.some((job) =>
      job.status === 'pending' || job.status === 'processing',
    ) ? 10_000 : false,
});
```

Implement matching cleanup by reading first and calling the existing clear helper only on equality.

- [ ] **Step 4: Verify and commit**

```bash
cd mobile
npm test -- src/api/__tests__/ai-api.test.ts src/api/__tests__/teacher-ai-draft-jobs.test.ts --runInBand
npm run typecheck
cd ..
git add mobile/src/types/ai.ts mobile/src/api
git commit -m "feat(mobile): add teacher AI job history query"
```

---

### Task 6: Mobile Cross-Class Panel

**Files:**
- Create: `mobile/src/screens/teacher-assessments/ai-job-presentation.ts`
- Create: `mobile/src/screens/teacher-assessments/TeacherAiDraftJobsPanel.tsx`
- Create: `mobile/src/screens/__tests__/teacher-ai-jobs-panel.test.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentsScreen.tsx`

**Interfaces:**
- Consumes: job summaries, teacher classes, query state, and navigation callbacks.
- Produces: non-blocking cross-class AI Draft Jobs panel above assessment classes.

- [ ] **Step 1: Write failing model and panel tests**

Test all seven labels/tones, title/class/status rendering, Resume with both IDs, conditional Open Assessment, Delete, loading, empty, and retry error states.

- [ ] **Step 2: Run RED**

```bash
cd mobile
npm test -- src/screens/__tests__/teacher-ai-jobs-panel.test.tsx --runInBand
```

- [ ] **Step 3: Implement the presentation model and panel**

Return exact labels and tones from a pure exhaustive mapping. Use `teacherTheme` compatibility colors and solid containers. Rows show title, class label, dot/text status, rounded progress, and relative time. Do not add KPI cards, gradients, glass effects, or motion styling.

Panel callbacks receive the full job object for Resume, Open Assessment, and Delete.

- [ ] **Step 4: Verify panel GREEN**

Run the panel test again.

- [ ] **Step 5: Write failing Assessments integration coverage**

Prove AI query failure still renders `Classes with assessments`, pull-to-refresh refetches AI jobs, Resume navigates with both IDs, Open Assessment uses the editor, and job deletion never calls `assessmentsApi.delete`.

- [ ] **Step 6: Integrate query, panel, and deletion**

Call `useTeacherAiJobs(20)`. Derive class labels from `classesQuery.data`. Render before `Classes with assessments`. Add per-job deletion state and `TeacherConfirmModal`. On confirm call `aiApi.deleteTeacherJob`, matching-ID cleanup, and job-query refetch. Include AI refetch in pull-to-refresh. Never gate existing assessment content on AI state.

- [ ] **Step 7: Verify and commit**

```bash
cd mobile
npm test -- src/screens/__tests__/teacher-ai-jobs-panel.test.tsx src/screens/__tests__/teacher-mobile-render.test.tsx --runInBand
npm run typecheck
cd ..
git add mobile/src/screens/teacher-assessments mobile/src/screens/TeacherAssessmentsScreen.tsx mobile/src/screens/__tests__/teacher-ai-jobs-panel.test.tsx
git commit -m "feat(mobile): show cross-class AI draft jobs"
```

---

### Task 7: Mobile Selected-Job Resume

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-ai-draft.test.tsx`

**Interfaces:**
- Consumes: `TeacherAiDraft: { classId: string; jobId?: string }`.
- Produces: restoration of web-created jobs and persistence as the active compatibility ID.

- [ ] **Step 1: Write failing route-priority test**

Render with `jobId: web-job-1`, mock storage as `mobile-job-old`, and assert status/result load `web-job-1` and storage is updated to `web-job-1`.

- [ ] **Step 2: Run RED**

```bash
cd mobile
npm test -- src/screens/__tests__/teacher-ai-draft.test.tsx --runInBand
```

- [ ] **Step 3: Implement route priority**

Use:

```ts
const { classId, jobId: requestedJobId } = route.params;
const jobId = requestedJobId ?? await readTeacherAiDraftJobId(classId);
const restored = await aiApi.getTeacherJobStatus(jobId);
setJob(restored);
await writeTeacherAiDraftJobId(classId, restored.id);
```

Load result for completed/approved status and include `requestedJobId` in effect dependencies.

- [ ] **Step 4: Verify and commit**

Run the mobile AI draft test and typecheck; commit with `feat(mobile): resume server-backed AI draft jobs`.

---

### Task 8: Cross-Surface Verification and Completion Audit

**Files:**
- Verify all files changed by Tasks 1-7.

**Interfaces:**
- Consumes: completed backend, web, and mobile changes.
- Produces: fresh evidence for every success criterion.

- [ ] **Step 1: Run targeted behavior suites**

```bash
cd backend
npm test -- teacher-ai-job-query.service.spec.ts ai-mentor.controller.spec.ts --runInBand
cd ../next-frontend
npm test -- src/services/__tests__/ai-service.test.ts src/components/teacher/assessment/AiDraftJobsPanel.test.tsx app/'(dashboard)'/dashboard/teacher/classes/'[id]'/page.ai-draft-jobs.test.tsx app/'(dashboard)'/dashboard/teacher/classes/'[id]'/ai-draft/page.test.tsx --runInBand
cd ../mobile
npm test -- src/api/__tests__/ai-api.test.ts src/api/__tests__/teacher-ai-draft-jobs.test.ts src/screens/__tests__/teacher-ai-jobs-panel.test.tsx src/screens/__tests__/teacher-ai-draft.test.tsx --runInBand
```

- [ ] **Step 2: Run subsystem verification**

```bash
cd backend && npm run lint && npm run build
cd ../next-frontend && npm run lint && npm run build
cd ../mobile && npm run typecheck && npm run test -- --runInBand
```

- [ ] **Step 3: Audit deletion and wiring**

```bash
rg -n "listTeacherJobs|TeacherAiJobSummary|data-status|clearTeacherAiDraftJobIdIfMatches" backend next-frontend mobile
rg -n "assessmentService\.delete|assessmentsApi\.delete" next-frontend/src/components/teacher/assessment/AiDraftJobsPanel.tsx mobile/src/screens/teacher-assessments mobile/src/screens/TeacherAssessmentsScreen.tsx
git diff --check
git status --short
```

The second search must show no assessment deletion from the AI job list flow.

- [ ] **Step 4: Perform runtime interaction checks when services are available**

Web:

- Open `/dashboard/teacher/classes/db115c25-abe4-4d1a-b417-88ae33090eb5?view=assignments`.
- Confirm title replaces UUID, statuses have text/dot/color, Resume selects the intended job, and approved deletion preserves assessment.

Mobile:

- Open teacher Assessments in Expo.
- Confirm a web-created job appears, Resume opens it, Open Assessment routes correctly, and AI list error/refresh does not block assessments.

- [ ] **Step 5: Complete requirement audit**

Re-read the design success criteria and pair each with test/runtime evidence. Any discovered correction starts with a failing regression test, followed by implementation and repeated verification.

