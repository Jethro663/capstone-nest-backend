# Teacher Frontend Fix Plan

## Summary

- Target role: `teacher`
- Issues to address: `2`
- This plan is derived from the latest audit evidence and stops before code changes.

## Issues

### 1. Teacher dashboard links to a missing assessments index route

- Owner: `frontend`
- Source area: `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx and missing next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx`
- Problem: The teacher dashboard exposes an assessments entry point, but the target route returns a 404 and lands on the not-found page instead of an assessments list.
- Fix intent: Either implement the teacher assessments index page at the linked route or change the dashboard CTA to point to an existing teacher assessment surface.
- Verification: Open `/dashboard/teacher` and confirm `View assessments` lands on a valid teacher assessments page without a 404 response.

### 2. Teacher dashboard links to a missing lessons index route

- Owner: `frontend`
- Source area: `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx and missing next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx`
- Problem: The teacher dashboard advertises a lessons entry point, but the linked route returns a 404 and does not provide a teacher lessons index.
- Fix intent: Either implement the teacher lessons index page at the linked route or retarget the dashboard CTA to an existing teacher lesson-management page.
- Verification: Open `/dashboard/teacher` and confirm `View lessons` lands on a valid teacher lessons page without a 404 response.

