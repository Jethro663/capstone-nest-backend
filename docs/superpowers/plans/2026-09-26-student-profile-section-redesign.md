# Student Profile Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reviewed four-section student profile workspace on mobile and web, preserve the shared backend contract, package the affected Android app, and ship the verified revision.

**Architecture:** Keep the current profile API, hooks, validation, password components, and destination routes. Add local controlled section state in each profile owner, render only the active section, and reuse current GABHS tokens with restrained borders and flat action rows. No backend change is required.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, React 19, Next.js 16 App Router, Radix Tabs, Tailwind 4, Jest, React Testing Library.

## Global Constraints

- Sections are named exactly `Profile`, `Requirements`, `Security`, and `Account`.
- Mobile and web continue consuming the existing backend profile/auth contracts.
- Save remains the last action in Profile and has no unrelated content beneath it.
- Account exposes Transcript, Assessment History, and Evaluations as equal descriptive actions.
- Preserve GABHS red, white, navy, current tokens, routes, permissions, save-and-lock behavior, and password policy.
- Preserve the unrelated user-owned change in `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md`.

---

### Task 1: Characterize the Mobile Section Contract

**Files:**
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`

**Interfaces:**
- Consumes: `ProfileScreen` and its existing `navigation.navigate` prop.
- Produces: regression expectations for visible section labels, isolated content, explicit required copy, and three Account destinations.

- [ ] **Step 1: Replace the old all-at-once profile expectations with section behavior**

Add assertions that Profile is visible by default, Security and Account content are absent, and `Required` is rendered for editable required fields. Press `Requirements`, assert the named missing/complete list is shown, press `Profile`, and confirm the form returns.

- [ ] **Step 2: Expand Account navigation coverage**

Open `Account`, press each descriptive action, and assert:

```ts
expect(navigate).toHaveBeenCalledWith("Transcript");
expect(navigate).toHaveBeenCalledWith("AssessmentHistory");
expect(navigate).toHaveBeenCalledWith("StudentEvaluations");
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `cd mobile && npm test -- --runTestsByPath src/screens/__tests__/screen-render.test.tsx`

Expected: FAIL because the four section buttons and Assessment History account action are not present yet.

### Task 2: Implement the Mobile Section Workspace

**Files:**
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Verify: `mobile/src/screens/__tests__/screen-copy-sanitization.test.ts`
- Verify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Consumes: existing `useProfile`, `useProfileUpdateMutation`, `useProfileAvatarMutation`, `PasswordChangeForm`, `AppVersionInfo`, and `MainTabParamList` routes.
- Produces: local `ProfileSection` state and focused section UI without changing API payloads.

- [ ] **Step 1: Add the section model and switcher**

Define:

```ts
type ProfileSection = "profile" | "requirements" | "security" | "account";

const profileSections: Array<{
  id: ProfileSection;
  label: string;
}> = [
  { id: "profile", label: "Profile" },
  { id: "requirements", label: "Requirements" },
  { id: "security", label: "Security" },
  { id: "account", label: "Account" },
];
```

Render a horizontal `ScrollView` section switcher with 44px targets, selected red underline, and the missing count beside Requirements.

- [ ] **Step 2: Make required labels explicit**

Change `FieldLabel` so required fields render the word `Required` beside the field name. Keep the marker text visible in addition to color and do not mark school-managed optional fields as editable.

- [ ] **Step 3: Isolate Profile and Requirements**

Render identity fields, emergency contact, and Save only when `activeSection === "profile"`. Render the completion summary and `statusItems` only when `activeSection === "requirements"`, order incomplete items first, and add `Review in Profile` to switch sections.

- [ ] **Step 4: Isolate Security and Account**

Render `PasswordChangeForm` only in Security. In Account, render three full-width rows with these titles and descriptions:

```ts
[
  ["Transcript", "View official grades and academic records by school year."],
  ["Assessment History", "Review submissions, scores, feedback, and attempt details."],
  ["Evaluations", "Complete teacher and school evaluations assigned to you."],
]
```

Keep Sign Out and `AppVersionInfo` below those rows. Use existing navigation targets `Transcript`, `AssessmentHistory`, and `StudentEvaluations`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `cd mobile && npm test -- --runTestsByPath src/screens/__tests__/screen-render.test.tsx src/screens/__tests__/screen-copy-sanitization.test.ts src/navigation/__tests__/role-drawer-integration.test.ts`

Expected: all selected tests pass with zero failures.

### Task 3: Characterize the Web Section Contract

**Files:**
- Modify: `next-frontend/src/components/profile/StudentProfilePage.test.tsx`

**Interfaces:**
- Consumes: rendered `StudentProfilePage`, mocked `useRouter`, and mocked `ProfileSecurityCard`.
- Produces: four-tab and route expectations for the web implementation.

- [ ] **Step 1: Update the tab test**

Assert all four tabs exist and Profile is active by default. Switch to Requirements and assert missing names; switch to Security and assert `Profile Security Card`; switch to Account and assert three descriptive actions.

- [ ] **Step 2: Add route assertions**

Click the Account actions and assert:

```ts
expect(pushMock).toHaveBeenCalledWith('/dashboard/student/transcript');
expect(pushMock).toHaveBeenCalledWith('/dashboard/student/assessment-history');
expect(pushMock).toHaveBeenCalledWith('/dashboard/student/evaluations');
```

- [ ] **Step 3: Add required-indicator coverage**

Assert seven `Required` indicators are rendered for editable profile fields while six school-managed indicators remain read-only.

- [ ] **Step 4: Run the focused test and verify RED**

Run: `cd next-frontend && npm test -- --runInBand src/components/profile/StudentProfilePage.test.tsx`

Expected: FAIL because Requirements and Security tabs, the Evaluations action, and explicit Required indicators do not exist yet.

### Task 4: Implement the Web Section Workspace

**Files:**
- Modify: `next-frontend/src/components/profile/StudentProfilePage.tsx`
- Modify: `next-frontend/app/globals.css`

**Interfaces:**
- Consumes: existing profile service, auth service, `ProfileSecurityCard`, Radix `Tabs`, current CSS variables, and three existing student routes.
- Produces: controlled `ProfileSection` tab state and responsive rail/content layout.

- [ ] **Step 1: Add controlled section state**

Define `type ProfileSection = 'profile' | 'requirements' | 'security' | 'account'`, initialize `activeSection` to `profile`, and pass `value`/`onValueChange` to `Tabs`.

- [ ] **Step 2: Add explicit field requirements**

Extend `ProfileField` with `required?: boolean` and `missing?: boolean`. Render visible `Required` text and a missing-state helper/class. Pass `required` to date of birth, gender, student phone, home address, guardian name, relationship, and guardian contact.

- [ ] **Step 3: Split the four tab panels**

Keep identity, form, and Save in Profile. Move completion state and named required items into Requirements. Move `ProfileSecurityCard` into Security. Render the three Account actions with exact descriptions and existing routes.

- [ ] **Step 4: Update the help guide**

Change guide copy and screenshots from two tabs to four sections. The guide must name Requirements as the source of missing-field details and Account as the source of the three academic destinations.

- [ ] **Step 5: Apply restrained responsive CSS**

Add a desktop settings grid with a 13-15rem rail and one content region; use the current horizontal tab treatment below the narrow breakpoint. Use existing student variables, 8px-or-smaller card radius for new surfaces, solid backgrounds, restrained borders, no new gradients, and no hover transforms.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `cd next-frontend && npm test -- --runInBand src/components/profile/StudentProfilePage.test.tsx src/components/profile/ProfileSecurityCard.test.tsx`

Expected: all selected tests pass with zero failures.

### Task 5: Verify Both Client Surfaces

**Files:**
- Verify only unless a task-caused failure requires a bounded fix.

**Interfaces:**
- Consumes: final mobile/web source and tests.
- Produces: fresh local verification evidence.

- [ ] **Step 1: Run mobile gates**

Run:

```bash
cd mobile
npm run typecheck
npm test -- --runTestsByPath src/screens/__tests__/screen-render.test.tsx src/screens/__tests__/screen-copy-sanitization.test.ts src/navigation/__tests__/role-drawer-integration.test.ts
npm run audit:design
```

Expected: zero failures and exit code 0 for every command.

- [ ] **Step 2: Run web gates**

Run:

```bash
cd next-frontend
npm test -- --runInBand src/components/profile/StudentProfilePage.test.tsx src/components/profile/ProfileSecurityCard.test.tsx
npm run lint
npm run typecheck
npm run audit:student-palette
npm run build
```

Expected: zero failures and exit code 0 for every command.

- [ ] **Step 3: Browser-check responsive behavior**

Run the web app through the existing dev flow and inspect the profile route at narrow mobile width and desktop width. Verify section isolation, no overlapping labels, Requirements count, Account descriptions, and route pushes.

### Task 6: Package the Mobile Release

**Files:**
- Modify through existing tooling: `mobile/app.json`
- Modify through existing tooling: `mobile/android/app/build.gradle`
- Modify through existing tooling: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify through existing tooling: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: current release authority and `mobile/scripts/app-version-release.cjs`.
- Produces: synchronized version metadata, verified release APK, embedded download artifact, size, and SHA-256.

- [ ] **Step 1: Inspect current release metadata and script behavior**

Run `cd mobile && npm run test:release` and inspect `mobile/scripts/app-version-release.cjs` before changing versions.

- [ ] **Step 2: Prepare the next release using existing tooling**

Use `npm run release:prepare -- --help` or the script's documented arguments to bump and synchronize the next version without hand-editing generated checksum data.

- [ ] **Step 3: Build the configured Android release**

Set the repository-approved production `EXPO_PUBLIC_API_URL`, build `mobile/android/app/build/outputs/apk/release/app-release.apk`, and retain the full log and exit status.

- [ ] **Step 4: Verify and embed the artifact**

Run `npm run release:verify` and `npm run test:release`. Confirm archive integrity, package/version/versionCode, ABI, signature, alignment, byte equality, file size, and SHA-256 against the adjacent JSON manifest.

### Task 7: Commit, Push, and Observe

**Files:**
- Stage only task-owned source, tests, docs, and release artifacts.

**Interfaces:**
- Consumes: final verified diff and release artifact.
- Produces: pushed `developement` SHA, CI/deployment evidence, and live APK/download verification.

- [ ] **Step 1: Review final scope**

Run `git diff --check`, `git status --short --branch`, inspect the full task diff, and confirm the unrelated feature-analysis file remains unstaged.

- [ ] **Step 2: Commit and push**

Commit with a scoped message, fetch, verify every outgoing commit, push to `origin/developement`, and record the full SHA.

- [ ] **Step 3: Observe CI and deployment**

Use `gh run list --commit <sha>` and inspect applicable jobs until terminal. Correlate the Railway deployment to the exact tested SHA and verify provider success.

- [ ] **Step 4: Verify live delivery**

Compare live APK and manifest bytes/checksum/version to the committed release files. Report local, archive, CI, deployment, and live evidence separately; do not claim physical-device proof without it.

## Plan Self-Review

- Spec coverage: every section, state, route, contract freeze, test gate, Android packaging step, and shipping step has an owner.
- Placeholder scan: no `TBD`, `TODO`, “implement later,” or unnamed error-handling steps remain.
- Type consistency: both clients use `ProfileSection`; mobile route names and web paths match current owners.
- Scope: mobile and web are coupled consumers of one bounded profile redesign; splitting into separate projects would duplicate the information architecture and release acceptance.
