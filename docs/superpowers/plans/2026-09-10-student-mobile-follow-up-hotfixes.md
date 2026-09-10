# Student Mobile Follow-up Hotfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a readable, clearly sectioned student Home, a reliable web-parity My Classes card, a modern assignment workspace, and student drawer Profile/Log out controls without changing learning or authentication procedures.

**Architecture:** Keep existing queries, mutations, route names, cache refreshes, academic capability gates, and source-aware Back behavior. Recompose the four presentation owners around stable non-interactive color surfaces and the shared student workspace primitives; use focused source-contract and renderer tests to lock the approved structure before packaging a new Android release.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, TanStack Query, Jest, React Test Renderer, Android Gradle, GitHub Actions, Railway.

## Global Constraints

- Student role only for Home, Classes, Assessment Detail, and the new drawer Log out control.
- Preserve the navy/red/white student identity and existing semantic status colors.
- Keep every current API endpoint, DTO, query key, mutation, invalidation, academic gate, file-upload procedure, and assessment attempt procedure unchanged.
- Normal Back from Module to Assessment must still return to Module; direct-entry fallback behavior stays unchanged.
- Minimum interactive target is 44 px; layouts must remain readable at 320 px widths, large text, safe-area insets, and keyboard overlap.
- Profile and Log out appear beside each other only in the student drawer; teacher and admin drawer footers remain unchanged.
- Log out uses the existing `useAuth().logout()` procedure behind a native confirmation prompt.
- Android release increments from version `0.1.29` / code `30` to version `0.1.30` / code `31`; iOS build number remains unchanged.

---

### Task 1: Lock the approved student layout contracts

**Files:**
- Create: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Consumes: the four current presentation owners and mocked `useAuth()`.
- Produces: regression checks for stable surfaces, section dividers, compact facts, preserved work sections, and student-only logout.

- [x] **Step 1: Add source-contract assertions that initially fail**

```ts
expect(home).toContain('testID="student-home-section-divider"');
expect(home).toContain('testID="student-home-priority-surface"');
expect(classCard).toContain('testID="student-class-hero-surface"');
expect(assessment).toContain("StudentScreen");
expect(assessment).toContain("AssessmentFactsLedger");
expect(assessment).not.toContain("MetricTile");
```

- [x] **Step 2: Add a drawer renderer assertion that initially fails**

Open a student drawer, require `Go to Profile` and `Log out` in one footer, press Log out, accept the mocked native alert, and require the existing mocked `logout()` to run. Open a teacher drawer and require no drawer `Log out` control.

- [x] **Step 3: Run the focused tests and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx
```

Expected: failures for the missing stable-surface identifiers, missing facts ledger, old metric component, and missing student drawer logout.

### Task 2: Repair Home readability and section rhythm

**Files:**
- Modify: `mobile/src/screens/student-home/StudentHomeView.tsx`
- Test: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`

**Interfaces:**
- Consumes: current Home derived data and `StudentScreen`.
- Produces: a stable priority surface with dark readable copy plus explicit semantic section dividers.

- [x] **Step 1: Separate the priority surface from its press state**

Wrap the content in `student-home-priority-surface`, keep the tap target and current destination, use a navy top rail/icon accent, and render the kicker/title/context with dark student text colors that remain readable if an Android press surface is not painted.

- [x] **Step 2: Add Home section separators**

Insert `student-home-section-divider` before each section after “Your next move,” using one neutral hairline and 20–24 px vertical rhythm. Do not add enclosing cards around entire sections.

- [x] **Step 3: Run the focused test and TypeScript check**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts
npm --prefix mobile run typecheck
```

Expected: the Home layout contract passes and TypeScript reports no errors.

### Task 3: Rebuild My Classes card with web-parity hierarchy

**Files:**
- Modify: `mobile/src/screens/student-classes/StudentClassCard.tsx`
- Test: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`

**Interfaces:**
- Consumes: `StudentClassRow` and the three existing navigation callbacks.
- Produces: stable class hero, compact metrics/progress, wrapping context, and resilient task/class/schedule actions.

- [x] **Step 1: Render the color hero as a stable View**

Move `backgroundColor: heroColor` to `student-class-hero-surface`; nest a full-width press target for the unchanged `onOpenClass` callback. Keep subject code, name, teacher, grade/section, and status semantics.

- [x] **Step 2: Compact the body and harden actions**

Reduce the oversized hero/body rhythm, keep the web card’s three metrics and progress hierarchy, and render the task and continue buttons as equal, bounded controls with `minWidth: 0`, text shrinking/wrapping protection, and stable button backgrounds. Keep Schedule as a full-width trailing row.

- [x] **Step 3: Run the focused test and TypeScript check**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts
npm --prefix mobile run typecheck
```

### Task 4: Modernize Module-to-Assessment into a work page

**Files:**
- Modify: `mobile/src/screens/AssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`
- Test: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`

**Interfaces:**
- Consumes: current assessment, class, attempt, file, capability, and mutation data.
- Produces: `AssessmentFactsLedger`, flat Details/Reference/My work/Latest activity sections, progressive attempt history, and one state-aware bottom action.

- [x] **Step 1: Extend existing renderer expectations before production edits**

Require assessment detail text to retain `Reference material`, `My work`, submission/result actions, and collapsed attempt history while also exposing `Assessment details` and a compact fact ledger. Run the focused assessment renderer tests and confirm the new assertions fail for the current structure.

- [x] **Step 2: Replace the custom shell and metric cards**

Use `StudentScreen`, `StudentContextStrip`, `StudentFlatSection`, `StudentInlineNotice`, and `StudentBottomActionBar`. Delete `MetricTile`; add `AssessmentFactsLedger` with four divider-separated rows/cells for Due, Points/Pass, Time, and Attempts.

- [x] **Step 3: Preserve procedures in a student work hierarchy**

Render title/status first, then Details and instructions, Reference material, My work for file uploads, Latest activity, and the existing progressive Attempt history. Keep all current start/continue/retake, upload/open/remove/submit/unsubmit, results/history, notice, refresh, and academic capability logic unchanged.

- [x] **Step 4: Run the assessment renderer tests and TypeScript check**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/screens/__tests__/screen-render.test.tsx
npm --prefix mobile run typecheck
```

### Task 5: Put Log out beside Profile in the student drawer

**Files:**
- Modify: `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Consumes: `ROLE_DRAWER_PROFILE_DESTINATION` and `useAuth().logout()`.
- Produces: a student-only horizontal footer with Profile and confirmed Log out.

- [x] **Step 1: Add the student footer controls**

Inject the existing `logout` callback from `StudentTabs`. For `role === "student"`, render Profile as the flexible left control and a 48 px-or-larger red-outlined Log out control on the right. Confirmation Cancel closes only the alert; Log out closes the drawer and awaits the injected logout procedure without coupling shared primitives to native auth modules.

- [x] **Step 2: Keep teacher/admin behavior stable**

For other roles, continue rendering the current full-width Profile destination with no added drawer logout control.

- [x] **Step 3: Run drawer, auth, navigation, and TypeScript checks**

```bash
npm --prefix mobile test -- --runInBand src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx src/navigation/__tests__/role-drawer-integration.test.ts src/providers/__tests__/AuthProvider.update.test.tsx src/providers/__tests__/auth-verification.test.tsx
npm --prefix mobile run typecheck
```

### Task 6: Verify, package, ship, and observe

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Modify through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: final mobile bundle and existing release scripts.
- Produces: Android `0.1.30` / code `31`, exact public APK/manifest, pushed commit, CI/Railway evidence, and updater policy verification.

- [x] **Step 1: Run all final local code gates**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand --silent
npm --prefix mobile run build:rich-text
git diff --exit-code -- mobile/src/generated/assessment-rich-text.ts
git diff --check
```

- [x] **Step 2: Bump Android-only release metadata and build ARM64**

Set Expo/Gradle version to `0.1.30`, Android code to `31`, preserve iOS build `3`, update the release fixture, run `test:release`, and build with the repository production API URL and configured JDK/Android SDK.

- [x] **Step 3: Prepare and verify the delivery contract**

Use `release:prepare -- --min-supported-version-code 31` with release notes describing these four student hotfixes. Require package `com.nexora.lms.mobile`, version `0.1.30` / `31`, ARM64 ABI, valid signature, alignment, API URL, byte-for-byte copied artifact, exact size, and SHA-256.

- [ ] **Step 4: Review and publish only task-owned changes**

Inspect the final and staged diffs, fetch `origin/developement`, require no remote-only commits, inspect every outgoing commit, commit the implementation/release, and push `developement` without force.

- [ ] **Step 5: Verify exact-SHA release evidence**

Require terminal green GitHub CI for the pushed SHA, terminal Railway deployment tied to the tested SHA, healthy live services, public manifest/APK byte equality, correct live APK identity, and updater policy where code `30` is forced to update while code `31` is allowed.

- [ ] **Step 6: Record the device boundary**

Run `adb devices -l`. If no physical device/emulator is available, report that install and visual acceptance remain unverified rather than inferring them from build evidence.

## Plan self-review

- **Coverage:** Every approved Home, Classes, Assessment Detail, and drawer outcome maps to a production owner, failing test, focused check, release gate, and delivery proof.
- **Frozen behavior:** The plan changes presentation only; navigation destinations, Back semantics, auth cleanup, assessment/files lifecycle, capabilities, queries, and invalidations stay owned by existing functions.
- **Failure paths:** Query errors, empty states, disabled academic actions, busy file actions, long copy, small screens, safe areas, and logout cancellation remain explicit.
- **Type consistency:** The release uses `0.1.30` / `31` consistently, with iOS build number unchanged.
- **Placeholder scan:** No implementation step is deferred or unspecified.
