# Student Assessment Results Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/dashboard/student/assessments/[id]/results/[attemptId]` into a neutral `results + next step` workspace that feels useful even when detailed review is locked.

**Architecture:** Keep the existing results data contract and AI mentor hooks, but restructure the route into summary, visibility, action, feedback, and review sections. Objective and file-upload results continue sharing the route, with file-upload using a different main review body.

**Tech Stack:** Next.js App Router, React, Jest, existing student primitives, LMS route-local styling.

---

### Task 1: Lock the new route-level structure with failing tests

**Files:**
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.test.tsx`
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders the new results + next step structure for score-only objective results', async () => {
  mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
    data: {
      score: 88,
      passed: true,
      isReturned: true,
      attemptNumber: 2,
      returnedAt: '2026-05-03T01:00:00.000Z',
      feedbackStatus: {
        level: 'immediate',
        unlocked: true,
        message: 'You can see your score. Detailed feedback not available for immediate assessments.',
      },
      assessment: {
        id: 'assessment-1',
        title: 'Practice Quiz',
        type: 'quiz',
        totalPoints: 10,
      },
      responses: [],
    },
  } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

  render(<StudentAssessmentResultsPage />);

  expect(await screen.findByText('What You Can See Now')).toBeInTheDocument();
  expect(screen.getByText('Next Step')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Go to Class Assignments/i })).toBeInTheDocument();
  expect(screen.queryByText('Question Review')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: FAIL because the current page does not render the new section structure.

- [ ] **Step 3: Write minimal implementation**

Update `page.tsx` to add:

- a neutral top summary block
- a `What You Can See Now` section
- a `Next Step` section with state-aware actions
- logic that only shows `Question Review` when review is actually available

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx" "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx"
git commit -m "feat: restructure student assessment results page"
```

### Task 2: Replace the old hero styling with neutral LMS route-local surfaces

**Files:**
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('does not use the old student-page wrapper for returned results', async () => {
  render(<StudentAssessmentResultsPage />);
  const oldShell = document.querySelector('.student-page');
  expect(oldShell).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: FAIL because the current route still renders the old shell.

- [ ] **Step 3: Write minimal implementation**

Replace the outer `student-page` shell with neutral route-local containers and section surfaces that match the updated LMS styling already used on newer student assessment pages.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx"
git commit -m "style: retheme student assessment results page"
```

### Task 3: Add file-upload-aware main review content

**Files:**
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.test.tsx`
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('shows rubric and submitted file sections for file upload results', async () => {
  mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
    data: {
      score: 92,
      passed: true,
      isReturned: true,
      attemptNumber: 1,
      teacherFeedback: 'Strong work overall.',
      assessment: {
        id: 'assessment-1',
        title: 'Upload Task',
        type: 'file_upload',
        totalPoints: 100,
        rubricCriteria: [
          { id: 'criterion-1', title: 'Accuracy', points: 50 },
        ],
      },
      rubricScores: [{ criterionId: 'criterion-1', pointsEarned: 46 }],
      submittedFiles: [
        {
          id: 'file-1',
          originalName: 'submission.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          uploadedAt: '2026-05-03T01:00:00.000Z',
        },
      ],
      responses: [],
    },
  } as Awaited<ReturnType<typeof assessmentService.getAttemptResults>>);

  render(<StudentAssessmentResultsPage />);

  expect(await screen.findByText('Rubric Breakdown')).toBeInTheDocument();
  expect(screen.getByText('Your Submission')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: FAIL because the current route does not elevate file-upload review content this way.

- [ ] **Step 3: Write minimal implementation**

Add a file-upload main content branch that prioritizes:

- rubric breakdown
- teacher feedback
- submitted files
- submission outcome text

Keep objective review separate.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx" "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx"
git commit -m "feat: add file upload review sections to student results"
```

### Task 4: Verify the route and close the change cleanly

**Files:**
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.tsx`
- Modify: `C:\Users\jethr\Desktop\capstone-nest-react-lms\next-frontend\app\(dashboard)\dashboard\student\assessments\[id]\results\[attemptId]\page.test.tsx`

- [ ] **Step 1: Run the focused test suite**

Run: `npx jest --runTestsByPath "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx" --runInBand`
Expected: PASS

- [ ] **Step 2: Run exact-file lint**

Run: `npx eslint --no-warn-ignored "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx" "app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx"`
Expected: no errors

- [ ] **Step 3: Run frontend build**

Run: `npm run build`
Expected: production build succeeds

- [ ] **Step 4: Run diff hygiene**

Run: `git diff --check`
Expected: no whitespace or patch formatting issues

- [ ] **Step 5: Commit**

```bash
git add "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx" "next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.test.tsx"
git commit -m "test: verify redesigned student assessment results page"
```
