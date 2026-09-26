# Student Evaluation Web/Mobile Isolation Analysis

**Date:** 2026-09-26

**Snapshot:** `developement` at `a11ab492deaf12906b58db26a2427cf84b7e1559`
**Scope:** Student evaluation discovery, rating interaction, submission, history, and mobile navigation. This document records the completed Phase 0 analysis that governed the approved implementation.
**Disposition:** Implemented and released on 2026-09-26; the original evidence below remains the pre-change isolation baseline.

## 1. Executive verdict

The student evaluation feature is **moderately coupled but already bounded** around the LXP controller/service and two client adapters. It has no queue, cache, AI, external provider, or migration dependency. The missing-mobile-page report is more precisely a **discoverability and integration gap**: a functioning mobile screen and API adapter exist, but the screen is Profile-only/root-stack-owned and absent from the student drawer/tab manifest.

The high-impact defect is contract drift. System/JA forms accept `0–5`; teacher forms accept `1–5`; web displays `0–5` for both; mobile displays `1–5` and preselects `5`. Recommended isolation seam: one documented six-point semantic scale in each client, backed by a backend-wide `0–5` validator and parity regression tests. No database migration is required because both rating maps are JSON.

Coverage is bounded to current static source, focused existing tests, and the named endpoint consumers. No additional dependency was found within the inspected scope after a focused endpoint, route, persistence, and consumer search.

## 2. Feature anatomy

### Inbound flows

- Web sidebar -> `/dashboard/student/evaluations` -> `StudentTeacherEvaluationsPage`.
- Mobile Profile quick link -> root `StudentEvaluations` route -> `StudentEvaluationsScreen`.
- Proposed mobile drawer -> `MainTabs/StudentEvaluations` through the existing role-drawer dispatcher.

### Outbound flows and state

- Both clients read teacher and assigned-system inboxes in parallel.
- Teacher submission contains class ID, grading period, evaluation type, ratings, and optional comment.
- System/JA submission contains assignment ID in the path, question ratings, and optional feedback.
- Backend checks current enrollment/finalized period or campaign assignment/window, exact question keys, integer range, roles, and duplicate state.
- Writes persist JSON ratings, update the assignment when applicable, and create existing audit records.
- Client-local selected item, ratings, comment, filter, and request state are not durable drafts.

### Variants

- Teacher class, JA Hub, and Learner's Path teacher-evaluation definitions share the teacher endpoint.
- System and JA Hub campaigns share assigned-system endpoints.
- Completed items are history-only in both clients.

## 3. Cascade map

| Edge | Provider/interface | Consumer | Effect/class | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|
| E1 | Student web sidebar route | Student evaluation page | Direct entry | Low | Confirmed | `next-frontend/src/components/layout/Sidebar.tsx:146-151`; route page | Preserve |
| E2 | `StudentTeacherEvaluationsPage` | `lxpService` | Two dashboard reads and two mutation variants | High | Confirmed | `StudentTeacherEvaluationsPage.tsx:124-274` | Redesign presentation only; preserve calls |
| E3 | Web `StarRating` | Submission rating map | Exposes `0–5` without semantics | High | Confirmed | `StudentTeacherEvaluationsPage.tsx:87-121` | Replace with accessible semantic scale |
| E4 | Profile quick link/root stack | `StudentEvaluationsScreen` | Dormant mobile entry | Medium | Confirmed | `ProfileScreen.tsx:1191-1198`; `AppNavigator.tsx:700-703` | Move ownership to student tab; preserve quick link |
| E5 | Student route manifest/tab map | Student drawer primary destinations | Evaluations omitted | High | Confirmed | `student-route-manifest.ts:8-26`; `AppNavigator.tsx:243-251` | Add typed tab destination |
| E6 | `ROLE_DRAWER_GROUPS.student` | Role drawer rendering | One flat Learning group | Medium | Confirmed | `role-drawer-model.ts:114-151`; `RoleNavigationDrawer.tsx` | Split into Learning, School life, Feedback |
| E7 | `StudentEvaluationsScreen` | `evaluationsApi` | Reads/submits real data | High | Confirmed | `StudentEvaluationsScreen.tsx:62-190` | Retain; rewrite layout/state guard |
| E8 | Mobile rating component | Mobile payload | Only `1–5`, defaults all to 5 | High | Confirmed | `StudentEvaluationsScreen.tsx:40-60, 187-190` | Add deliberate nullable `0–5` scale |
| E9 | Web `lxpService` / mobile `evaluationsApi` | LXP controller | Same endpoint paths and payload keys | High | Confirmed | `next-frontend/src/services/lxp-service.ts:311-339`; `mobile/src/api/services/evaluations.ts:199-232`; `lxp.controller.ts:172-191, 319-342` | Freeze contract shape |
| E10 | `normalizeTeacherEvaluationRatings` | Teacher submission persistence | Rejects 0 | High | Confirmed | `lxp.service.ts:442-476` | Widen to `0–5`; add boundary tests |
| E11 | `normalizeSystemEvaluationQuestionRatings` | System/JA persistence | Accepts 0–5 | High | Confirmed | `lxp.service.ts:280-343` | Preserve |
| E12 | LXP persistence schema | Teacher/system summaries and history | JSON ratings plus numeric legacy system columns | High | Confirmed | `lxp.schema.ts:355-369, 522-545` | No schema/migration change |
| E13 | LXP service audit writes | Audit trail | Submission evidence | Medium | Confirmed | `lxp.service.ts:5183-5330, 5777-5870` | Preserve |
| E14 | Web/mobile/backend tests | Release confidence | Partial current coverage | Medium | Confirmed | Web focused 1/1; mobile focused 38/38 on 2026-09-26 | Extend before edits, then full gates |
| E15 | Existing OpenSpec parity change | Implementation constraints | Requires durable real API and visible failures | Medium | Confirmed | `openspec/changes/align-mobile-with-web-contracts/specs/mobile-evaluation-parity/spec.md` | Preserve and extend, do not contradict |

## 4. Isolation and cut simulation

### Remove or hide the web entry (E1)

- Immediate: students lose the discoverable browser path, but endpoints and existing records remain.
- Delayed/persisted: pending assignments accumulate until expiry; no data is deleted.
- Validation/rollback: restore the sidebar item/route and run web route/component tests.

### Remove the mobile root route without adding the tab (E4/E5)

- Immediate: the existing Profile quick link becomes invalid; mobile loses its only student evaluation entry.
- Compatibility prerequisite: add `StudentEvaluations` to `MainTabParamList`, the tab manifest/map/render switch, and the drawer before removing the root registration.
- Validation/rollback: route-manifest, drawer integration, Profile navigation, and typed navigator tests.

### Change rating semantics only in clients (E3/E8 without E10)

- Immediate: a teacher rating of 0 appears valid but is rejected by backend; web already has this latent failure.
- Disposition: prohibited. Backend validation must be widened first in the implementation sequence and all consumers updated in the same revision.

### Change backend teacher range (E10)

- Immediate: new teacher responses may contain 0; old 1–5 payloads remain valid.
- Persisted/reporting: summary averages naturally include 0 from new responses. Existing history is unchanged.
- Compatibility: backward-compatible request widening; no response or schema change.
- Validation/rollback: unit bounds, submission behavior, summary calculation, client exact-payload tests. A code revert restores `1–5`; it must not rewrite already accepted data.

### Remove either dashboard read (E2/E7/E9)

- Immediate: one evaluation family disappears from the unified inbox.
- Disposition: preserve both reads and partial/error truthfulness; do not replace missing data with samples.

## 5. Required and optional improvements

### Required

1. Establish one six-point semantic scale across backend acceptance, web interaction, mobile interaction, tests, and accessibility text.
2. Make mobile Evaluations a typed drawer/tab destination before removing the duplicate root route.
3. Remove automatic rating defaults and require deliberate completion.
4. Keep endpoint shapes and backend authority unchanged.

### Optional, evidence-backed, bounded

1. Extract client-local rating-scale constants to keep labels out of component markup.
2. Add an answered-count indicator; it is derived client state and does not alter data contracts.
3. Keep selected semantics visible in addition to tooltips so touch and assistive users receive equivalent guidance.

## 6. Uncertainty and coverage boundary

- Production historical rating distribution and authenticated physical-device geometry were not inspected in Phase 0.
- The analysis does not claim all repository dependencies; it covers the current student evaluation routes, typed clients, backend owners, persistence, navigation manifests, and focused tests.
- Existing broad `align-mobile-with-web-contracts` verification tasks remain incomplete; this feature's release must not claim those unrelated global tasks are closed.
