# Mobile Role Drawer and Teacher Home Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native mobile bottom bar with a shared role-aware hamburger drawer, restyle the teacher workspace with the approved P2 palette, and rebuild Teacher Home as a calm 50/50 agenda-and-class overview without changing routes, APIs, or procedures.

**Architecture:** Keep each existing React Navigation tab navigator as the state and route owner, hide only its visual tab bar, and mount a custom modal drawer around the tab navigator. A small drawer context supplies the root-screen hamburger while stack detail screens retain their existing back buttons. Teacher Home derives its next class, today's agenda, priority, shortcuts, and recent update from the data already queried by the screen.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation 6, React 19, TypeScript, Jest with react-test-renderer, Gradle Android release tooling.

## Global Constraints

- Preserve all existing backend endpoints, DTOs, query procedures, route names, navigation destinations, and role precedence `admin -> teacher -> student`.
- Apply the drawer shell to student, teacher, and admin roles, but redesign only Teacher Home content in this release.
- Use P2 tokens exactly: canvas `#FBFAF8`, surface `#FFFFFF`, accent `#C96B68`, dark accent `#98484A`, tint `#FFF5F2`, border `#E7E3DF`.
- Use red only for active navigation, links/status markers, and the single priority edge; do not tint the whole page or every border red.
- Root tab pages show a hamburger at top-left; stack/detail/create pages preserve their back behavior.
- The teacher drawer uses grouped destinations and omits the redundant `TeacherMore` launch point; its footer opens Profile and does not add logout.
- Do not add `@react-navigation/drawer` or a new API request.
- Ship Android `0.1.24` / versionCode `25`, embed the verified APK in the frontend download path, and register the exact live artifact only after deployment.

---

### Task 1: Role drawer contract and presentation

**Files:**
- Create: `mobile/src/navigation/role-drawer-model.ts`
- Create: `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
- Create: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Produces: `RoleDrawerRole`, `RoleDrawerDestination`, `ROLE_DRAWER_GROUPS`, `RoleDrawerProvider`, `RoleMenuButton`, `RoleHeaderNavigationButton`, and `useRoleDrawer()`.
- Navigation callback: `(destination: RoleDrawerDestination) => void`; tab entries use `kind: "tab"`, stack entries use `kind: "stack"`.

- [x] **Step 1: Write the failing drawer tests**

```tsx
expect(ROLE_DRAWER_GROUPS.teacher.map((group) => group.label)).toEqual([
  "Teaching", "Content & records", "Insights & support",
]);
expect(flattenDestinations("teacher").map((item) => item.label)).toEqual([
  "Home", "My Classes", "My Sections", "Assessments", "Calendar",
  "Lessons", "Nexora Library", "Class Record", "Announcements",
  "Reports", "Interventions", "Performance", "Evaluations",
]);
expect(flattenDestinations("teacher").some((item) => item.route === "TeacherMore")).toBe(false);
expect(flattenDestinations("student").map((item) => item.route)).toEqual([
  "Dashboard", "Classes", "Assessments", "JA", "Announcements",
]);
expect(flattenDestinations("admin").map((item) => item.route)).toEqual([
  "Home", "Classes", "Assessments", "Academic",
]);
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

Expected: FAIL because the drawer model/component modules do not exist.

- [x] **Step 3: Implement the minimal drawer model and accessible 84%-width modal**

```ts
export type RoleDrawerDestination = {
  label: string;
  route: keyof MainTabParamList | keyof RootStackParamList;
  kind: "tab" | "stack";
  icon: IconName;
};

export const ROLE_DRAWER_GROUPS = {
  teacher: [
    { label: "Teaching", items: [
      { label: "Home", route: "Home", kind: "tab", icon: "home-outline" },
      { label: "My Classes", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
      { label: "My Sections", route: "Sections", kind: "tab", icon: "account-group-outline" },
      { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
      { label: "Calendar", route: "TeacherCalendar", kind: "stack", icon: "calendar-month-outline" },
    ] },
    { label: "Content & records", items: [
      { label: "Lessons", route: "TeacherLessons", kind: "stack", icon: "book-education-outline" },
      { label: "Nexora Library", route: "TeacherLibrary", kind: "stack", icon: "bookshelf" },
      { label: "Class Record", route: "TeacherClassRecord", kind: "stack", icon: "table-large" },
      { label: "Announcements", route: "TeacherAnnouncements", kind: "stack", icon: "bullhorn-outline" },
    ] },
    { label: "Insights & support", items: [
      { label: "Reports", route: "TeacherReports", kind: "stack", icon: "file-chart-outline" },
      { label: "Interventions", route: "TeacherInterventions", kind: "stack", icon: "account-heart-outline" },
      { label: "Performance", route: "TeacherPerformance", kind: "stack", icon: "chart-line" },
      { label: "Evaluations", route: "TeacherEvaluations", kind: "stack", icon: "clipboard-check-outline" },
    ] },
  ],
  student: [{ label: "Learning", items: [
    { label: "Home", route: "Dashboard", kind: "tab", icon: "home-outline" },
    { label: "My Classes", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
    { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
    { label: "JA", route: "JA", kind: "tab", icon: "creation-outline" },
    { label: "Announcements", route: "Announcements", kind: "tab", icon: "bullhorn-outline" },
  ] }],
  admin: [{ label: "Administration", items: [
    { label: "Home", route: "Home", kind: "tab", icon: "home-outline" },
    { label: "Classes", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
    { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
    { label: "Academic", route: "Academic", kind: "tab", icon: "school-outline" },
  ] }],
} satisfies Record<RoleDrawerRole, readonly RoleDrawerGroup[]>;
```

Render a transparent `Modal`, a dismissible backdrop, a drawer with `width: Math.min(windowWidth * 0.84, 380)`, neutral borders, the GABHS seal, grouped accessible `Pressable` items, and a shared Profile footer. `RoleMenuButton` must expose `accessibilityLabel="Open navigation menu"` and use a 44-by-44 touch target.

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

Expected: PASS with all three role manifests, drawer open/close behavior, active state, navigation callbacks, and 84%-width assertion covered.

---

### Task 2: Preserve route procedures while replacing the bottom bar

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Delete: `mobile/src/components/ui/BottomTabBar.tsx`
- Delete: `mobile/src/components/ui/__tests__/BottomTabBar.test.tsx`
- Modify: `mobile/src/components/teacher/TeacherMobilePrimitives.tsx`
- Modify: `mobile/src/screens/DashboardScreen.tsx`
- Modify: `mobile/src/screens/AssessmentsScreen.tsx`
- Modify: `mobile/src/screens/LessonsScreen.tsx`
- Modify: `mobile/src/screens/JaScreen.tsx`
- Modify: `mobile/src/screens/AnnouncementsScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`
- Modify: `mobile/src/navigation/__tests__/admin-route-manifest.test.ts`
- Create: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Consumes: `RoleDrawerProvider`, `RoleMenuButton`, `RoleDrawerDestination` from Task 1.
- Produces: unchanged tab and root-stack route names with hidden tab-bar chrome and role drawer navigation.

- [x] **Step 1: Extend tests to require hamburger/back precedence and hidden bottom bars**

```tsx
expect(renderer.root.findByProps({ accessibilityLabel: "Open navigation menu" })).toBeTruthy();
expect(detailRenderer.root.findAllByProps({ accessibilityLabel: "Open navigation menu" })).toHaveLength(0);
expect(detailRenderer.root.findByProps({ accessibilityLabel: "Back" })).toBeTruthy();
expect(source).toContain('tabBar={() => null}');
expect(source).not.toContain('<BottomTabBar');
```

- [x] **Step 2: Run the focused tests and confirm RED**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx src/navigation/__tests__/admin-route-manifest.test.ts`

Expected: FAIL because root screens still render the red rail or existing header controls and `AppNavigator` still mounts `BottomTabBar`.

- [x] **Step 3: Wrap each tab navigator and route drawer destinations without contract changes**

```tsx
<RoleDrawerProvider role="teacher" onNavigate={handleDrawerNavigate} activeRouteName={activeRouteName}>
  <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={() => null}>
    <Tab.Screen name="Home" component={TeacherHomeScreen} />
    <Tab.Screen name="Assessments" component={TeacherAssessmentsScreen} />
    <Tab.Screen name="Classes" component={TeacherClassesScreen} />
    <Tab.Screen name="Sections" component={TeacherSectionsScreen} />
    <Tab.Screen name="Profile" component={TeacherProfileScreen} />
  </Tab.Navigator>
</RoleDrawerProvider>
```

For `kind: "tab"`, navigate to `MainTabs` with the existing tab screen name. For `kind: "stack"`, call the existing root route name. Update `TeacherScreen` so `showBackButton` wins; otherwise it renders `RoleMenuButton`. Insert the same menu button in each student root header without changing student screen content or actions.

- [x] **Step 4: Run the focused tests and confirm GREEN**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx src/navigation/__tests__/admin-route-manifest.test.ts src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

Expected: PASS and all existing route manifests remain mounted.

---

### Task 3: Apply the P2 campus palette

**Files:**
- Modify: `mobile/src/theme/teacher.ts`
- Modify: `mobile/src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`

**Interfaces:**
- Produces: existing `teacherTheme` keys with new exact values; no consumer API changes.

- [x] **Step 1: Change the palette test first**

```ts
expect(teacherTheme.bg).toBe("#FBFAF8");
expect(teacherTheme.surface).toBe("#FFFFFF");
expect(teacherTheme.red).toBe("#C96B68");
expect(teacherTheme.redText).toBe("#98484A");
expect(teacherTheme.redSoft).toBe("#FFF5F2");
expect(teacherTheme.border).toBe("#E7E3DF");
```

- [x] **Step 2: Run the primitive test and confirm RED**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`

Expected: FAIL showing the former saturated values.

- [x] **Step 3: Replace the teacher theme tokens**

```ts
export const teacherTheme = {
  bg: "#FBFAF8", pageBg: "#FBFAF8", header: "#FFFFFF", topbar: "#FFFFFF",
  surface: "#FFFFFF", surface2: "#FFF5F2", active: "#FFF5F2", channel: "#FFF5F2",
  border: "#E7E3DF", border2: "#DFC8C3", red: "#C96B68", redText: "#98484A",
  redSoft: "#FFF5F2", redLine: "rgba(201,107,104,0.24)",
  blue: "#4D6D85", blueSoft: "#EEF4F7", blueLine: "rgba(77,109,133,0.22)",
  purple: "#765D7C", purpleSoft: "#F5F0F6", deepBlue: "#98484A",
  text: "#0F172A", muted: "#64748B", dim: "#94A3B8", subtext: "#475569",
  green: colors.green, greenSoft: colors.paleGreen, greenLine: "rgba(22,101,52,0.22)",
  amber: colors.amber, amberSoft: colors.paleAmber, deepNavy: "#0F172A",
} as const;
```

- [x] **Step 4: Run the primitive test and confirm GREEN**

Run: `npm --prefix mobile test -- --runTestsByPath src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx`

Expected: PASS.

---

### Task 4: Build the 50/50 Teacher Home model and layout

**Files:**
- Create: `mobile/src/screens/teacher-home/model.ts`
- Create: `mobile/src/screens/teacher-home/__tests__/model.test.ts`
- Modify: `mobile/src/screens/TeacherHomeScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-mobile-render.test.tsx`

**Interfaces:**
- Produces: `buildTeacherHomeSchedule(classes, now)`, `selectTeacherHomePriority(input, now)`, and `formatTeacherHomeDate(now)`.
- Consumes: existing class schedules, current assessment query results, announcement query results, and intervention query results only.

- [x] **Step 1: Write deterministic schedule and priority tests**

```ts
const schedule = buildTeacherHomeSchedule([
  { id: "early", subjectCode: "ENG", schedules: [{ days: ["WED"], startTime: "08:00", endTime: "09:00" }] },
  { id: "late", subjectCode: "SCI", schedules: [{ days: ["W"], startTime: "10:00", endTime: "11:00" }] },
] as ClassItem[], new Date("2026-09-09T08:30:00+08:00"));
expect(schedule.map((item) => item.classItem.id)).toEqual(["early", "late"]);
expect(schedule.find((item) => item.isNext)?.classItem.id).toBe("late");

expect(selectTeacherHomePriority({ upcomingAssessments: [], draftCount: 2, interventionCount: 1 }, now).kind).toBe("intervention");
```

- [x] **Step 2: Run model and screen tests and confirm RED**

Run: `npm --prefix mobile test -- --runTestsByPath src/screens/teacher-home/__tests__/model.test.ts src/screens/__tests__/teacher-mobile-render.test.tsx`

Expected: FAIL because the model is absent and the screen still renders quick actions plus accordion headings.

- [x] **Step 3: Implement the pure model and replace the accordion wall**

Render, in order: compact date/greeting, `Next up`, `Today`, `Priority`, `Your classes`, and `Recent update`. `Next up` opens the existing class detail; timeline rows use schedule time and room; priority links to the existing assessment/intervention route; exactly two class shortcuts appear before the lower update. Use neutral dividers and one P2-red priority edge. Do not render `TeacherAccordionSection`, `TeacherActionButton`, `TeacherStats`, or `TeacherMore`.

- [x] **Step 4: Run model and screen tests and confirm GREEN**

Run: `npm --prefix mobile test -- --runTestsByPath src/screens/teacher-home/__tests__/model.test.ts src/screens/__tests__/teacher-mobile-render.test.tsx`

Expected: PASS with the approved section order and old accordion/quick-action copy absent.

---

### Task 5: Verify mobile behavior and release identity

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`

**Interfaces:**
- Produces: native version `0.1.24`, Android versionCode `25`, unchanged iOS buildNumber `3`.

- [x] **Step 1: Update the release identity test and confirm RED**

```js
test("role drawer and teacher home hotfix release keeps Expo and Gradle at 0.1.24 build 25", async () => {
  assert.equal(appJson.expo.version, "0.1.24");
  assert.equal(appJson.expo.android.versionCode, 25);
  assert.match(buildGradle, /\bversionCode\s+25\b/);
  assert.match(buildGradle, /\bversionName\s+["']0\.1\.24["']/);
});
```

Run: `npm --prefix mobile run test:release`

Expected: FAIL against `0.1.23` / `24`.

- [x] **Step 2: Bump only Android/Expo native identity and confirm GREEN**

Set Expo `version` to `0.1.24`, Expo Android `versionCode` to `25`, Gradle `versionCode` to `25`, and Gradle `versionName` to `0.1.24`; do not alter `ios.buildNumber`.

Run: `npm --prefix mobile run test:release`

Expected: PASS.

- [x] **Step 3: Run focused and full mobile verification**

Run:

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand
npm --prefix mobile run build:rich-text
git diff --exit-code -- mobile/src/components/ui/assessmentRichText.generated.tsx
```

Expected: all commands exit 0 and the generated rich-text file stays clean.

---

### Task 6: Build, embed, verify, and ship the APK

**Files:**
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: passing source tree from Tasks 1-5.
- Produces: ARM64 APK and matching download manifest for versionCode `25`.

- [x] **Step 1: Build the production-URL ARM64 APK**

Run from `mobile/android`:

```bash
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 \
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
```

Expected: `BUILD SUCCESSFUL` and `app-release.apk` exists.

- [x] **Step 2: Inspect and embed the exact artifact**

Use `aapt dump badging`, `unzip -l`, `zipalign -c`, `apksigner verify --verbose --print-certs`, SHA-256, byte-size, ABI, API URL, and forbidden-secret scans. Copy that exact APK to `next-frontend/public/downloads/nexora-student-mobile-release.apk`.

Run:

```bash
npm --prefix mobile run release:prepare -- --min-supported-version-code 25 --release-notes "Adds the shared role navigation drawer, calmer P2 campus palette, and redesigned teacher Home overview."
npm --prefix mobile run release:verify
npm --prefix mobile run test:release
```

Expected: all metadata agrees on `0.1.24` / `25`, the manifest SHA and size equal the embedded APK, and no secret is embedded.

- [ ] **Step 3: Review, commit, and push only the scoped diff**

Run `git diff --check`, inspect `git diff --stat` and all changed hunks, run the workflow smoke set, request code review, then commit with `feat(mobile): add role navigation drawer` and push `developement`.

- [ ] **Step 4: Correlate exact-SHA CI and Railway deployments**

Wait for every required GitHub Actions job for the pushed SHA to reach terminal success. Verify Railway backend, frontend, and AI deployments are healthy and that the frontend deployment is built from that exact SHA.

- [ ] **Step 5: Verify live bytes before updater registration**

Fetch the live JSON manifest and APK; compare live SHA-256 and byte-size to the repository artifact. Only then register the manifest through `/api/app-version/register` using Railway-injected `CI_ADMIN_SECRET` without printing the secret.

- [ ] **Step 6: Verify admission policy and device evidence**

Confirm build `24` receives `apk_forced`, build `25` receives no update, and `adb devices -l` is checked. If no physical/emulator device is present, report that runtime-install limitation explicitly; also disclose the signing identity returned by `apksigner`.

---

## Self-Review Result

- Spec coverage: the plan covers all-role drawer navigation, teacher-only Home redesign, A2/A1 50/50 hierarchy, P2 palette, compact root headers, preserved detail backs, unchanged procedures/APIs, removal of visible bottom navigation, and embedded APK release synchronization.
- Placeholder scan: no `TBD`, `TODO`, “implement later,” abbreviated destination arrays, or unspecified error-handling steps remain.
- Type consistency: drawer role/destination/provider names, tab-versus-stack routing, Teacher Home helper signatures, version identity, and artifact paths are consistent across tasks.
