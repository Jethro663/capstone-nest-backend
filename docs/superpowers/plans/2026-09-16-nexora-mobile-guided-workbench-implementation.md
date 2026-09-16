# Nexora Mobile Guided Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved student and teacher Guided Workbench redesign in the Expo mobile app, preserve existing academic contracts, package the resulting Android release, and verify the exact shipped revision.

**Architecture:** Keep the existing role navigators, React Query hooks, mutation paths, and backend response types. Add restrained teacher workspace primitives, migrate the named screens from stat-card panels to context selectors, segmented modes, flat sections, and bottom sheets, and fix student class-card and JA navigation behavior at their current owners.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation 6, React Query 5, Jest 29, TypeScript 5.9, Android Gradle.

## Global Constraints

- Keep backend, DTO, schema, endpoint, academic-status, permission, grading, and evaluation-calculation contracts unchanged.
- Keep GABHS red, white, navy, and the existing mobile theme tokens.
- Preserve all assessment lifecycle gates, destructive confirmations, query invalidations, and protected-file behavior.
- Use real endpoint data only; do not invent statistics, trends, or durable state.
- Minimum touch target is 44 px; class-card actions must remain bounded at 320, 360, 393, and 430 px and under increased text.
- Teacher and student navigation must preserve actual history; drawers and sheets close before their underlying route changes.
- Do not call `ai-service` directly from mobile.

---

### Task 1: Shared guided-workbench primitives

**Files:**
- Modify: `mobile/src/components/teacher/TeacherWorkspacePrimitives.tsx`
- Test: `mobile/src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx`

**Interfaces:**
- Produces: `TeacherSegmentedTabs<Key>({ items, activeKey, onSelect, accessibilityLabel })`.
- Produces: `TeacherSummaryStrip({ items })` where each item is `{ label, value, tone? }`.
- Preserves: `TeacherActionSheet`, `TeacherContextStrip`, `TeacherFlatSection`, and `TeacherBottomActionBar`.

- [ ] **Step 1: Write failing behavior tests**

```tsx
<TeacherSegmentedTabs
  accessibilityLabel="Assessment sections"
  activeKey="overview"
  items={[{ key: "overview", label: "Overview" }, { key: "submissions", label: "Submissions", count: 2 }]}
  onSelect={onSelect}
/>
<TeacherSummaryStrip items={[{ label: "Average", value: "84%", tone: "blue" }]} />
```

Assert 44 px targets, selected accessibility state, count text, selection callbacks, and a single flat summary container.

- [ ] **Step 2: Run the focused test and confirm it fails because the exports do not exist**

Run: `npm test -- --runInBand src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx`

- [ ] **Step 3: Implement the two primitives with existing theme tokens**

Use a bordered rectangular group with 9 px selected segments for tabs. Use one separator-based row for summary values; do not render independent cards.

- [ ] **Step 4: Re-run the focused test**

Expected: the primitive suite passes without warnings other than the repository-filtered React renderer deprecation notice.

### Task 2: Student Home and cross-phone class actions

**Files:**
- Modify: `mobile/src/screens/student-home/StudentHomeView.tsx`
- Modify: `mobile/src/screens/student-classes/StudentClassCard.tsx`
- Test: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`
- Create: `mobile/src/screens/__tests__/student-class-card-actions.test.tsx`

**Interfaces:**
- Preserves: `StudentClassCard` props and existing navigation callbacks.
- Produces: direct Pressable-owned primary and secondary action surfaces with stable icon and trailing slots.

- [ ] **Step 1: Replace source-only wrapper expectations with failing component geometry contracts**

Assert that the primary action Pressable has `minHeight >= 48`, secondary Pressables have `minHeight >= 44`, icons use a fixed non-shrinking slot, the primary trailing arrow has its own fixed slot, and secondary actions use `flexBasis` plus `minWidth` without decorative parent surfaces.

- [ ] **Step 2: Run the student layout tests and confirm RED**

Run: `npm test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/screens/__tests__/student-class-card-actions.test.tsx`

- [ ] **Step 3: Implement the action grid and unify Home sections**

Remove `actionSurface` wrappers. Give every Pressable its own border, background, padding, and overflow-safe content row. Restyle Your day, Keep momentum, and From school with the same navy/red focus rhythm and flat dividers used by Start here while keeping the same data and routes.

- [ ] **Step 4: Verify focused tests and TypeScript**

Run: `npm test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/screens/__tests__/student-class-card-actions.test.tsx`

### Task 3: Drawer and JA navigation continuity

**Files:**
- Modify: `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
- Modify: `mobile/src/components/ja/JaChatWorkspace.tsx`
- Modify: `mobile/src/screens/JaScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Test: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`
- Test: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Produces: teacher drawer footer with Profile plus confirmed Log out.
- Produces: JA leading navigation slot and stack-entry access to the student role drawer.
- Preserves: the existing JA tools sheet and tab-history behavior.

- [ ] **Step 1: Change drawer tests to require teacher logout and JA tests to require role navigation**

Teacher and student must both render a footer test ID derived from the role and invoke the same confirmation flow. JA Ask must receive a leading drawer/back control; a stack Chatbot entry must be wrapped by the student drawer provider.

- [ ] **Step 2: Run the focused suites and confirm RED**

Run: `npm test -- --runInBand src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx src/navigation/__tests__/role-drawer-integration.test.ts`

- [ ] **Step 3: Implement footer and JA shell wiring**

Pass `logout` to `TeacherDrawerNavigator`. Render the shared footer whenever `onLogout` exists. Add a `leadingAction` prop to `JaChatWorkspace`; use `RoleHeaderNavigationButton` at tab root and a history-safe Back control for stack entry, while preserving the JA tools action.

- [ ] **Step 4: Re-run the navigation suites**

Expected: drawer destinations, footer confirmation, tab history, and stack fallback tests pass.

### Task 4: Assessment and section operational workspaces

**Files:**
- Verify unchanged owner: `mobile/src/screens/TeacherHomeScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherSectionDetailScreen.tsx`
- Test: `mobile/src/screens/__tests__/teacher-mobile-render.test.tsx`
- Create: `mobile/src/screens/__tests__/teacher-guided-workbench-layout.test.ts`

**Interfaces:**
- Assessment modes: `overview | submissions | analytics`.
- Submission filters: `all | turned_in | missing | not_started | returned`; only existing response statuses and due dates may distinguish missing from not started.
- Submission sort: `recent | name | status`.
- Section modes: `roster | schedule` with one mode-aware search string.

- [ ] **Step 1: Add failing layout and interaction assertions**

First retain the existing Teacher Home render assertions for compact greeting, next class, agenda, priority, two class shortcuts, recent update, and no `TeacherStats`. Assert both detail screens contain `TeacherContextStrip` and `TeacherSegmentedTabs`, contain no `TeacherStats`, and the assessment screen contains `TeacherActionSheet`, submission search/filter/sort state, and non-actionable rows without attempt IDs.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- --runInBand src/screens/__tests__/teacher-mobile-render.test.tsx src/screens/__tests__/teacher-guided-workbench-layout.test.ts`

- [ ] **Step 3: Implement assessment tabs and management sheet**

Keep current API hooks and mutations. Move edit, publish/draft, release, attachment, and delete controls into `TeacherActionSheet`. Render Overview, Submissions, and Analytics independently and preserve attempt navigation only for real attempt IDs.

- [ ] **Step 4: Implement the section context, tabs, and search**

Filter roster by learner identity/status and schedule by subject, teacher, room, and slots. Keep Add students, removal, and profile navigation on their current paths.

- [ ] **Step 5: Re-run focused tests**

Expected: both screen contracts and existing mutations remain green.

### Task 5: Teaching content and communication workspaces

**Files:**
- Modify: `mobile/src/screens/TeacherLessonsScreen.tsx`
- Modify: `mobile/src/screens/TeacherLibraryScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassRecordScreen.tsx`
- Modify: `mobile/src/screens/TeacherAnnouncementsScreen.tsx`
- Test: `mobile/src/screens/__tests__/teacher-guided-workbench-layout.test.ts`

**Interfaces:**
- Lessons: class selector, `all | published | drafts`, search, selection mode, `TeacherActionSheet` bulk lifecycle.
- Library: `files | modules`, class/folder filters, contextual Upload/New module action.
- Class record: compact class selector and existing `AcademicWorkbook` authority.
- Announcements: `feed | compose`; existing editor modal remains the mutation owner.

- [ ] **Step 1: Add failing source contracts for all four screens**

Assert mode-specific primitives and the absence of `TeacherStats` and obsolete action panels.

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `npm test -- --runInBand src/screens/__tests__/teacher-guided-workbench-layout.test.ts`

- [ ] **Step 3: Migrate Lessons and Library**

Preserve bulk publish/draft/delete/reorder and file upload/delete/retry-index calls exactly. Only restructure presentation and local filters.

- [ ] **Step 4: Migrate Class Record and Announcements**

Keep `AcademicWorkbook` as the evidence-bearing matrix. Make Compose open the established editor and keep core-template/authorship/scheduling behavior inside existing mutations.

- [ ] **Step 5: Re-run the focused contract and related editor tests**

Run: `npm test -- --runInBand src/screens/__tests__/teacher-guided-workbench-layout.test.ts src/screens/__tests__/announcement-editors.test.tsx`

### Task 6: Teacher insight and support workspaces

**Files:**
- Modify: `mobile/src/screens/TeacherReportsScreen.tsx`
- Modify: `mobile/src/screens/TeacherInterventionsScreen.tsx`
- Modify: `mobile/src/screens/TeacherPerformanceScreen.tsx`
- Modify: `mobile/src/screens/TeacherEvaluationsScreen.tsx`
- Test: `mobile/src/screens/__tests__/teacher-guided-workbench-layout.test.ts`
- Test: `mobile/src/screens/__tests__/teacher-intervention-workspace.test.tsx`
- Test: `mobile/src/screens/__tests__/teacher-interventions-parity.test.tsx`

**Interfaces:**
- Reports: `types | results`.
- Interventions: `priority | active | history` mapped to the existing queue/overview/history datasets.
- Performance: `overview | at_risk | compare`.
- Evaluations: `to_answer | feedback` mapped to the existing inbox and anonymous summary endpoints.

- [ ] **Step 1: Add failing mode and no-stat-wall assertions**

Require `TeacherSegmentedTabs` in each screen, no `TeacherStats`, and no persistent Interventions Filters panel.

- [ ] **Step 2: Run the focused suites and confirm RED**

Run: `npm test -- --runInBand src/screens/__tests__/teacher-guided-workbench-layout.test.ts src/screens/__tests__/teacher-intervention-workspace.test.tsx src/screens/__tests__/teacher-interventions-parity.test.tsx`

- [ ] **Step 3: Implement Reports and Interventions modes**

Keep official CSV export and case mutations unchanged. Present filters inline or in a sheet without blocking the active dataset.

- [ ] **Step 4: Implement Performance and Evaluations modes**

Use one `TeacherSummaryStrip` only where it directly orients the active dataset. Keep real category averages, comparison rows, coverage, and anonymous comments.

- [ ] **Step 5: Re-run focused suites**

Expected: parity and guided-workbench tests pass.

### Task 7: Full mobile verification and Android packaging

**Files:**
- Modify through release tooling: `mobile/app.json`
- Modify through release tooling: `mobile/android/app/build.gradle`
- Modify through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Replace through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.apk`

- [ ] **Step 1: Run formatting/diff checks, typecheck, and the complete mobile Jest suite**

Run: `git diff --check`, `cd mobile && npm run typecheck`, `cd mobile && npm test -- --runInBand`.

- [ ] **Step 2: Prepare the next synchronized mobile release version**

Inspect `mobile/scripts/app-version-release.cjs --help` and use the repository-provided prepare command with the next version and versionCode.

- [ ] **Step 3: Build the release APK with the intended backend `/api` URL**

Use the existing Android release task and retain the full build log.

- [ ] **Step 4: Verify archive, package, version, ABI, signature, alignment, API URL, size, and SHA-256**

Run the repository release verifier plus Android SDK archive/signature tools available in the configured environment.

- [ ] **Step 5: Re-run release-contract tests and final affected checks after packaging inputs change**

Run: `cd mobile && npm run test:release && npm run release:verify` plus any manifest/download integration tests found during discovery.

### Task 8: Commit, push, and observe the exact release

**Files:**
- Review every task-owned file from Tasks 1–7.

- [ ] **Step 1: Review status, final diff, outgoing commits, and upstream divergence**

Confirm only the approved design commit and implementation/release commits are outgoing.

- [ ] **Step 2: Commit the final verified implementation and artifact**

Record the full SHA and ensure hooks did not mutate tested inputs.

- [ ] **Step 3: Push `developement` and confirm remote equality**

Run: `git push origin developement`, then compare local and `origin/developement` SHAs.

- [ ] **Step 4: Observe CI, Railway deployment, and downloadable artifact delivery for the pushed SHA**

Correlate GitHub run IDs and Railway tested SHA. Compare served APK and manifest bytes/checksums to the committed files.

- [ ] **Step 5: Write the beginner-readable completion summary**

Separate source/test, APK/archive, emulator/device, CI, Railway, and live-download evidence. State any evidence not obtained.
