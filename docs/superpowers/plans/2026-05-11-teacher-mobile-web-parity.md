# Teacher Mobile Web Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `test-mobile/` teacher functionality to practical 1:1 feature parity with the current Next.js teacher web surface before any push, without touching unrelated subsystems.

**Architecture:** Keep the mobile app as a React Native client over the existing NestJS API contracts. Add mobile route coverage, missing teacher screens, service wrappers, and focused parity tests. Reuse current teacher mobile primitives and service styles instead of redesigning the app.

**Tech Stack:** Expo React Native, React Navigation, TypeScript, Jest Testing Library, existing mobile API client, existing NestJS teacher endpoints.

---

## Web Teacher Surface To Match

- `/dashboard/teacher` redirects to classes.
- `/dashboard/teacher/classes` and `/classes/[id]`: class list, class workspace tabs, modules, assessments, announcements, extraction board, discussion, class record, calendar, student roster.
- `/classes/[id]/ai-draft`: AI assessment draft source selection, index status/reindex, draft job creation/status/result, job deletion, open generated assessment editor.
- `/classes/[id]/modules/[moduleId]`: module sections/items, lesson and assessment navigation, file items, module item state.
- `/classes/[id]/modules/[moduleId]/files/[fileId]`: teacher file detail/edit actions.
- `/classes/[id]/students/add` and `/classes/[id]/students/[studentId]`: class student add flow and student overview.
- `/dashboard/teacher/sections`, `/sections/[id]/roster`, `/sections/[id]/students/add`, `/sections/[id]/students/[studentId]`: section list, roster, schedule, add students, student profile.
- `/dashboard/teacher/assessments`, `/assessments/[id]`, `/assessments/[id]/edit`, `/assessments/[id]/results/[attemptId]`: assessment list/detail/editor, review responses, post scores, attempt result detail.
- `/dashboard/teacher/lessons`, `/lessons/[id]/view`, `/lessons/[id]/edit`: lesson browse/view/edit/publish.
- `/dashboard/teacher/library`, `/calendar`, `/announcements`, `/class-record`, `/performance`, `/interventions`, `/interventions/[caseId]`, `/evaluations`, `/reports`, `/profile`, `/extractions/[id]`.

## Implementation Checklist

- [x] Add a teacher parity manifest that maps every web teacher route family to an owned mobile route or screen.
- [x] Add tests that fail when a mapped web teacher surface has no registered mobile route or implementation screen.
- [x] Extend teacher navigation types and stack registration for missing deep teacher surfaces only.
- [x] Implement teacher class student overview and add-student flows using existing class/section roster contracts.
- [x] Implement section student profile and strengthen section add-student/remove-student parity.
- [x] Implement teacher extraction detail review/apply/edit actions on mobile.
- [x] Implement teacher module file detail/open/download/update actions on mobile.
- [x] Implement teacher AI draft workflow on mobile: source status, reindex, generation job, job result navigation, and deletion.
- [x] Close assessment parity gaps: attempt result detail route, review/download/return grade actions, bulk/post-score actions where API support exists.
- [x] Close lesson parity gaps: edit/update/publish from mobile, not just read-only detail.
- [x] Wire missing entry points from existing teacher list/detail screens so no teacher module is hidden behind unreachable navigation.
- [x] Run mobile typecheck and Jest.
- [x] Run focused frontend/backend smoke checks only if shared contracts or services are changed.
- [x] Review `git diff --check`, commit, and push only after verification is clean.

## Verification Commands

```powershell
cd C:\Users\jethr\Desktop\capstone-nest-react-lms\test-mobile
npm run typecheck
npm test -- --runInBand
```

```powershell
cd C:\Users\jethr\Desktop\capstone-nest-react-lms
git diff --check
```
