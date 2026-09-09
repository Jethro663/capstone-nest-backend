# Student Mobile Experience Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a calm P2-branded student mobile experience whose drawer, agenda Home, direct class/task lists, workspace selectors, and source-aware detail Back behavior form one coherent LMS without changing academic procedures or API contracts.

**Architecture:** Keep every existing query, mutation, permission, and screen route owner in place. Add student-specific presentation primitives and a pure navigation fallback resolver, then replace the large screen compositions around their existing data with flat lists and progressive disclosure. Route source metadata is optional and additive; native history always wins, while direct-entry fallbacks are role-safe.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation native stack/bottom tabs, TanStack Query, Jest with React Test Renderer, Android Gradle, GitHub Actions, Railway.

## Global Constraints

- Student role only; teacher behavior from release `0.1.26` must not regress.
- Keep all existing API endpoints, DTOs, mutations, cache keys, invalidations, role gates, academic rules, and error normalization.
- Preserve assessment Pending / Past Due / Completed / All semantics and Pending default.
- Preserve assessment-taking lock/back behavior, submission, results, history, lesson completion, module file open/download, discussion, profile editing/avatar, and JA procedures.
- P2 tokens are exact: canvas `#FBFAF8`, surface `#FFFFFF`, accent `#C96B68`, dark accent `#98484A`, tint `#FFF5F2`, border `#E7E3DF`, text `#0F172A`, muted `#64748B`.
- Keep semantic status colors distinct from the school accent; do not communicate state by color alone.
- Minimum interactive target is 44 px; honor safe areas, long text, keyboard overlap, and reduced motion.
- Native history wins for Back. Optional route source metadata exists only for direct entry or unusable history.
- Do not add a new backend contract for class imagery; use current subject identifiers and existing client-side accent data.
- Android release increments from version `0.1.26` / code `27`; iOS build number remains unchanged.

---

### Task 1: Student visual and navigation foundations

**Files:**
- Create: `mobile/src/components/student/StudentWorkspacePrimitives.tsx`
- Create: `mobile/src/components/student/__tests__/StudentWorkspacePrimitives.test.tsx`
- Create: `mobile/src/navigation/student-detail-back.ts`
- Create: `mobile/src/navigation/__tests__/student-detail-back.test.ts`
- Modify: `mobile/src/theme/studentDark.ts`
- Modify: `mobile/src/theme/__tests__/student-theme.test.ts`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/role-drawer-model.ts`
- Modify: `mobile/src/navigation/student-route-manifest.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Consumes: `RoleHeaderNavigationButton`, `ScreenScroll`, `Refreshable`, `RootStackParamList`, current P2 teacher tokens.
- Produces: `StudentScreen`, `StudentContextStrip`, `StudentWorkspaceSwitcher`, `StudentSegmentedControl`, `StudentSelectMenu`, `StudentFlatSection`, `StudentListRow`, `StudentInlineNotice`, `StudentActionSheet`, `StudentBottomActionBar`, and `goBackFromStudentDetail(navigation, routeName, params)`.

- [x] **Step 1: Write failing primitive and palette tests**

```tsx
expect(studentDarkTheme.bg).toBe("#FBFAF8");
expect(studentDarkTheme.red).toBe("#C96B68");
expect(studentDarkTheme.redText).toBe("#98484A");

const renderer = create(
  <StudentWorkspaceSwitcher
    activeKey="modules"
    items={[{ key: "modules", label: "Modules", icon: "book-outline" }]}
    onSelect={jest.fn()}
  />,
);
expect(renderer.root.findByProps({ accessibilityLabel: "Open class workspace menu" })).toBeTruthy();
```

- [x] **Step 2: Write failing direct-entry fallback tests**

```ts
expect(resolveStudentDetailFallback("ModuleDetail", { classId: "c1", moduleId: "m1" })).toEqual({
  name: "ClassDetail",
  params: { classId: "c1", initialTab: "modules" },
});
expect(resolveStudentDetailFallback("LessonDetail", { lessonId: "l1", classId: "c1", source: "module", moduleId: "m1" })).toEqual({
  name: "ModuleDetail",
  params: { classId: "c1", moduleId: "m1", source: "class" },
});
```

- [x] **Step 3: Run the focused tests and confirm RED**

Run:

```bash
npm --prefix mobile test -- --runInBand src/theme/__tests__/student-theme.test.ts src/components/student/__tests__/StudentWorkspacePrimitives.test.tsx src/navigation/__tests__/student-detail-back.test.ts
```

Expected: failures for the unimplemented P2 values, primitives, and fallback resolver.

- [x] **Step 4: Implement the shared primitives and additive source types**

Add optional sources without changing existing callers:

```ts
export type StudentClassDetailSource = "classes" | "home" | "calendar" | "courses";
export type StudentModuleDetailSource = "class";
export type StudentLessonDetailSource = "module" | "class" | "home" | "ja";
export type StudentAssessmentDetailSource = "assessments" | "class" | "home" | "calendar" | "history";
```

`StudentScreen` renders one compact safe-area-aware header and places `bottomAction` outside `ScreenScroll`. `StudentWorkspaceSwitcher`, `StudentSelectMenu`, and `StudentActionSheet` use native `Modal` with `onRequestClose`, a dismiss scrim, semantic selected/expanded states, and 44 px controls.

- [x] **Step 5: Add Calendar as a hidden student tab drawer destination without removing the contextual `Calendar` stack route**

```ts
// MainTabParamList
StudentCalendar: undefined;

// student drawer
{ label: "Calendar", route: "StudentCalendar", kind: "tab", icon: "calendar-month-outline" }
```

Mount `StudentCalendar` with `CalendarScreen` inside `StudentTabs`, keep the existing `RootStack` `Calendar` route for class-scoped and Home entries, and set `backBehavior="history"` on student tabs.

- [x] **Step 6: Run focused tests and confirm GREEN**

Run the Task 1 command plus:

```bash
npm --prefix mobile test -- --runInBand src/navigation/__tests__/role-drawer-integration.test.ts src/navigation/__tests__/admin-route-manifest.test.ts
npm --prefix mobile run typecheck
```

Expected: all focused suites pass and TypeScript accepts every additive route parameter.

- [x] **Step 7: Commit the foundation slice**

```bash
git add mobile/src/components/student mobile/src/navigation mobile/src/theme/studentDark.ts mobile/src/theme/__tests__/student-theme.test.ts
git commit -m "feat(mobile): add student workspace foundations"
```

### Task 2: Recompose Home as a guided agenda

**Files:**
- Create: `mobile/src/screens/student-home/model.ts`
- Create: `mobile/src/screens/student-home/__tests__/model.test.ts`
- Modify: `mobile/src/screens/DashboardScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`

**Interfaces:**
- Consumes: existing dashboard class/lesson/attempt/event snapshots and Task 1 student primitives.
- Produces: `buildStudentHomeAgenda(...)` returning `nextAction`, `today`, `continueLearning`, `dueSoon`, and `latestUpdate` with no new server calls.

- [x] **Step 1: Write the failing hierarchy/model tests**

```ts
expect(buildStudentHomeAgenda(input).nextAction?.kind).toBe("assessment");
expect(buildStudentHomeAgenda(input).dueSoon).toHaveLength(3);
```

```tsx
const text = flattenText(renderer.toJSON());
expect(text).toContain("Next for you");
expect(text).toContain("Today");
expect(text).toContain("Continue learning");
expect(text).toContain("Due soon");
expect(text).toContain("Latest update");
expect(text).not.toContain("Student Tools");
expect(text).not.toContain("Overall Performance");
```

- [x] **Step 2: Run the Home tests and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/student-home/__tests__/model.test.ts src/screens/__tests__/screen-render.test.tsx
```

Expected: the new model is missing and legacy Dashboard content assertions fail.

- [x] **Step 3: Implement the model from existing derived data**

Prioritize an overdue/pending assessment, then the first unfinished visible lesson, then the first current class. Limit Today to current-day schedules, Continue Learning to two entries, Due Soon to three entries, and Latest Update to one announcement. Keep unresolved-attempt safeguards: an unresolved or failed attempt query cannot be labeled Pending.

- [x] **Step 4: Replace only the Dashboard presentation**

Use `StudentScreen` and render the approved order. Remove the embedded month calendar, performance stat, avatar hero, and Student Tools block. Route each visible row to its existing destination with optional source metadata; keep notifications, refresh, and incomplete-profile notice.

- [x] **Step 5: Run Home tests and confirm GREEN**

Run the Task 2 test command and `npm --prefix mobile run typecheck`.

- [x] **Step 6: Commit the Home slice**

```bash
git add mobile/src/screens/DashboardScreen.tsx mobile/src/screens/student-home mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat(mobile): turn student home into an agenda"
```

### Task 3: Make Classes and Class Detail one coherent workspace

**Files:**
- Modify: `mobile/src/screens/LessonsScreen.tsx`
- Modify: `mobile/src/screens/ClassDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`
- Modify: `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`

**Interfaces:**
- Consumes: current class/module/completion/announcement/assessment queries, `StudentScreen`, `StudentWorkspaceSwitcher`, `StudentListRow`, and `goBackFromStudentDetail`.
- Produces: direct-open class rows and one seven-option Class Detail workspace selector.

- [x] **Step 1: Write failing class navigation and layout tests**

```tsx
expect(flattenText(classes.toJSON())).toContain("Current classes");
expect(flattenText(classes.toJSON())).not.toContain("Courses & Channels");
classes.root.findByProps({ accessibilityLabel: "Open Science 8" }).props.onPress();
expect(navigate).toHaveBeenCalledWith("ClassDetail", { classId: "class-1", source: "classes" });
```

```tsx
expect(classDetail.root.findByProps({ accessibilityLabel: "Open class workspace menu" })).toBeTruthy();
expect(flattenText(classDetail.toJSON())).not.toContain("More");
```

- [x] **Step 2: Run the focused screen suites and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/screen-render.test.tsx src/screens/__tests__/student-parity-navigation.test.tsx
```

- [x] **Step 3: Recompose My Classes**

Keep Current and Completed filters only. Preserve search, refresh, progress derivation, partial errors, and empty states. A class row is one modest surface with subject mark, section/teacher, next schedule, and progress; row tap opens `ClassDetail`. The optional trailing workspace button opens a sheet that navigates to the same class with `initialTab`.

- [x] **Step 4: Replace Class Detail visible tabs and overflow with the workspace selector**

Map the existing `DetailTab` values to selector items and retain every current workspace body. Keep one expanded module at a time. Pass sources to Module, Lesson, Assessment, and Calendar; use `goBackFromStudentDetail` for the header.

- [x] **Step 5: Run focused tests and typecheck**

Run the Task 3 command and `npm --prefix mobile run typecheck`. Expected: direct-open and selector assertions pass; all existing discussion, grade, announcement, calendar, and refresh assertions remain green.

- [x] **Step 6: Commit the class workspace slice**

```bash
git add mobile/src/screens/LessonsScreen.tsx mobile/src/screens/ClassDetailScreen.tsx mobile/src/screens/__tests__
git commit -m "feat(mobile): streamline student class workspaces"
```

### Task 4: Flatten Module and make Lesson reading-first

**Files:**
- Modify: `mobile/src/screens/ModuleDetailScreen.tsx`
- Modify: `mobile/src/screens/LessonDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`

**Interfaces:**
- Consumes: existing module detail, lesson detail, completion, file open/download behavior, Task 1 primitives, and source metadata from Task 3.
- Produces: flat module section lists, reading-first lesson content, sticky completion, and source-aware Back.

- [x] **Step 1: Write failing Module/Lesson structure and Back tests**

Assert `StudentContextStrip`, section dividers, direct lesson accessibility labels, file Open/Download labels, `student-bottom-action-bar`, and fallback calls. Keep assertions for locked/draft content exclusion and completion failure.

- [x] **Step 2: Run the focused render suite and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/screen-render.test.tsx src/navigation/__tests__/student-detail-back.test.ts
```

- [x] **Step 3: Recompose Module Detail**

Render compact class/module context, description/progress, then section headers and one divided list per section. Lesson/assessment rows navigate directly with source metadata. File rows keep both existing actions, loading labels, and normalized errors.

- [x] **Step 4: Recompose Lesson Detail**

Render title/context, overview text, and content blocks as reading sections separated by dividers. Keep images, extracted content, local understood state, pull-to-refresh, completion error, and `handleComplete`. Move Mark Complete into `StudentBottomActionBar`; remove the duplicate Back footer.

- [x] **Step 5: Run focused tests and typecheck**

Run the Task 4 command and `npm --prefix mobile run typecheck`.

- [x] **Step 6: Commit the learning detail slice**

```bash
git add mobile/src/screens/ModuleDetailScreen.tsx mobile/src/screens/LessonDetailScreen.tsx mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat(mobile): simplify student module and lesson views"
```

### Task 5: Modernize Assessments, Announcements, and Profile

**Files:**
- Modify: `mobile/src/screens/AssessmentsScreen.tsx`
- Modify: `mobile/src/screens/AnnouncementsScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/screens/AssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/AssessmentHistoryScreen.tsx`
- Modify: `mobile/src/screens/AssessmentResultsScreen.tsx`
- Modify: `mobile/src/screens/CalendarScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`
- Modify: `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`

**Interfaces:**
- Consumes: current assessment/attempt, announcement, profile/avatar, and calendar behavior plus Task 1 primitives.
- Produces: direct assessment rows, one class selector, flat announcement feed, grouped profile form, and complete assessment-chain source metadata.

- [x] **Step 1: Write failing root-surface assertions**

```tsx
expect(assessments.root.findByProps({ accessibilityLabel: "Assessment status filters" })).toBeTruthy();
expect(flattenText(assessments.toJSON())).not.toContain("Assessments & Actions");
expect(flattenText(announcements.toJSON())).not.toContain("PostsPinnedClasses");
expect(profile.root.findAllByProps({ accessibilityLabel: "Sign Out" })).toHaveLength(1);
```

Also assert that Sign Out follows the Security section in rendered order and that announcement Back closes the modal through `onRequestClose`.

- [x] **Step 2: Run focused suites and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/screen-render.test.tsx src/screens/__tests__/student-parity-navigation.test.tsx
```

- [x] **Step 3: Replace assessment accordion rows with direct task rows**

Retain the four status filters and Pending default. Add one class `StudentSelectMenu`, group rows by urgency, and route a row directly to `AssessmentDetail`. Keep header search/history and every empty/error state. No attempt is started from the list.

- [x] **Step 4: Flatten Announcements and group Profile**

Announcements gets one class selector, one All/Pinned toggle, pinned-first chronological rows, and the existing rich-text detail modal. Profile gets compact identity, conditional completeness notice, Personal/Contact/Emergency disclosure sections, Transcript/Evaluations rows, existing save/avatar behavior, and Sign Out at the bottom.

- [x] **Step 5: Harden the assessment and calendar navigation chain**

Pass optional source/parent identifiers through Assessment Detail → Take/Results/History and Calendar → Assessment/Class Detail. Use actual-history-first fallback on details, results, and history. Do not modify `AssessmentTakeScreen` attempt locking or submission behavior.

- [x] **Step 6: Run focused suites and typecheck**

Run the Task 5 command, assessment service/provider suites, and `npm --prefix mobile run typecheck`.

- [x] **Step 7: Commit the task/update/profile slice**

```bash
git add mobile/src/screens/AssessmentsScreen.tsx mobile/src/screens/AnnouncementsScreen.tsx mobile/src/screens/ProfileScreen.tsx mobile/src/screens/AssessmentDetailScreen.tsx mobile/src/screens/AssessmentHistoryScreen.tsx mobile/src/screens/AssessmentResultsScreen.tsx mobile/src/screens/CalendarScreen.tsx mobile/src/screens/__tests__
git commit -m "feat(mobile): modernize student tasks and profile"
```

### Task 6: Align JA and secondary records without changing procedures

**Files:**
- Modify: `mobile/src/screens/JaScreen.tsx`
- Modify: `mobile/src/screens/PerformanceScreen.tsx`
- Modify: `mobile/src/screens/TranscriptScreen.tsx`
- Modify: `mobile/src/screens/StudentEvaluationsScreen.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`

**Interfaces:**
- Consumes: existing JA chat/practice/review/LXP sessions and Task 1 primitives/theme.
- Produces: P2-aligned headers, selectors, notices, and flat record sections only.

- [x] **Step 1: Add failing presentation assertions**

Assert one compact JA header, a visible class context selector, existing New chat/history controls, and absence of decorative introductory panels. Assert Performance, Transcript, and Evaluations use the P2 canvas/surface theme and preserve their current values/actions.

- [x] **Step 2: Run the focused render suite and confirm RED**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/screen-render.test.tsx
```

- [x] **Step 3: Align presentation around existing behavior**

Replace only headers, panel shells, selectors, and section wrappers. Preserve every JA class/lesson requirement, stale-thread behavior, send gating, new-chat behavior, tool routing, practice/review/LXP mutation, and error message.

- [x] **Step 4: Run focused and full mobile verification**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand --silent
npm --prefix mobile run build:rich-text
git diff --exit-code -- mobile/src/generated/assessment-rich-text.ts
git diff --check
```

Expected: typecheck passes, every mobile suite is green, generated rich text is unchanged, and no whitespace errors remain.

- [x] **Step 5: Commit the final student UI slice**

```bash
git add mobile/src/screens/JaScreen.tsx mobile/src/screens/PerformanceScreen.tsx mobile/src/screens/TranscriptScreen.tsx mobile/src/screens/StudentEvaluationsScreen.tsx mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat(mobile): align student support and records"
```

### Task 7: Package, synchronize, and ship the Android release

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify through release script: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: complete student source, `mobile/scripts/app-version-release.cjs`, CI, Railway deploy workflow, `/api/app-version/register`, and `/api/app-version/check`.
- Produces: Android `0.1.27` / code `28`, a byte-matched public APK/manifest pair, and registered production update policy.

- [x] **Step 1: Bump Android version sources and release fixture**

Set Expo/Gradle version name to `0.1.27`, Android version code to `28`, preserve iOS build number `3`, and update the release fixture’s expected source versions and description.

- [x] **Step 2: Run release tests before building**

```bash
npm --prefix mobile run test:release
```

Expected: all release metadata tests pass.

- [x] **Step 3: Build the production ARM64 APK**

```bash
cd mobile/android
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
NODE_ENV=production \
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 \
ANDROID_HOME=/home/jethro/Android/Sdk \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
cd ../..
```

Expected: `BUILD SUCCESSFUL` and APK at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

- [x] **Step 4: Inspect, copy, prepare, and verify the exact artifact**

Use build-tools `36.0.0` to require package `com.nexora.lms.mobile`, version `0.1.27` / `28`, ARM64 libraries, REQUEST_INSTALL_PACKAGES, v2 signature, and 16 KB ZIP alignment. Copy the APK to the frontend, then run:

```bash
npm --prefix mobile run release:prepare -- \
  --min-supported-version-code 28 \
  --release-notes "Redesigns the student mobile experience with a guided agenda, direct class and assessment navigation, calm P2 school styling, streamlined learning details, and durable Back behavior."
npm --prefix mobile run release:verify
cmp mobile/android/app/build/outputs/apk/release/app-release.apk next-frontend/public/downloads/nexora-student-mobile-release.apk
```

- [x] **Step 5: Run final local gates and commit the reviewed release**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand --silent
npm --prefix mobile run test:release
ANDROID_HOME=/home/jethro/Android/Sdk npm --prefix mobile run release:verify
git diff --check
git status --short
```

Commit only reviewed student/release paths:

```bash
git add mobile next-frontend/public/downloads docs/superpowers/plans/2026-09-10-student-mobile-experience-redesign.md
git commit -m "feat(mobile): redesign student learning experience"
```

- [ ] **Step 6: Prevent branch divergence and push**

```bash
git fetch origin developement
git rev-list --left-right --count origin/developement...HEAD
git log --oneline origin/developement..HEAD
git push origin developement
git ls-remote origin refs/heads/developement
```

Require left count `0`; inspect every outgoing commit; require remote SHA to equal local `HEAD` after push.

- [ ] **Step 7: Verify exact-SHA CI and Railway deployment**

Wait for the CI run whose `headSha` equals the pushed SHA. Require Mobile, Frontend, Backend unit/lint, Backend e2e, AI service, coverage advisory, and PostgreSQL 16/18 migration/runtime jobs to succeed. Then require the workflow-run Railway deployment logs to show `TESTED_SHA` equal to the pushed SHA and Backend, Frontend, and AI jobs to succeed.

- [ ] **Step 8: Verify live bytes before registering policy**

Download the public JSON and APK with a cache-busting SHA query into a `mktemp -d` directory. Require `cmp` equality against the committed files, exact byte count and SHA-256, APK version `0.1.27` / `28`, ARM64 ABI, v2 signature, and 16 KB alignment.

- [ ] **Step 9: Register and read back the exact updater policy**

Use Railway-injected `CI_ADMIN_SECRET` without printing it to POST the committed JSON unchanged. Require code `27` / `0.1.26` to receive `apk_forced` with the exact size/SHA/URL and code `28` / `0.1.27` to receive `none`.

- [ ] **Step 10: Record the device evidence boundary and final synchronization**

Run `/home/jethro/Android/Sdk/platform-tools/adb devices -l`. If no device is listed, report physical install acceptance as unavailable rather than inferred. Finish with a clean working tree, `0 0` divergence, exact remote SHA, CI/Railway URLs, APK byte count/SHA/signing certificate, and live updater results.

## Plan self-review

- **Spec coverage:** Tasks cover the P2 shell, primary drawer, Home, Classes, Class Detail, Module, Lesson, Assessments, Announcements, Profile, JA, secondary records, source-aware Back, state handling, tests, APK, CI, deployment, and updater registration.
- **Frozen procedures:** Every behavior-changing surface explicitly preserves its query/mutation and official academic rules; only navigation metadata and presentation change.
- **Type consistency:** All source types introduced in Task 1 are consumed by Tasks 2–5; Task 7 uses version `0.1.27` / code `28` consistently.
- **Placeholder scan:** The plan contains no unresolved implementation placeholder or deferred requirement.
