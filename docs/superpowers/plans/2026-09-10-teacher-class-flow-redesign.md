# Teacher Class Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the teacher mobile Class, Module, Lesson, Add Students, and AI Draft card walls with the accepted compact outline design, preserve every existing procedure, and make detail Back fallbacks source-aware for direct entry.

**Architecture:** Add one focused set of teacher workspace presentation primitives and one pure navigation-fallback resolver. Keep the existing screen hooks, services, mutations, modals, permissions, and route names authoritative; the screens only reorganize when controls are disclosed and how content is grouped. Add optional serializable source metadata to detail-route params so ordinary history still wins while direct entries have a durable role-safe fallback.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation 6, React 19, React Query 5, Jest, TypeScript 5.9, Android Gradle.

## Global Constraints

- Preserve the P2 teacher palette: `#C96B68` red, warm-white surfaces, `#0F172A` text, and `#64748B` secondary text.
- Preserve all current API calls, mutation payloads, React Query invalidation, role gates, confirmations, job polling, source readiness, grading-scale replacement, and unpublished AI-apply behavior.
- Preserve `TeacherDrawer` as the 14-destination primary navigator; all five redesigned screens remain outer-stack child routes with visible Back.
- Remove `TeacherStats` and top-level `TeacherPanel` card stacks from the five requested surfaces.
- Use 44px minimum touch targets, accessible expanded/selected state, safe-area-aware sticky actions, readable text scaling, and reduced-motion-safe transitions.
- Do not change backend, database, web, AI-service, student, or admin behavior.
- Build and deliver a new Android version after the final mobile source and release metadata pass all gates.

---

### Task 1: Durable source-aware teacher detail Back

**Files:**
- Create: `mobile/src/navigation/teacher-detail-back.ts`
- Create: `mobile/src/navigation/__tests__/teacher-detail-back.test.ts`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/screens/TeacherClassDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Modify: `mobile/src/screens/TeacherDeepParityScreens.tsx`
- Modify: `mobile/src/screens/TeacherClassesScreen.tsx`
- Modify: `mobile/src/screens/TeacherLibraryScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonsScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentsScreen.tsx`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Produces: `TeacherDetailBackTarget`, `resolveTeacherDetailBackTarget(routeName, params)`, and `navigateTeacherDetailBack(navigation, routeName, params)`.
- Route metadata: module `source?: "class" | "library"`; lesson `moduleId?: string` and `source?: "module" | "lessons"`; add-students `sourceTab?: TeacherClassDetailTab`; AI `source?: "class" | "assessments"` and `sourceTab?: TeacherClassDetailTab`.
- Rule: `navigation.canGoBack()` uses actual history; otherwise class → drawer Classes, module → source Library or class Modules, lesson → exact module when `moduleId` exists / class Modules when only `classId` exists / drawer Lessons otherwise, add-students → class Students, AI → drawer Assessments or the recorded class tab.

- [ ] **Step 1: Write failing resolver and source-wiring tests** covering actual-history precedence, every direct-entry fallback, module-origin lesson metadata, and alternate Library/Lessons/Assessments callers.
- [ ] **Step 2: Run RED verification:** `npm test -- --runInBand src/navigation/__tests__/teacher-detail-back.test.ts src/navigation/__tests__/role-drawer-integration.test.ts`; expect missing resolver/metadata failures.
- [ ] **Step 3: Implement the pure resolver, navigation executor, optional typed params, caller metadata, and screen Back handlers without changing a route name or backend contract.**
- [ ] **Step 4: Run GREEN verification** with the Step 2 command and expect both suites to pass.

### Task 2: Compact workspace primitives and sticky action contract

**Files:**
- Create: `mobile/src/components/teacher/TeacherWorkspacePrimitives.tsx`
- Create: `mobile/src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx`
- Modify: `mobile/src/components/teacher/TeacherMobilePrimitives.tsx`
- Modify: `mobile/src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`

**Interfaces:**
- Produces: `TeacherContextStrip`, `TeacherWorkspaceSwitcher`, `TeacherQuickActionRail`, `TeacherFlatSection`, `TeacherActionSheet`, `TeacherStepTabs`, `TeacherInlineNotice`, and `TeacherBottomActionBar`.
- Extends: `TeacherScreen` with optional `bottomAction?: ReactNode`; existing call sites render unchanged when omitted.
- Visual contract: flat dividers before containers, no decorative metrics, one primary action per region, restrained P2 red, 44px controls, semantic selected/expanded state.

- [ ] **Step 1: Write failing component tests** for labels, callbacks, selected states, 44px sizing, modal close behavior, and `TeacherScreen.bottomAction` rendering outside scroll content.
- [ ] **Step 2: Run RED verification:** `npm test -- --runInBand src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`; expect the new module and prop contract to be absent.
- [ ] **Step 3: Implement the primitives** using existing `teacherTheme`, `MaterialCommunityIcons`, React Native `Modal`, safe-area insets, and no new dependency.
- [ ] **Step 4: Run GREEN verification** with the Step 2 command.

### Task 3: Class workspace and Add Students

**Files:**
- Create: `mobile/src/screens/__tests__/teacher-class-flow-layout.test.ts`
- Modify: `mobile/src/screens/TeacherClassDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherDeepParityScreens.tsx`

**Interfaces:**
- Class: compact identity strip → workspace switcher → Create/Add students/AI Draft rail → one flat active section.
- Add Students: locked grade/section notice → search → three eligibility buttons → flat selectable roster → sticky `Add selected` action.
- Preserves all eight class tabs, module/assessment/announcement management, specialist boards, roster removal, refresh, and Add Students enrollment payloads.

- [ ] **Step 1: Write failing source-layout tests** asserting both functions have no `TeacherStats`, class has no horizontal tab scroller or `Class actions` panel, the workspace switcher exposes all eight destinations, Add Students has no top-level eligible-students panel, and both use the new primitives.
- [ ] **Step 2: Run RED verification:** `npm test -- --runInBand src/screens/__tests__/teacher-class-flow-layout.test.ts`; expect legacy-card assertions to fail.
- [ ] **Step 3: Recompose both screens** while leaving every existing handler and mutation body unchanged; pass source metadata to Add Students and AI Draft.
- [ ] **Step 4: Run GREEN verification** with the Step 2 command plus `src/screens/__tests__/teacher-mobile-render.test.tsx`.

### Task 4: Module outline and reading-first Lesson

**Files:**
- Modify: `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- Test: `mobile/src/screens/__tests__/teacher-class-flow-layout.test.ts`

**Interfaces:**
- Module: compact context strip → flat expandable section outline; module/section/item controls and grading-scale editor move into bottom sheets; `Add to module` is sticky and opens the existing add/attach paths.
- Lesson: content begins immediately after a compact status header; Edit is sticky; publish state, Save version, and Version history move to an action sheet.
- Preserves module lock/visibility/cover/core release, scale replacement, section/item reorder, attach/detach/delete, lesson publish/draft, snapshots, restores, and content-block order.

- [ ] **Step 1: Extend the failing layout test** for no stats/control cards, presence of outline/action sheets/sticky actions, exact lesson provenance, and content-before-version-history hierarchy.
- [ ] **Step 2: Run RED verification** and confirm failures point at the legacy layouts.
- [ ] **Step 3: Recompose Module and Lesson** around the new primitives, keeping existing async handlers and confirmation surfaces unchanged.
- [ ] **Step 4: Run GREEN verification** for the layout, navigation, and primitive suites.

### Task 5: Focused AI Draft stages

**Files:**
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-ai-draft.test.tsx`
- Test: `mobile/src/screens/__tests__/teacher-class-flow-layout.test.ts`

**Interfaces:**
- Produces three presentation stages: `sources`, `setup`, and `review`; stage changes retain all local source/settings/review state.
- Source readiness and blockers remain on Sources; assessment settings and Generate remain on Setup; job status/retry/cancel/delete and `TeacherAiDraftReviewPanel` remain on Review.
- A route-selected or restored job opens Review; Generate switches to Review; the existing five-second poll runs only for non-terminal jobs.

- [ ] **Step 1: Add failing render tests** for stage labels, readiness-gated Continue/Generate, restored-job Review selection, and all existing source/payload/apply assertions.
- [ ] **Step 2: Run RED verification:** `npm test -- --runInBand src/screens/__tests__/teacher-ai-draft.test.tsx src/screens/__tests__/teacher-class-flow-layout.test.ts`; expect staged-layout assertions to fail.
- [ ] **Step 3: Implement staged composition and the job-actions sheet** without changing service calls, predicates, payloads, polling, storage precedence, or review/apply logic.
- [ ] **Step 4: Run GREEN verification** with the Step 2 command.

### Task 6: Full verification, Android package, and release

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Produces the next monotonic Android version, exact embedded APK manifest/checksum, scoped commit, pushed `developement` SHA, exact-SHA CI, downstream Railway deployment, and live artifact equality.
- Preserves iOS `buildNumber: "3"`, Android package `com.nexora.lms.mobile`, `REQUEST_INSTALL_PACKAGES`, production `/api` URL, current signing configuration, and mandatory minimum-supported-build policy.

- [ ] **Step 1: Run focused suites, then `npm run typecheck`, `npm run test`, and `npm run test:release` from `mobile/`; inspect complete outcomes.**
- [ ] **Step 2: Review `git diff --check`, changed-file scope, route/action preservation, and this requirement checklist.**
- [ ] **Step 3: Bump app and Gradle versions monotonically, build the production ARM64 release APK with Java 17 and explicit `EXPO_PUBLIC_API_URL`, then verify archive, package/version, ABI, signature, alignment, backend URL, size, and SHA-256.**
- [ ] **Step 4: Run `release:prepare` with teacher class-flow release notes, `release:verify`, and every mobile check invalidated by release metadata/artifact changes.**
- [ ] **Step 5: Stage only reviewed files, inspect the staged diff, commit, fetch, review every outgoing commit and divergence, push to `origin/developement`, and confirm remote SHA equality.**
- [ ] **Step 6: Observe exact-SHA CI and downstream Railway deployment to terminal success; verify live health, updater record, served manifest, and served APK byte/checksum equality. Report absent device/emulator evidence explicitly.**
