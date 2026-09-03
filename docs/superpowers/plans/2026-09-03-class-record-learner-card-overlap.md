# Class Record Learner Card Overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent learner-name cards from expanding over grade columns or colliding with adjacent rows while preserving the sticky learner column.

**Architecture:** Keep table semantics on the learner `<th>` and move the badge/name composition into an inner grid wrapper. Constrain learner columns with responsive CSS variables and verify the real stylesheet in a credential-free Chromium fixture.

**Tech Stack:** Next.js 16, React 19, CSS Modules, Jest/Testing Library, Playwright Chromium.

## Global Constraints

- Do not change backend APIs, grading calculations, record ordering, permissions, or score mutations.
- Preserve sticky learner names and the existing surname-band colors.
- Comfortable rows remain at least 44px and compact rows remain at least 36px.
- Long names and status text must remain readable without enlarging the sticky column.
- Do not commit until all runnable verification gates pass and the browser geometry check proves the overlap is gone.

---

### Task 1: Add learner-card regression coverage

**Files:**
- Modify: `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.test.tsx`
- Create: `next-frontend/tests/e2e/teacher-class-record-learner-layout.spec.ts`

**Interfaces:**
- Consumes: the rendered `rowheader`, the `data-learner-card` marker, and `TeacherClassRecordWorkbook.module.css`.
- Produces: deterministic structural and browser-geometry regression coverage that does not require teacher credentials.

- [ ] **Step 1: Require the semantic inner learner card in the component test.**

  Assert that the learner rowheader contains `[data-learner-card]` and that the badge and identity are children of that wrapper.

- [ ] **Step 2: Run the focused component test and confirm RED.**

  Run: `npm test -- --runInBand src/components/teacher/class-record/TeacherClassRecordWorkbook.test.tsx`

  Expected: failure because the existing rowheader has no `[data-learner-card]` descendant.

- [ ] **Step 3: Add the credential-free Playwright geometry fixture.**

  Load the real CSS module into a minimal workbook/table fixture containing a long surname, given name, and eligibility message. At 768px and 520px viewports, assert that the learner cell stays within its responsive width, the badge and identity do not intersect, identity content stays inside the card, consecutive learner cells do not intersect vertically, and the table owns horizontal scrolling.

- [ ] **Step 4: Run the layout spec and confirm RED.**

  Run: `npx playwright test tests/e2e/teacher-class-record-learner-layout.spec.ts`

  Expected: failure because the current learner cell grows beyond its intended width or lacks the inner card.

### Task 2: Correct learner-cell layout and verify release readiness

**Files:**
- Modify: `next-frontend/src/components/teacher/class-record/TeacherClassRecordGradeGrid.tsx`
- Modify: `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.module.css`
- Modify: `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.test.tsx`
- Modify: `next-frontend/tests/e2e/teacher-class-record-workbook.spec.ts`

**Interfaces:**
- Consumes: existing `surnameBadge`, `learnerIdentity`, surname-band attributes, sticky table behavior, and density preferences.
- Produces: `[data-learner-card]` markup and bounded responsive learner-column geometry across workbook tabs.

- [ ] **Step 1: Add the inner learner-card wrapper.**

  Keep `className={styles.learnerCell}` on the `<th>`, then wrap its badge and identity spans in `<span className={styles.learnerCard} data-learner-card>`.

- [ ] **Step 2: Constrain the learner columns and make text reflow safely.**

  Define 260px and 240px normal learner widths on `.workbook`, reduce both to 220px below 560px, apply matching `width`, `min-width`, and `max-width` values to primary and secondary learner cells, move grid declarations from `.learnerCell` to `.learnerCard`, and allow identity lines to wrap with `overflow-wrap: anywhere`.

- [ ] **Step 3: Extend the authenticated regression.**

  Measure a body learner cell after replacing its supporting label with a long status. Assert that its width remains bounded and its inner learner card stays contained before checking the existing sticky and keyboard behavior.

- [ ] **Step 4: Run focused GREEN verification.**

  Run: `npm test -- --runInBand src/components/teacher/class-record`

  Run: `npx playwright test tests/e2e/teacher-class-record-learner-layout.spec.ts`

  Expected: all focused tests pass with no overlap in either viewport.

- [ ] **Step 5: Run full frontend gates.**

  Run: `npm test -- --runInBand`

  Run: `npm run typecheck`

  Run: `npm run lint`

  Run: `npm run build`

  Expected: every command exits successfully with zero test failures, type errors, lint errors, or build errors.

- [ ] **Step 6: Commit, push, and monitor exact revision.**

  Confirm `git diff --check`, review only the planned files, commit with `fix(frontend): prevent class record learner overlap`, push `developement`, verify `origin/developement` matches `HEAD`, and watch the exact GitHub CI and downstream Railway deployment runs to terminal success.
