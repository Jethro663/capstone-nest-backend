# Teacher Drawer Primary Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved teacher hamburger drawer the authoritative owner of every teacher primary workspace while preserving source-aware Back behavior for details and existing teacher procedures.

**Architecture:** Rename the teacher root surface to `TeacherDrawer` and keep the approved custom drawer UI around one hidden React Navigation primary navigator. Move all 14 teacher drawer destinations into that navigator, leave detail/modal/utility routes in the outer native stack, and route external teacher-primary actions through `TeacherDrawer` so peer workspaces never accumulate as detail pages.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation 6, React 19, TypeScript 5.9, Jest, Android Gradle.

## Global Constraints

- Preserve the existing drawer appearance, P2 GABHS palette, drawer order, APIs, mutations, role precedence, and all teacher procedures.
- Do not add `@react-navigation/drawer`, backend changes, database changes, or new API calls.
- Primary teacher pages show Hamburger and never visible Back; child/detail pages show Back on the left; `TeacherCreateAssessment` remains a modal with Cancel.
- Teacher drawer history uses `backBehavior="history"` so Android system Back returns to the prior primary workspace without creating outer-stack peers.
- Keep student and admin navigation behavior unchanged.
- Package Android as `0.1.25` / versionCode `26`, preserve iOS buildNumber `3`, and use the existing release tooling and public APK contract.

---

### Task 1: Lock the teacher drawer route contract

**Files:**
- Modify: `mobile/src/navigation/teacher-route-manifest.ts`
- Modify: `mobile/src/screens/screen-flow.ts`
- Modify: `mobile/src/screens/__tests__/teacher-parity-navigation.test.ts`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Produces: `teacherDrawerRouteNames`, `TeacherDrawerRouteName`, drawer/stack route inventory, and drawer web-parity coverage.
- Preserves: `teacherParityRouteNames`, `teacherStackRouteNames`, and every existing route name.

- [x] **Step 1: Write failing route-contract tests**

```ts
expect(teacherDrawerRouteNames).toEqual([
  "Home", "Classes", "Sections", "Assessments", "TeacherCalendar",
  "TeacherLessons", "TeacherLibrary", "TeacherClassRecord", "TeacherAnnouncements",
  "TeacherReports", "TeacherInterventions", "TeacherPerformance", "TeacherEvaluations", "Profile",
]);
expect(teacherStackRouteNames).not.toContain("TeacherCalendar");
expect(flattenRoleDrawerDestinations("teacher").every((item) => item.kind === "tab")).toBe(true);
```

- [x] **Step 2: Run RED verification**

Run: `npm test -- --runInBand src/screens/__tests__/teacher-parity-navigation.test.ts src/navigation/__tests__/role-drawer-integration.test.ts src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx` from `mobile/`.

Expected: FAIL because the manifest still has five tabs plus nine stack roots.

- [x] **Step 3: Implement the manifest split**

```ts
export const teacherRouteManifest = {
  drawer: [
    "Home", "Classes", "Sections", "Assessments", "TeacherCalendar",
    "TeacherLessons", "TeacherLibrary", "TeacherClassRecord", "TeacherAnnouncements",
    "TeacherReports", "TeacherInterventions", "TeacherPerformance", "TeacherEvaluations", "Profile",
  ] as const,
  stack: [
    "TeacherClassDetail", "TeacherModuleDetail", "TeacherModuleFileDetail",
    "TeacherLessonDetail", "TeacherLessonEditor", "TeacherAssessmentDetail",
    "TeacherAssessmentEditor", "TeacherAssessmentReview", "TeacherAssessmentAttemptResult",
    "TeacherCreateModule", "TeacherCreateAssessment", "TeacherClassAddStudents",
    "TeacherClassStudentOverview", "TeacherSectionDetail", "TeacherSectionAddStudents",
    "TeacherSectionStudentProfile", "TeacherExtractionDetail", "TeacherAiDraft",
    "TeacherInterventionDetail", "TeacherMore",
  ] as const,
} as const;
```

Change the teacher drawer model’s nine `kind: "stack"` values to `kind: "tab"`, mark primary web mappings as `coverage: "drawer"`, and map `/dashboard/teacher/lessons` to `TeacherLessons`.

- [x] **Step 4: Run GREEN verification**

Run the Step 2 command and expect all suites to pass.

---

### Task 2: Make TeacherDrawer the primary navigator

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/screens/TeacherCalendarScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonsScreen.tsx`
- Modify: `mobile/src/screens/TeacherLibraryScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassRecordScreen.tsx`
- Modify: `mobile/src/screens/TeacherAnnouncementsScreen.tsx`
- Modify: `mobile/src/screens/TeacherReportsScreen.tsx`
- Modify: `mobile/src/screens/TeacherInterventionsScreen.tsx`
- Modify: `mobile/src/screens/TeacherPerformanceScreen.tsx`
- Modify: `mobile/src/screens/TeacherEvaluationsScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherDeepParityScreens.tsx`
- Modify: `mobile/src/screens/TeacherMoreScreen.tsx`
- Modify: `mobile/src/providers/LiveNotificationProvider.tsx`
- Modify: `mobile/src/utils/mobile-notification-routing.ts`
- Create: `mobile/src/utils/__tests__/mobile-notification-routing.test.ts`

**Interfaces:**
- Produces: root route `TeacherDrawer`, 14 primary `MainTabParamList` entries, and role-aware notification navigation.
- Consumes: existing `RoleDrawerProvider`, `navigateFromRoleDrawer`, and all current screen components.

- [x] **Step 1: Add failing source and notification-routing tests**

```ts
expect(teacherNavigatorSource).toContain('name="TeacherDrawer" component={TeacherDrawerNavigator}');
expect(teacherNavigatorSource).not.toContain('<RootStack.Screen name="TeacherCalendar"');
expect(resolveMobileNotificationAction(teacherReminder, "teacher")).toMatchObject({
  routeName: "TeacherDrawer",
  params: { screen: "TeacherInterventions", params: { classId: "class-1" } },
});
```

- [x] **Step 2: Run RED verification**

Run: `npm test -- --runInBand src/navigation/__tests__/role-drawer-integration.test.ts src/utils/__tests__/mobile-notification-routing.test.ts` from `mobile/`.

Expected: FAIL because `TeacherTabs` still owns five routes and notification actions still target removed outer-stack roots.

- [x] **Step 3: Implement TeacherDrawer and update callers**

```tsx
function TeacherDrawerNavigator() {
  return (
    <RoleDrawerProvider role="teacher" activeRouteName={activeRouteName} onNavigate={navigateFromTeacherDrawer}>
      <Tab.Navigator backBehavior="history" screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tab.Screen name="Home" component={TeacherHomeScreen} />
        <Tab.Screen name="Classes" component={TeacherClassesScreen} />
        <Tab.Screen name="Sections" component={TeacherSectionsScreen} />
        <Tab.Screen name="Assessments" component={TeacherAssessmentsScreen} />
        <Tab.Screen name="TeacherCalendar" component={TeacherCalendarScreen} />
        <Tab.Screen name="TeacherLessons" component={TeacherLessonsScreen} />
        <Tab.Screen name="TeacherLibrary" component={TeacherLibraryScreen} />
        <Tab.Screen name="TeacherClassRecord" component={TeacherClassRecordScreen} />
        <Tab.Screen name="TeacherAnnouncements" component={TeacherAnnouncementsScreen} />
        <Tab.Screen name="TeacherReports" component={TeacherReportsScreen} />
        <Tab.Screen name="TeacherInterventions" component={TeacherInterventionsScreen} />
        <Tab.Screen name="TeacherPerformance" component={TeacherPerformanceScreen} />
        <Tab.Screen name="TeacherEvaluations" component={TeacherEvaluationsScreen} />
        <Tab.Screen name="Profile" component={TeacherProfileScreen} />
      </Tab.Navigator>
    </RoleDrawerProvider>
  );
}

function TeacherNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="TeacherDrawer" component={TeacherDrawerNavigator} />
      <RootStack.Screen name="Notifications" component={NotificationsInboxScreen} />
      <RootStack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
      <RootStack.Screen name="TeacherModuleDetail" component={TeacherModuleDetailScreen} />
      <RootStack.Screen name="TeacherModuleFileDetail" component={TeacherModuleFileDetailScreen} />
      <RootStack.Screen name="TeacherLessonDetail" component={TeacherLessonDetailScreen} />
      <RootStack.Screen name="TeacherLessonEditor" component={TeacherLessonEditorScreen} />
      <RootStack.Screen name="TeacherAssessmentDetail" component={TeacherAssessmentDetailScreen} />
      <RootStack.Screen name="TeacherAssessmentEditor" component={TeacherAssessmentEditorScreen} />
      <RootStack.Screen name="TeacherAssessmentReview" component={TeacherAssessmentReviewScreen} />
      <RootStack.Screen name="TeacherAssessmentAttemptResult" component={TeacherAssessmentAttemptResultScreen} />
      <RootStack.Screen name="TeacherCreateModule" component={TeacherCreateModuleScreen} />
      <RootStack.Screen name="TeacherCreateAssessment" component={TeacherCreateAssessmentScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="TeacherClassAddStudents" component={TeacherClassAddStudentsScreen} />
      <RootStack.Screen name="TeacherClassStudentOverview" component={TeacherClassStudentOverviewScreen} />
      <RootStack.Screen name="TeacherSectionDetail" component={TeacherSectionDetailScreen} />
      <RootStack.Screen name="TeacherSectionAddStudents" component={TeacherSectionAddStudentsScreen} />
      <RootStack.Screen name="TeacherSectionStudentProfile" component={TeacherSectionStudentProfileScreen} />
      <RootStack.Screen name="TeacherExtractionDetail" component={TeacherExtractionDetailScreen} />
      <RootStack.Screen name="TeacherAiDraft" component={TeacherAiDraftScreen} />
      <RootStack.Screen name="TeacherInterventionDetail" component={TeacherInterventionDetailScreen} />
      <RootStack.Screen name="TeacherMore" component={TeacherMoreScreen} />
    </RootStack.Navigator>
  );
}
```

Use composite bottom-tab/native-stack props for the nine promoted screens. Route teacher-primary actions from detail screens and notification providers as `TeacherDrawer` with `{ screen, params }`; keep detail actions on the outer stack.

- [x] **Step 4: Run GREEN verification**

Run the Step 2 command plus `npm run typecheck`; expect zero failures.

---

### Task 3: Normalize teacher header and Back behavior

**Files:**
- Modify: `mobile/src/screens/TeacherCalendarScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonsScreen.tsx`
- Modify: `mobile/src/screens/TeacherLibraryScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassRecordScreen.tsx`
- Modify: `mobile/src/screens/TeacherAnnouncementsScreen.tsx`
- Modify: `mobile/src/screens/TeacherReportsScreen.tsx`
- Modify: `mobile/src/screens/TeacherInterventionsScreen.tsx`
- Modify: `mobile/src/screens/TeacherPerformanceScreen.tsx`
- Modify: `mobile/src/screens/TeacherEvaluationsScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherSectionDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentReviewScreen.tsx`
- Modify: `mobile/src/screens/TeacherCreateModuleScreen.tsx`
- Modify: `mobile/src/screens/NotificationsInboxScreen.tsx`
- Modify: `mobile/src/navigation/__tests__/role-drawer-integration.test.ts`

**Interfaces:**
- Primary header contract: default `TeacherScreen` hamburger.
- Detail header contract: `showBackButton` plus `onBackPress` on the left.
- Notification utility contract: visible Back with role-aware no-history fallback.

- [x] **Step 1: Add failing header classification tests**

```ts
for (const primary of teacherPrimarySources) expect(primary).not.toContain("showBackButton");
for (const detail of normalizedDetailSources) {
  expect(detail).toContain("showBackButton");
  expect(detail).toContain("onBackPress={() => navigation.goBack()}");
}
expect(notificationSource).toContain('accessibilityLabel="Back"');
```

- [x] **Step 2: Run RED verification**

Run: `npm test -- --runInBand src/navigation/__tests__/role-drawer-integration.test.ts` from `mobile/`.

Expected: FAIL on primary Back buttons, right-side detail Back actions, and Notifications.

- [x] **Step 3: Apply the header contract**

```tsx
<TeacherScreen
  title="Detail title"
  showBackButton
  onBackPress={() => navigation.goBack()}
>
```

Remove Back from `rightAction` on the seven detail pages. Add a 44-by-44 accessible left Back control to Notifications; when there is no history, navigate teachers to `TeacherDrawer/Home`, students to `MainTabs/Dashboard`, and admins to `MainTabs/Home`.

- [x] **Step 4: Run GREEN verification**

Run the Step 2 command and the affected screen suites; expect zero failures.

---

### Task 4: Verify, package, and ship

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Update through script: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Produces: Android `0.1.25` / versionCode `26`, exact APK manifest/checksum, scoped commit, pushed `developement` revision, and observed CI/deployment.

- [x] **Step 1: Run source gates**

Run focused navigation/screen tests, `npm run typecheck`, complete `npm run test`, Expo production export with the production API, and `git diff --check`.

- [x] **Step 2: Update release identity test first and verify RED**

```js
assert.equal(appJson.expo.version, "0.1.25");
assert.equal(appJson.expo.android.versionCode, 26);
assert.match(buildGradle, /\bversionCode\s+26\b/);
assert.match(buildGradle, /\bversionName\s+["']0\.1\.25["']/);
assert.equal(appJson.expo.ios.buildNumber, "3");
```

- [x] **Step 3: Bump Android/Expo identity, build, and embed**

Set Expo/Gradle to `0.1.25` / `26`, keep iOS buildNumber `3`, build the release APK under Java 17 with the production `EXPO_PUBLIC_API_URL`, validate package/version/ABI/signature/alignment/backend URL, and run:

`npm run release:prepare -- --release-notes "Makes the teacher drawer the primary navigator and preserves source-aware detail navigation."`

Then run `npm run release:verify` and `npm run test:release`.

- [ ] **Step 4: Final audit and publication**

Rerun affected gates after packaging, inspect the full diff and staged diff, fetch `origin`, verify every outgoing commit, commit only task-owned files, push to `origin/developement`, confirm exact-SHA equality, observe exact-SHA CI and Railway deployment, and verify the served APK and manifest match the packaged files.
