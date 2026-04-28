# Learners Path Demo Readiness Report

Date: 2026-04-24  
Status: Conditionally demo-ready

## Verdict

The Learners Path slice is now strong enough for a capstone defense demo.

It is not just a page redesign:

- template-based classes now auto-index source material
- intervention recommendations are more correct
- student and teacher pages are less brittle
- the product wording now uses `Learners Path` instead of `LXP` on the primary user-facing surfaces

## What is now working

### Backend and AI contract

- New template-based teacher classes trigger indexing automatically.
- Learners Path eligibility sorts active cases more predictably.
- Teacher assignment now blocks assessment retries unless the student has a real failed submitted attempt.
- AI remedial recommendations now pull cleaner evidence and avoid raw HTML-heavy weak-concept output.
- The AI service reuses the improved intervention context and index-readiness logic.

### Student workflow

- Learners Path loads as a real guided recovery workspace.
- The embedded JA Hub now stays on the selected class instead of drifting to another class.
- The standalone JA Hub route also loads cleanly.
- Replay completion correctly moves intervention progress forward.

### Teacher workflow

- Teacher intervention detail can be opened directly even when the case has fallen out of the queue snapshot.
- Teacher-side recommendations align better with actual failed work.

### Naming and presentation

- Sidebar label is now `Learners Path`.
- Major student-facing Learners Path copy uses the new name.
- Evaluation module filters now expose `Learners Path` instead of `LXP`.
- The public demo page also uses `Learners Path`.

## Live Verification Performed

### Automated checks

- `next-frontend`: `npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/interventions/[caseId]/page.test.tsx"` passed
- `next-frontend`: `npm test -- StudentLxpExperience.test.tsx` passed
- `next-frontend`: `npm run build` passed
- `backend`: `npm test -- lxp.service.spec.ts` passed
- `ai-service`: `python -m unittest ai-service.tests.test_remedial_service` passed

### Browser checks

Verified live with seeded accounts using repo Playwright automation:

- `student71@lms.local`
  - `/dashboard/student/lxp`
  - `/dashboard/student/ja`
- `teacher1@lms.local`
  - `/dashboard/teacher/interventions/1b6c590a-b6a2-4fb7-a45a-f1f4cf7231f8?classId=b154d6f7-ec2e-46b1-b6e3-e790039cb14d`

Observed browser results:

- Learners Path page rendered cleanly and displayed the embedded JA Hub with the correct class selection.
- Standalone JA Hub rendered cleanly and matched the same class context.
- Teacher intervention detail no longer showed the broken empty-state message for the completed case route.

## Main Fixes Landed

### Core flow integrity

- Auto-index on template-based class creation
- Failed-attempt-only retry assignment
- Cleaner weak-focus summaries from lesson content
- Better Learners Path naming across student-facing UI

### UX fixes

- Learners Path redesign
- JA Hub redesign
- Embedded JA class-selection fix
- Teacher intervention deep-link recovery

## Remaining Risk List

These are not release blockers for the defense demo, but they are the next things I would tighten.

### 1. Completed intervention view is functional, but not fully celebratory

The teacher detail route now loads instead of failing, but the completed-case experience still looks like an idle workspace rather than a dedicated completion summary.

### 2. Old seeded intervention data is still present

`student71` still has an older seeded active case on another class, so the student-facing Learners Path defaults there once the new demo case is fully completed.

### 3. Playwright MCP was unavailable in-session

The MCP transport was closed, so browser verification used the repo Playwright runtime instead. This did not block proof of functionality, but it is worth noting for future audits.

### 4. Local environment alignment still matters

This local verification depended on the backend pointing at the refreshed AI service on port `8010`. If another machine is used, env alignment must be checked first.

## Recommended Defense Story

Use the product name `Learners Path`, not `LXP`.

Suggested story:

1. A teacher clones a template-based class with ready-made lessons and assessments.
2. The class content is indexed automatically in the background.
3. A struggling student falls below the threshold and is flagged for intervention.
4. The teacher reviews an AI-supported recovery plan grounded on failed work and class lessons.
5. The student opens Learners Path, sees assigned steps, and works through JA Hub review.
6. Completion updates the intervention case and shows measurable progress.

## Files Most Relevant To The Fixes

- `backend/src/modules/classes/classes.controller.ts`
- `backend/src/modules/classes/classes.module.ts`
- `backend/src/modules/lxp/lxp.service.ts`
- `ai-service/app/remedial_service.py`
- `next-frontend/src/components/student/lxp/StudentLxpExperience.tsx`
- `next-frontend/src/components/student/ja/StudentJaWorkspace.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/lxp/lxp-emboss.css`
- `next-frontend/app/(dashboard)/dashboard/student/ja/ja-hub.css`
- `next-frontend/app/(dashboard)/dashboard/teacher/interventions/[caseId]/page.tsx`

## Defense-Ready Bottom Line

If you need a clear answer: yes, Learners Path is now in a state you can present.

It has a more coherent student experience, a less misleading teacher workflow, better AI recommendation hygiene, verified build-and-test coverage on the touched contract, and real seeded-account browser proof.
