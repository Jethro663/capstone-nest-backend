# Mobile Teacher Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing teacher mobile Home, Assessments, Classes, Sections, Profile, shared header, and Android update gate presentation around the GABHS red-and-white identity without adding or removing any workflow.

**Architecture:** Add teacher-only visual tokens and reusable disclosure/filter primitives, then reorganize the existing screens around those primitives. Navigation targets, workflow-relevant API hooks, mutations, updater admission state, update cadence, and destructive confirmations remain authoritative and unchanged. The academic-period read used only by the removed quarter filter leaves with that filter. Class and section cards reuse their existing presentation data and mobile list payloads; they do not add web-only metric requests.

**Tech Stack:** Expo 54, React Native 0.81, React 19, React Navigation, React Query, Jest, react-test-renderer, Android Gradle.

## Global Constraints

- Preserve all five teacher tabs: Home, Assessments, Classes, Sections, and Profile.
- Preserve every existing navigation destination, workflow-relevant API call, mutation, confirmation, and strict Android admission state transition.
- Do not introduce backend, database, AI-service, or API-contract changes.
- Use the established web teacher colors: `#DC2626`, `#EF4444`, warm white surfaces, `#0F172A` text, and `#64748B` secondary text.
- Use green and amber only for real success/warning states; custom class and section imagery/gradients remain user-owned.
- Keep 44px minimum touch targets, accessible expanded state, text scaling, and reduced visual motion.
- Package the changed mobile bundle as version `0.1.23`, Android versionCode `24`, through the existing release scripts and strict minimum-supported-build contract.
- Produce one final scoped release commit after all local gates pass.

---

### Task 1: Teacher theme, compact shell, and reusable disclosure controls

**Files:**
- Create: `mobile/src/theme/teacher.ts`
- Modify: `mobile/src/components/teacher/TeacherMobilePrimitives.tsx`
- Modify: `mobile/src/components/ui/BottomTabBar.tsx`
- Create: `mobile/src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`
- Modify: `mobile/src/components/ui/__tests__/BottomTabBar.test.tsx`

**Interfaces:**
- Produces: `teacherTheme`, `TeacherAccordionSection`, and `TeacherSelectMenu`.
- Preserves: existing `TeacherScreen`, `TeacherPanel`, `TeacherRow`, `TeacherActionButton`, `TeacherChip`, `TeacherSearch`, and `TeacherInlineField` signatures.

- [ ] Write tests asserting the teacher primary/active color is `#DC2626`, the shared screen renders only the compact title row, refresh/back controls keep accessible labels, disclosure headers expose expanded state, and teacher bottom tabs use the teacher primary color.
- [ ] Run `npm test -- --runTestsByPath src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx src/components/ui/__tests__/BottomTabBar.test.tsx` from `mobile/` and confirm the new assertions fail against the blue, descriptive shell.
- [ ] Add the dedicated teacher tokens, compact safe-area-aware header, controlled disclosure section, class selection modal, and role-aware teacher tab color.
- [ ] Rerun the focused tests and confirm they pass.

### Task 2: Preserve strict Android admission with a quieter recheck surface

**Files:**
- Modify: `mobile/src/providers/UpdateProvider.tsx`
- Modify: `mobile/src/providers/__tests__/UpdateProvider.test.tsx`

**Interfaces:**
- Consumes: existing `UpdateState`, `hasAdmitted`, `checkForUpdates`, `shouldShowModal`, and update actions.
- Produces: a compact admitted-session verification overlay while keeping startup, failure, installer, and mandatory-update surfaces unchanged.

- [ ] Add a regression test that completes initial admission, starts a deferred foreground recheck, proves the child remains mounted but inaccessible, and expects `Verifying app version…` instead of the startup `Checking app version` card.
- [ ] Run the focused provider test and verify the new expectation fails.
- [ ] Split the modal presentation by `hasAdmitted && state.status === "checking"`: render the current screen below a translucent interaction-blocking overlay with a thin teacher-red progress indicator; retain the existing full recovery/update content for startup checks, failures, and APK decisions.
- [ ] Rerun the focused provider suite and confirm all update-admission tests pass.

### Task 3: Home and Assessments information hierarchy

**Files:**
- Modify: `mobile/src/screens/TeacherHomeScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentsScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-mobile-render.test.tsx`
- Create: `mobile/src/screens/__tests__/teacher-assessments-layout.test.tsx`

**Interfaces:**
- Home preserves all current navigation calls and query inputs.
- Assessments preserves create, detail, edit/review, single delete, bulk delete, AI resume/open/delete, refresh, and class filtering.

- [ ] Add render tests proving Home has no `TeacherStats`, retains every quick action destination, merges duplicate class summaries, and exposes accordion counts.
- [ ] Add assessment render tests proving the class selector and class accordions precede AI jobs, removed search/period/status/create panels are absent, and a zero-assessment class still exposes `Create first assessment`.
- [ ] Run both focused screen test files and confirm the hierarchy assertions fail.
- [ ] Rebuild Home with the quick-action strip immediately below the compact header and controlled disclosure sections for attention, classes, intervention, assessments, and announcements.
- [ ] Rebuild Assessments around one class selector and all assigned class accordions; retain row selection/actions and move AI jobs to the final marked disclosure section.
- [ ] Rerun the focused tests and confirm they pass.

### Task 4: Web-composed class and section cards using current mobile data

**Files:**
- Create: `mobile/src/components/teacher/TeacherPresentationCards.tsx`
- Create: `mobile/src/components/teacher/__tests__/TeacherPresentationCards.test.tsx`
- Modify: `mobile/src/screens/TeacherClassesScreen.tsx`
- Modify: `mobile/src/screens/TeacherSectionsScreen.tsx`

**Interfaces:**
- Produces: `TeacherClassPresentationCard` and `TeacherSectionPresentationCard`.
- Consumes: existing `ClassItem`, `TeacherSection`, `cardBannerUrl`, `cardPreset`, current schedule/student/capacity fields, and existing callbacks.
- Does not fetch lessons, assessments, readiness, or other web-only card metrics.

- [ ] Write component tests for banner URI rendering, preset rendering, designed fallback gradients, grade/status labels, class/section identity, schedule/occupancy text, open callbacks, and customization callbacks.
- [ ] Run the focused card tests and verify failure before the components exist.
- [ ] Implement a 120px web-inspired hero, fallback gradients, status/grade labels, overflow customization affordance, compact detail body, and existing primary action mapping.
- [ ] Remove page-level stats and nested list panels from Classes and Sections, retain search, and render visibility filters as direct compact buttons.
- [ ] Rerun card and affected screen tests and confirm they pass.

### Task 5: Profile hierarchy and action safety

**Files:**
- Modify: `mobile/src/screens/TeacherProfileScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-mobile-render.test.tsx`
- Verify unchanged: `mobile/src/components/account/PasswordChangeForm.tsx`

**Interfaces:**
- Preserves avatar upload, profile save payload, password change form, logout, refresh, and app-version display.
- Does not resolve the separate mobile/web ownership disagreement for department, specialization, or employee ID.

- [ ] Add assertions that implementation-facing API copy and stat cards are absent, identity precedes contact/professional/security disclosures, App Version precedes Log out, and Save profile is not adjacent to Log out.
- [ ] Run the focused profile test and confirm it fails against the current layout.
- [ ] Implement the identity card, controlled Contact/Professional/Security disclosures, contextual save action, app information row, and final full-width outlined Log out action.
- [ ] Rerun the focused profile test and confirm it passes.

### Task 6: Full verification, Android package, and release

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Produces Android `0.1.23` / versionCode `24`, with `minSupportedVersionCode` `24` and the current public download URL.

- [ ] Run focused tests after the last edit, then `npm run typecheck`, `npm run test`, and `npm run test:release` from `mobile/`.
- [ ] Review `git diff --check`, changed-file scope, route/action preservation, and the requirement checklist.
- [ ] Bump app/Gradle versions, build the release APK with Java 17 and the production `EXPO_PUBLIC_API_URL`, validate package/version/ABI/signature/alignment/backend URL, and record size/SHA-256.
- [ ] Run `npm run release:prepare -- --release-notes "Redesigned the teacher mobile workspace with compact GABHS styling and unchanged workflows."` followed by `npm run release:verify`, then rerun affected mobile/full checks because packaging metadata changed.
- [ ] Inspect staged scope, commit, fetch, review outgoing history and divergence, push to `origin/developement`, and confirm the remote contains the exact SHA.
- [ ] Observe exact-SHA CI and downstream Railway deployment to terminal success; verify live health plus served APK/manifest byte and checksum equality.
- [ ] Report local tests, device/emulator limits, artifact identity/signing, commit/SHA, CI/deployment links, and public APK link without overstating unperformed device evidence.
