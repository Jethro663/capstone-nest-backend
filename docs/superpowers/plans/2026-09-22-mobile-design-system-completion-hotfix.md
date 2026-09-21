# Mobile Design-System Completion Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox completion and evidence-first verification.

**Goal:** Fix the shared app-bar contrast and Student Home rendering failures, finish the active mobile design-system migration, and release a verified production-signed Android update.

**Architecture:** Keep the existing route/data structure. Make `mobileBrand` the literal palette authority, feed existing compatibility themes from it, converge main actions and app-bar controls on shared primitives, and enforce the boundary with rendered tests plus a source audit. Align generated/native presentation and perform one final release bump after every input is verified.

**Tech stack:** Expo 54, React Native 0.81, React 19, TypeScript, React Navigation, Jest/React Test Renderer, Node test runner, Android Gradle, Expo CLI, GitHub Actions, Railway.

---

## Task 1: Add the regression harness and semantic roles

**Files:**
- Modify: `mobile/src/theme/mobileBrand.ts`
- Create: `mobile/scripts/check-mobile-design-system.cjs`
- Create: `mobile/scripts/check-mobile-design-system.test.cjs`
- Modify: `mobile/package.json`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

- [ ] Add tests that mount the shared menu/Back action and assert the foreground and surface use different semantic roles, the target is at least 44 px, and accessibility labels remain present.
- [ ] Add a Node test for a scanner that rejects numeric hex/rgb/rgba literals in active `mobile/src` UI consumers while allowing the named token owner, generated source, tests, mocks, and documented native/build authorities.
- [ ] Run the focused tests and capture the expected red result before implementation:

```bash
cd mobile
npm test -- --runInBand src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx
node --test scripts/check-mobile-design-system.test.cjs
```

- [ ] Add semantic inverse, overlay, information, and state-border roles to `mobileBrand.ts`, without changing the core navy/red/neutral values.
- [ ] Implement the scanner with deterministic sorted diagnostics in `check-mobile-design-system.cjs` and expose it as `npm run audit:design`.
- [ ] Re-run the focused tests. Header contrast should remain red until Task 2; scanner unit tests should be green.
- [ ] Commit: `test(mobile): guard shared design system`

## Task 2: Fix shared app-bar and drawer presentation

**Files:**
- Modify: `mobile/src/components/ui/MobileAction.tsx`
- Modify: `mobile/src/components/ui/MobileAppBar.tsx`
- Modify: `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
- Modify: `mobile/src/components/student/StudentWorkspacePrimitives.tsx`
- Modify: `mobile/src/components/teacher/TeacherMobilePrimitives.tsx`
- Modify: `mobile/src/components/admin/AdminMobilePrimitives.tsx`
- Modify: `mobile/src/screens/JaScreen.tsx`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

- [ ] Add an inverse-header icon/text variant to the shared action primitive:

```tsx
<MobileAction
  variant="inverse"
  icon={icon}
  accessibilityLabel={label}
  onPress={onPress}
/>
```

- [ ] Make `MobileAppBar`, the root menu trigger, the Back fallback, and JA header actions consume that variant instead of pairing caller-provided white foreground with `theme.surface`.
- [ ] Restyle the drawer with a navy identity header, inverse close control, neutral body, light-navy active row, and red intent marker. Keep the provider, destination definitions, source-aware Back behavior, profile, and logout callbacks unchanged.
- [ ] Remove raw color parameters from role wrappers where semantics now belong to the shared component.
- [ ] Render the drawer for student, teacher, and admin, and assert route labels/callbacks plus shared semantic styles.
- [ ] Run:

```bash
cd mobile
npm test -- --runInBand \
  src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx \
  src/navigation/__tests__/role-drawer-integration.test.ts
```

- [ ] Commit: `fix(mobile): restore visible shared navigation controls`

## Task 3: Fix Student Home follow-up-row rendering

**Files:**
- Create: `mobile/src/components/student/StudentNextMoveRow.tsx`
- Create: `mobile/src/components/student/__tests__/StudentNextMoveRow.test.tsx`
- Modify: `mobile/src/screens/student-home/StudentHomeView.tsx`
- Replace or remove: `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`

- [ ] Write rendered tests for an interactive row and an informational row. Flatten styles and assert a full-width horizontal row, fixed 44 px icon slot, flexible copy with `minWidth: 0`, bounded title/subtitle scaling, and trailing affordance only for the interactive state.
- [ ] Assert the interactive callback fires and the informational row is not exposed as a disabled button.
- [ ] Run the new test before implementation and capture red.
- [ ] Implement `StudentNextMoveRow` using `Pressable` only when `onPress` exists and `View` otherwise.
- [ ] Replace the local `MoveTile` implementation without changing agenda selection, labels, or route callbacks.
- [ ] Remove the source-regex test once rendered behavior covers the contract.
- [ ] Run:

```bash
cd mobile
npm test -- --runInBand \
  src/components/student/__tests__/StudentNextMoveRow.test.tsx \
  src/screens/__tests__/student-home-agenda.test.ts
```

- [ ] Commit: `fix(mobile): stabilize student next move rows`

## Task 4: Converge shared, auth, provider, and student presentation

**Files:**
- Modify active files from isolation sections 4.2 and 4.5, including:
  - `mobile/src/components/auth/campus-login-theme.ts`
  - `mobile/src/components/auth/MobileAuthPrimitives.tsx`
  - `mobile/src/components/auth/MobileCampusLogin.tsx`
  - `mobile/src/components/ui/primitives.tsx`
  - `mobile/src/components/ui/MobileFilterSheet.tsx`
  - `mobile/src/components/ui/MobileScoreState.tsx`
  - `mobile/src/components/notifications/MobileNotificationQuickPanel.tsx`
  - `mobile/src/screens/NotificationsInboxScreen.tsx`
  - `mobile/src/screens/student-home/StudentHomeView.tsx`
  - `mobile/src/screens/student-classes/StudentClassCard.tsx`
  - active student assessment, class, calendar, profile, announcement, and JA screens named in the isolation report
- Modify relevant tests beside each owner.

- [ ] Run `npm run audit:design` and save its deterministic file list as the task checklist.
- [ ] Replace raw palette literals with semantic roles, processing shared/auth/providers before student consumers.
- [ ] Route local main-action abstractions through `MobileAction`; preserve list rows, class cards, radio choices, and the Current/Completed segmented control as their proper component types.
- [ ] Keep existing route callbacks, form values, query behavior, and error copy unchanged.
- [ ] Run affected focused suites after each group, then run:

```bash
cd mobile
npm run audit:design
npm test -- --runInBand \
  src/screens/__tests__/student-follow-up-layout.test.ts \
  src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx \
  src/navigation/__tests__/role-drawer-integration.test.ts
```

- [ ] If the deleted source-only test path is no longer present, omit it and use the new rendered row test instead.
- [ ] Commit: `refactor(mobile): unify shared and student presentation`

## Task 5: Converge teacher, admin, state tones, and class presets

**Files:**
- Modify active teacher/admin files in isolation sections 4.3 and 4.4.
- Modify: `mobile/src/screens/TeacherCreateAssessmentScreen.tsx`
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Modify: `mobile/src/theme/class-card-presets.ts`
- Modify relevant role component/screen tests.

- [ ] Replace the local teacher `Button` with a compatibility wrapper over `MobileAction`, then migrate callers and remove the wrapper if practical.
- [ ] Keep question-type selection as an option selector while replacing its `TouchableOpacity`/literal styling with shared control tokens.
- [ ] Map assessment, AI job, workbook, notification, maintenance, and report states to shared success/warning/danger/info families.
- [ ] Replace rainbow class presets with restrained navy/red/neutral variations while keeping preset count and data shape stable.
- [ ] Confirm no generic React Native `Button`, `TouchableOpacity`, or named local main-action component remains outside the documented exceptions.
- [ ] Run role-focused tests and:

```bash
cd mobile
npm run audit:design
npm run typecheck
```

- [ ] Commit: `refactor(mobile): unify teacher and admin presentation`

## Task 6: Align native chrome and generated rich text

**Files:**
- Modify: `mobile/App.tsx` or the actual `AppRoot` owner found by symbol trace
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/src/main/res/values/colors.xml`
- Modify: `mobile/android/app/src/main/res/values/styles.xml`
- Modify: `mobile/scripts/build-assessment-rich-text.cjs`
- Regenerate: `mobile/src/generated/assessment-rich-text.ts`
- Modify: `mobile/scripts/check-mobile-design-system.cjs`
- Modify: `mobile/scripts/check-mobile-design-system.test.cjs`

- [ ] Add audit assertions for adaptive icon, splash, status bar, navigation bar, and generated rich-text source roles.
- [ ] Run the native/generated audit and capture red.
- [ ] Set launcher background and status bar to navy, reading/splash/navigation background to the accepted canvas/surface role, and global `StatusBar` content to the matching light/dark mode.
- [ ] Replace old rich-text CSS source literals with accepted semantic values and run:

```bash
cd mobile
npm run build:rich-text
npm run audit:design
```

- [ ] Verify the generated file changes only as expected from its source builder.
- [ ] Commit: `style(mobile): align native and generated surfaces`

## Task 7: Run the complete pre-release verification

**Files:**
- Modify only if a verified test exposes a defect; add a regression test before each fix.

- [ ] Run the focused hotfix tests.
- [ ] Run the audit, typecheck, release tests, and full Jest suite:

```bash
cd mobile
npm run audit:design
npm run typecheck
npm run test:release
npm run test:ios-sidestore
npm test -- --runInBand
```

- [ ] Export a production Android bundle with the production API URL and inspect it for the final Student row/header markers:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
  npx expo export --platform android --output-dir dist/design-hotfix-export
rg -a "StudentNextMoveRow|Two small next moves|Keep momentum" dist/design-hotfix-export
```

- [ ] Review `git diff --check`, `git status --short`, and the complete diff for accidental route/API/data changes.
- [ ] Commit any verification-only fixes with their affected task, not as an untested catch-all.

## Task 8: Bump and build the production Android release

**Files:**
- Modify via release script: `mobile/app.json`
- Modify generated release/manifest files selected by `release:prepare`.
- Add the immutable build-49 APK and manifest under the repository’s existing public-download structure.

- [ ] Confirm the tree contains only intended verified changes and current version is 0.1.47/build 48.
- [ ] Run the repository release bump once and confirm 0.1.48/build 49.
- [ ] Re-run `npm run release:verify`, typecheck, audit, and focused tests after the bump.
- [ ] Load production signing variables from `/home/jethro/.config/nexora/android-release/credentials.env` without printing them.
- [ ] Build the release APK with the production API URL and production signer using the repository’s existing Gradle/release procedure.
- [ ] Verify package ID, versionName/versionCode, signer certificate lineage, ARM64 ABI, target/min API, installable archive structure, 16-KB alignment, SHA-256, and size.
- [ ] Run `npm run release:prepare` or the established packaging command only against the final verified APK; verify public manifest values match the bytes.
- [ ] Commit: `release(mobile): publish 0.1.48 build 49`

## Task 9: Push, deploy, and prove exact artifact delivery

**Files:**
- No source edits unless delivery verification reveals a release metadata defect; such a defect requires a new tested commit and a repeat of affected checks.

- [ ] Run final local evidence commands:

```bash
git diff --check
git status --short
git log -n 6 --oneline
git rev-list --left-right --count origin/developement...HEAD
```

- [ ] Push `developement` without force and record the exact pushed SHA.
- [ ] Verify GitHub CI for that exact SHA using `gh run list --commit <sha>` and `gh run watch <id> --exit-status --interval 10`.
- [ ] Verify Railway frontend/backend deployment is tied to the exact tested SHA before registering or asserting the release.
- [ ] Fetch the live Android manifest and APK, compare the live byte count and SHA-256 with the local build-49 artifact, and inspect the downloaded APK metadata/signature.
- [ ] Read back the backend update policy and confirm the new latest build/artifact metadata without weakening forced-update or signer-migration rules.
- [ ] Record evidence classes separately: source/test, signed archive, CI, Railway, public download, backend policy, and unverified physical-device acceptance.
- [ ] Run `git status --short` and `git rev-list --left-right --count origin/developement...HEAD`; both must show a clean synchronized checkout before completion.

## Completion checklist

- [ ] The two screenshot-reported defects are covered by rendered regression tests and fixed.
- [ ] The active-source audit passes with only documented palette authorities.
- [ ] Shared action/filter/navigation semantics are consistent across student, teacher, and admin.
- [ ] Native shell and generated rich-text presentation match the accepted system.
- [ ] All required automated checks pass after the final version bump.
- [ ] Build 49 is production-signed, immutable, publicly byte-identical, and registered.
- [ ] The exact pushed SHA passes CI and is the deployed source.
- [ ] Physical-device acceptance is explicitly marked verified or unverified.
