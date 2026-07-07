# Student Mobile Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `mobile` to full student-web parity using live backend data, with Android-verified navigation, read flows, and write flows matching the current student web app.

**Architecture:** Treat `next-frontend/app/(dashboard)/dashboard/student/*` as the route and UI source of truth and `next-frontend/src/services/*` as the backend capability map. Expand `mobile` by first widening typed navigation and service coverage, then implementing parity screens in vertical slices, and verifying each slice through Jest/typecheck plus Expo Android/ADB checks.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, React Query, TypeScript, Jest, Android emulator/ADB, existing NestJS backend APIs

---

## File Map

### Existing files to modify

- `mobile/src/navigation/types.ts`
  - Expand the student route tree so every student web route has a typed mobile counterpart.
- `mobile/src/navigation/AppNavigator.tsx`
  - Replace the current limited student stack with the parity stack and tab shell.
- `mobile/src/api/hooks.ts`
  - Add query keys, hooks, and invalidation rules for all new parity services and screens.
- `mobile/src/api/services/assessments.ts`
  - Extend student assessment coverage to include history and any missing detail/result calls.
- `mobile/src/api/services/classes.ts`
  - Support richer class detail parity.
- `mobile/src/api/services/lessons.ts`
  - Support lesson detail parity and any missing completion-related endpoints.
- `mobile/src/api/services/modules.ts`
  - Add module detail parity call mirroring the web service.
- `mobile/src/api/services/announcements.ts`
  - Preserve parity for class-scoped announcements and any dashboard aggregation needs.
- `mobile/src/api/services/ai.ts`
  - Reuse for chatbot/tutor parity, only widening if student web uses an additional AI endpoint.
- `mobile/src/api/services/profile.ts`
  - Preserve profile parity and add any student-facing record fields needed by transcript/profile screens.
- `mobile/src/types/class.ts`
  - Align student class and class-detail fields with web usage.
- `mobile/src/types/lesson.ts`
  - Align lesson list/detail fields with web usage.
- `mobile/src/types/module.ts`
  - Align class module detail shape with web usage.
- `mobile/src/types/assessment.ts`
  - Align attempt, history, result, and submission shapes with web usage.
- `mobile/src/types/performance.ts`
  - Align performance summary usage with the web student page.
- `mobile/src/types/profile.ts`
  - Align profile completeness and student metadata fields.
- `mobile/src/components/ui/BottomTabBar.tsx`
  - Update labels/icons/order if required by the new parity shell.
- `mobile/src/screens/AnnouncementsScreen.tsx`
  - Match web student announcements behavior and layout more closely.
- `mobile/src/screens/AssessmentsScreen.tsx`
  - Match web student assessments list behavior and entry actions.
- `mobile/src/screens/AssessmentDetailScreen.tsx`
  - Match web student assessment detail behavior.
- `mobile/src/screens/AssessmentTakeScreen.tsx`
  - Preserve parity for attempt start/submission.
- `mobile/src/screens/AssessmentResultsScreen.tsx`
  - Match web student attempt result behavior.
- `mobile/src/screens/LessonsScreen.tsx`
  - Reframe toward dashboard/classes or reuse as the classes list shell.
- `mobile/src/screens/SubjectLessonsScreen.tsx`
  - Expand toward class-detail workspace parity.
- `mobile/src/screens/JaScreen.tsx`
  - Match web student JA parity.
- `mobile/src/screens/LxpScreen.tsx`
  - Match web student LXP parity.
- `mobile/src/screens/AiTutorScreen.tsx`
  - Match web chatbot/tutor parity where the backend contract overlaps.
- `mobile/src/screens/ProgressScreen.tsx`
  - Either evolve into performance parity or fold behavior into a renamed screen.
- `mobile/src/screens/ProfileScreen.tsx`
  - Match web student profile parity.
- `mobile/src/screens/screen-flow.ts`
  - Keep route inventory metadata in sync with the new parity set.
- `mobile/src/screens/__tests__/screen-flow.test.ts`
  - Assert route inventory parity.
- `mobile/src/screens/__tests__/screen-render.test.tsx`
  - Add render smoke coverage for new parity screens.
- `mobile/src/navigation/__tests__/app-navigator-role-resolution.test.ts`
  - Preserve student-only route boot behavior after navigator expansion.

### New files to create

- `mobile/src/api/services/dashboard.ts`
  - Student dashboard aggregation service for school events and home-screen helpers where direct student APIs are needed.
- `mobile/src/api/services/reports.ts`
  - Transcript/report service wrapper for student transcript parity.
- `mobile/src/api/services/school-events.ts`
  - School event service wrapper used by the dashboard calendar/feed.
- `mobile/src/types/report.ts`
  - Transcript/report response types used by the mobile transcript screen.
- `mobile/src/types/school-event.ts`
  - Calendar and event feed types for the dashboard parity screen.
- `mobile/src/screens/DashboardScreen.tsx`
  - Student home dashboard parity screen.
- `mobile/src/screens/ClassDetailScreen.tsx`
  - Student class detail parity screen.
- `mobile/src/screens/ModuleDetailScreen.tsx`
  - Student module detail parity screen.
- `mobile/src/screens/CoursesScreen.tsx`
  - Student courses parity screen.
- `mobile/src/screens/LessonDetailScreen.tsx`
  - Student lesson detail parity screen.
- `mobile/src/screens/AssessmentHistoryScreen.tsx`
  - Student assessment history parity screen.
- `mobile/src/screens/PerformanceScreen.tsx`
  - Student performance parity screen, replacing or superseding `ProgressScreen.tsx`.
- `mobile/src/screens/TranscriptScreen.tsx`
  - Student transcript parity screen.
- `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`
  - Focused parity navigation coverage for new routes.

### Web references to consult while implementing

- `next-frontend/app/(dashboard)/dashboard/student/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/classes/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/courses/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/lessons/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/assessments/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/take/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/assessment-history/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/announcements/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/ja/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/lxp/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/chatbot/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/profile/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/student/transcript/page.tsx`
- `next-frontend/src/services/announcement-service.ts`
- `next-frontend/src/services/assessment-service.ts`
- `next-frontend/src/services/class-service.ts`
- `next-frontend/src/services/lesson-service.ts`
- `next-frontend/src/services/lxp-service.ts`
- `next-frontend/src/services/module-service.ts`
- `next-frontend/src/services/performance-service.ts`
- `next-frontend/src/services/profile-service.ts`
- `next-frontend/src/services/report-service.ts`
- `next-frontend/src/services/school-event-service.ts`

### Verification commands

- `cd mobile && npm run typecheck`
- `cd mobile && npm run test`
- `cd mobile && npm run android:emulator`
- `adb devices`
- `adb shell screencap -p /sdcard/student-mobile-parity.png`
- `adb pull /sdcard/student-mobile-parity.png .`

## Task 1: Expand Student Navigation Types And Parity Inventory

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/screens/screen-flow.ts`
- Test: `mobile/src/screens/__tests__/screen-flow.test.ts`
- Test: `mobile/src/screens/__tests__/student-parity-navigation.test.tsx`

- [ ] **Step 1: Write the failing parity inventory tests**

```tsx
// mobile/src/screens/__tests__/student-parity-navigation.test.tsx
import { screenFlow } from '../screen-flow';

describe('student mobile parity inventory', () => {
  it('contains every required student parity route', () => {
    expect(screenFlow.studentRoutes).toEqual(
      expect.arrayContaining([
        'Dashboard',
        'Classes',
        'ClassDetail',
        'ModuleDetail',
        'Courses',
        'Lessons',
        'LessonDetail',
        'Assessments',
        'AssessmentDetail',
        'AssessmentTake',
        'AssessmentResults',
        'AssessmentHistory',
        'Announcements',
        'JA',
        'LXP',
        'Chatbot',
        'Performance',
        'Profile',
        'Transcript',
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `cd mobile && npm run test -- student-parity-navigation screen-flow`

Expected: FAIL because the new student parity routes are not yet present in `screen-flow.ts` or the navigator type map.

- [ ] **Step 3: Expand the typed route map and screen-flow inventory**

```ts
// mobile/src/navigation/types.ts
export type RootStackParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  ClassDetail: { classId: string };
  ModuleDetail: { classId: string; moduleId: string };
  CourseDetail: { classId: string };
  LessonDetail: { lessonId: string; classId?: string };
  AssessmentDetail: { assessmentId: string; classId?: string };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string; assessmentId?: string };
  AssessmentHistory: undefined;
  Transcript: undefined;
  Performance: undefined;
  Chatbot: { classId?: string } | undefined;
};

// mobile/src/screens/screen-flow.ts
export const screenFlow = {
  studentRoutes: [
    'Dashboard',
    'Classes',
    'ClassDetail',
    'ModuleDetail',
    'Courses',
    'Lessons',
    'LessonDetail',
    'Assessments',
    'AssessmentDetail',
    'AssessmentTake',
    'AssessmentResults',
    'AssessmentHistory',
    'Announcements',
    'JA',
    'LXP',
    'Chatbot',
    'Performance',
    'Profile',
    'Transcript',
  ],
} as const;
```

- [ ] **Step 4: Wire placeholder route entries into the student navigator**

```tsx
// mobile/src/navigation/AppNavigator.tsx
<RootStack.Navigator screenOptions={{ headerShown: false }}>
  <RootStack.Screen name="MainTabs" component={StudentTabs} />
  <RootStack.Screen name="Dashboard" component={DashboardScreen} />
  <RootStack.Screen name="ClassDetail" component={ClassDetailScreen} />
  <RootStack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
  <RootStack.Screen name="LessonDetail" component={LessonDetailScreen} />
  <RootStack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
  <RootStack.Screen name="AssessmentTake" component={AssessmentTakeScreen} />
  <RootStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} />
  <RootStack.Screen name="AssessmentHistory" component={AssessmentHistoryScreen} />
  <RootStack.Screen name="Performance" component={PerformanceScreen} />
  <RootStack.Screen name="Transcript" component={TranscriptScreen} />
  <RootStack.Screen name="Chatbot" component={AiTutorScreen} />
</RootStack.Navigator>
```

- [ ] **Step 5: Re-run the focused tests and ensure they pass**

Run: `cd mobile && npm run test -- student-parity-navigation screen-flow`

Expected: PASS with the parity route inventory present.

- [ ] **Step 6: Commit the navigation inventory slice**

```bash
git add mobile/src/navigation/types.ts mobile/src/navigation/AppNavigator.tsx mobile/src/screens/screen-flow.ts mobile/src/screens/__tests__/screen-flow.test.ts mobile/src/screens/__tests__/student-parity-navigation.test.tsx
git commit -m "feat: add student mobile parity route inventory"
```

## Task 2: Add Missing Student Services, Types, And Queries

**Files:**
- Create: `mobile/src/api/services/dashboard.ts`
- Create: `mobile/src/api/services/reports.ts`
- Create: `mobile/src/api/services/school-events.ts`
- Create: `mobile/src/types/report.ts`
- Create: `mobile/src/types/school-event.ts`
- Modify: `mobile/src/api/services/modules.ts`
- Modify: `mobile/src/api/services/assessments.ts`
- Modify: `mobile/src/api/services/lessons.ts`
- Modify: `mobile/src/api/hooks.ts`
- Test: `mobile/src/api/__tests__/hooks.test.ts`

- [ ] **Step 1: Write failing hook/service tests for the new parity calls**

```ts
// mobile/src/api/__tests__/hooks.test.ts
it('registers transcript and dashboard query keys', () => {
  expect(queryKeys.transcript).toEqual(['transcript']);
  expect(queryKeys.schoolEvents('2025-2026')).toEqual(['school-events', '2025-2026']);
  expect(queryKeys.assessmentHistory).toEqual(['assessment-history']);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `cd mobile && npm run test -- hooks`

Expected: FAIL because the new query keys and wrappers do not exist yet.

- [ ] **Step 3: Add the new mobile service wrappers**

```ts
// mobile/src/api/services/reports.ts
import { apiClient } from '../client';
import { unwrapEnvelope } from '../http';
import type { ApiEnvelope } from '../../types/api';
import type { StudentTranscriptRow } from '../../types/report';

export const reportsApi = {
  async getStudentTranscript() {
    const response = await apiClient.get<ApiEnvelope<StudentTranscriptRow[]>>('/reports/student-performance');
    return unwrapEnvelope(response.data);
  },
};

// mobile/src/api/services/school-events.ts
import { apiClient } from '../client';
import { unwrapEnvelope } from '../http';
import type { ApiEnvelope } from '../../types/api';
import type { SchoolEvent } from '../../types/school-event';

export const schoolEventsApi = {
  async getAll(schoolYear?: string) {
    const response = await apiClient.get<ApiEnvelope<SchoolEvent[]>>('/school-events', {
      params: schoolYear ? { schoolYear } : undefined,
    });
    return unwrapEnvelope(response.data);
  },
};

// mobile/src/api/services/modules.ts
async getByClassAndModule(classId: string, moduleId: string) {
  const response = await apiClient.get<ApiEnvelope<ClassModule>>(`/modules/class/${classId}/${moduleId}`);
  return unwrapEnvelope(response.data);
}
```

- [ ] **Step 4: Add the corresponding query keys and hooks**

```ts
// mobile/src/api/hooks.ts
export const queryKeys = {
  // existing keys...
  schoolEvents: (schoolYear?: string) => ['school-events', schoolYear ?? 'current'] as const,
  transcript: ['transcript'] as const,
  assessmentHistory: ['assessment-history'] as const,
  moduleDetail: (classId: string, moduleId: string) => ['module-detail', classId, moduleId] as const,
  lessonDetail: (lessonId: string) => ['lesson-detail', lessonId] as const,
};

export const useModuleDetail = (classId?: string, moduleId?: string) =>
  useQuery({
    queryKey: classId && moduleId ? queryKeys.moduleDetail(classId, moduleId) : ['module-detail', 'missing'],
    queryFn: () => modulesApi.getByClassAndModule(classId!, moduleId!),
    enabled: !!classId && !!moduleId,
  });

export const useTranscript = () =>
  useQuery({
    queryKey: queryKeys.transcript,
    queryFn: () => reportsApi.getStudentTranscript(),
  });
```

- [ ] **Step 5: Re-run the hook tests and typecheck**

Run: `cd mobile && npm run test -- hooks`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 6: Commit the parity service slice**

```bash
git add mobile/src/api/services/dashboard.ts mobile/src/api/services/reports.ts mobile/src/api/services/school-events.ts mobile/src/api/services/modules.ts mobile/src/api/services/assessments.ts mobile/src/api/services/lessons.ts mobile/src/api/hooks.ts mobile/src/types/report.ts mobile/src/types/school-event.ts mobile/src/api/__tests__/hooks.test.ts
git commit -m "feat: add student mobile parity service coverage"
```

## Task 3: Implement Dashboard Home Parity

**Files:**
- Create: `mobile/src/screens/DashboardScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/components/ui/BottomTabBar.tsx`
- Test: `mobile/src/screens/__tests__/screen-render.test.tsx`

- [ ] **Step 1: Add a failing render test for the student dashboard**

```tsx
// mobile/src/screens/__tests__/screen-render.test.tsx
it('renders the student dashboard parity shell', () => {
  const tree = render(<DashboardScreen />);
  expect(tree.getByText('Your Learning Hub')).toBeTruthy();
  expect(tree.getByText('Continue Learning')).toBeTruthy();
  expect(tree.getByText("Today's Learning Rhythm")).toBeTruthy();
});
```

- [ ] **Step 2: Run the render test to verify it fails**

Run: `cd mobile && npm run test -- screen-render`

Expected: FAIL because `DashboardScreen` does not exist yet.

- [ ] **Step 3: Build the dashboard screen using the new hooks**

```tsx
// mobile/src/screens/DashboardScreen.tsx
export function DashboardScreen() {
  const { user } = useAuth();
  const classes = useStudentClasses(user?.id);
  const profile = useProfile();
  const performance = usePerformanceSummary();
  const schoolYear = classes.data?.[0]?.schoolYear;
  const events = useSchoolEvents(schoolYear);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Good morning!</Text>
      <Text style={styles.title}>Your Learning Hub</Text>
      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonLabel}>Continue Learning</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Today's Learning Rhythm</Text>
      {/* render classes, pending tasks, calendar, and recent lessons using live hooks */}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Make the dashboard the mobile home tab entry**

```tsx
// mobile/src/navigation/AppNavigator.tsx
function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Classes" component={ClassesScreen} />
      <Tab.Screen name="Assessments" component={AssessmentsScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Re-run render tests and typecheck**

Run: `cd mobile && npm run test -- screen-render`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 6: Commit the dashboard parity slice**

```bash
git add mobile/src/screens/DashboardScreen.tsx mobile/src/navigation/AppNavigator.tsx mobile/src/components/ui/BottomTabBar.tsx mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat: add student dashboard mobile parity"
```

## Task 4: Implement Classes, Modules, Lessons, And Courses Parity

**Files:**
- Create: `mobile/src/screens/ClassDetailScreen.tsx`
- Create: `mobile/src/screens/ModuleDetailScreen.tsx`
- Create: `mobile/src/screens/CoursesScreen.tsx`
- Create: `mobile/src/screens/LessonDetailScreen.tsx`
- Modify: `mobile/src/screens/LessonsScreen.tsx`
- Modify: `mobile/src/screens/SubjectLessonsScreen.tsx`
- Modify: `mobile/src/api/hooks.ts`
- Test: `mobile/src/screens/__tests__/screen-render.test.tsx`

- [ ] **Step 1: Add failing render tests for the new parity screens**

```tsx
it('renders the class detail parity screen', () => {
  const tree = render(<ClassDetailScreen route={{ key: 'ClassDetail', name: 'ClassDetail', params: { classId: 'class-1' } } as any} navigation={{} as any} />);
  expect(tree.getByText('Class overview')).toBeTruthy();
});

it('renders the transcript of module sections on the module detail screen', () => {
  const tree = render(<ModuleDetailScreen route={{ key: 'ModuleDetail', name: 'ModuleDetail', params: { classId: 'class-1', moduleId: 'module-1' } } as any} navigation={{} as any} />);
  expect(tree.getByText('Module outline')).toBeTruthy();
});
```

- [ ] **Step 2: Run the render tests to verify they fail**

Run: `cd mobile && npm run test -- screen-render`

Expected: FAIL because the new screens do not yet exist.

- [ ] **Step 3: Implement class, module, lesson, and course detail screens**

```tsx
// mobile/src/screens/ClassDetailScreen.tsx
export function ClassDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ClassDetail'>) {
  const detail = useClassDetail(route.params.classId);
  const modules = useClassModules(route.params.classId);
  const lessons = useLessons(route.params.classId);

  return (
    <ScrollView>
      <Text>Class overview</Text>
      {modules.data?.map((module) => (
        <Pressable key={module.id} onPress={() => navigation.navigate('ModuleDetail', { classId: route.params.classId, moduleId: module.id })}>
          <Text>{module.title}</Text>
        </Pressable>
      ))}
      {lessons.data?.map((lesson) => (
        <Pressable key={lesson.id} onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id, classId: route.params.classId })}>
          <Text>{lesson.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Repoint the existing class workspace/list screens into the new stack**

```tsx
// mobile/src/screens/LessonsScreen.tsx
onPress={() => navigation.navigate('ClassDetail', { classId: item.id })}

// mobile/src/screens/SubjectLessonsScreen.tsx
onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id, classId })}
```

- [ ] **Step 5: Re-run render tests and typecheck**

Run: `cd mobile && npm run test -- screen-render`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 6: Commit the class/module/lesson/course parity slice**

```bash
git add mobile/src/screens/ClassDetailScreen.tsx mobile/src/screens/ModuleDetailScreen.tsx mobile/src/screens/CoursesScreen.tsx mobile/src/screens/LessonDetailScreen.tsx mobile/src/screens/LessonsScreen.tsx mobile/src/screens/SubjectLessonsScreen.tsx mobile/src/api/hooks.ts mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat: add student learning path mobile parity"
```

## Task 5: Implement Assessment History And End-To-End Assessment Parity

**Files:**
- Create: `mobile/src/screens/AssessmentHistoryScreen.tsx`
- Modify: `mobile/src/api/services/assessments.ts`
- Modify: `mobile/src/api/hooks.ts`
- Modify: `mobile/src/screens/AssessmentsScreen.tsx`
- Modify: `mobile/src/screens/AssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/AssessmentTakeScreen.tsx`
- Modify: `mobile/src/screens/AssessmentResultsScreen.tsx`
- Test: `mobile/src/api/__tests__/hooks.test.ts`
- Test: `mobile/src/screens/__tests__/screen-render.test.tsx`

- [ ] **Step 1: Add failing tests for assessment history query coverage**

```ts
it('registers assessment history parity key', () => {
  expect(queryKeys.assessmentHistory).toEqual(['assessment-history']);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `cd mobile && npm run test -- hooks screen-render`

Expected: FAIL because assessment history coverage is missing.

- [ ] **Step 3: Add the missing assessment history service and hook**

```ts
// mobile/src/api/services/assessments.ts
async getHistory() {
  const response = await apiClient.get<ApiEnvelope<AssessmentAttempt[]>>('/assessments/student/history');
  return unwrapEnvelope(response.data);
}

// mobile/src/api/hooks.ts
export const useAssessmentHistory = () =>
  useQuery({
    queryKey: queryKeys.assessmentHistory,
    queryFn: () => assessmentsApi.getHistory(),
  });
```

- [ ] **Step 4: Implement the history screen and wire parity actions**

```tsx
// mobile/src/screens/AssessmentHistoryScreen.tsx
export function AssessmentHistoryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AssessmentHistory'>) {
  const history = useAssessmentHistory();

  return (
    <ScrollView>
      <Text>Assessment history</Text>
      {history.data?.map((attempt) => (
        <Pressable
          key={attempt.id}
          onPress={() => navigation.navigate('AssessmentResults', { attemptId: attempt.id, assessmentId: attempt.assessmentId })}
        >
          <Text>{attempt.assessmentTitle}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Tighten the existing assessment list/detail/take/result screens to mirror web actions**

```tsx
// mobile/src/screens/AssessmentsScreen.tsx
<Pressable onPress={() => navigation.navigate('AssessmentHistory')}>
  <Text>View history</Text>
</Pressable>

// mobile/src/screens/AssessmentDetailScreen.tsx
<Pressable onPress={() => navigation.navigate('AssessmentTake', { assessmentId })}>
  <Text>Start assessment</Text>
</Pressable>
```

- [ ] **Step 6: Re-run hooks, render tests, and typecheck**

Run: `cd mobile && npm run test -- hooks screen-render`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 7: Commit the assessment parity slice**

```bash
git add mobile/src/api/services/assessments.ts mobile/src/api/hooks.ts mobile/src/screens/AssessmentsScreen.tsx mobile/src/screens/AssessmentDetailScreen.tsx mobile/src/screens/AssessmentTakeScreen.tsx mobile/src/screens/AssessmentResultsScreen.tsx mobile/src/screens/AssessmentHistoryScreen.tsx mobile/src/api/__tests__/hooks.test.ts mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat: complete student assessment mobile parity"
```

## Task 6: Implement Announcements, JA, LXP, Chatbot, And Performance Parity

**Files:**
- Create: `mobile/src/screens/PerformanceScreen.tsx`
- Modify: `mobile/src/screens/AnnouncementsScreen.tsx`
- Modify: `mobile/src/screens/JaScreen.tsx`
- Modify: `mobile/src/screens/LxpScreen.tsx`
- Modify: `mobile/src/screens/AiTutorScreen.tsx`
- Modify: `mobile/src/screens/ProgressScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Test: `mobile/src/screens/__tests__/screen-render.test.tsx`

- [ ] **Step 1: Add failing render expectations for student support surfaces**

```tsx
it('renders the performance parity screen', () => {
  const tree = render(<PerformanceScreen />);
  expect(tree.getByText('Performance overview')).toBeTruthy();
});
```

- [ ] **Step 2: Run the render tests to verify they fail**

Run: `cd mobile && npm run test -- screen-render`

Expected: FAIL because `PerformanceScreen` does not exist yet.

- [ ] **Step 3: Implement the parity surfaces against live hooks**

```tsx
// mobile/src/screens/PerformanceScreen.tsx
export function PerformanceScreen() {
  const summary = usePerformanceSummary();

  return (
    <ScrollView>
      <Text>Performance overview</Text>
      <Text>{summary.data?.overallAverage ?? '--'}%</Text>
    </ScrollView>
  );
}

// mobile/src/screens/AiTutorScreen.tsx
<Text>Ask Nexora</Text>
<TextInput value={message} onChangeText={setMessage} placeholder="Ask a question about your lesson" />
```

- [ ] **Step 4: Route the parity screens from tabs and detail actions**

```tsx
// mobile/src/navigation/AppNavigator.tsx
<RootStack.Screen name="Performance" component={PerformanceScreen} />
<RootStack.Screen name="Chatbot" component={AiTutorScreen} />
```

- [ ] **Step 5: Re-run render tests and typecheck**

Run: `cd mobile && npm run test -- screen-render`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 6: Commit the student support parity slice**

```bash
git add mobile/src/screens/PerformanceScreen.tsx mobile/src/screens/AnnouncementsScreen.tsx mobile/src/screens/JaScreen.tsx mobile/src/screens/LxpScreen.tsx mobile/src/screens/AiTutorScreen.tsx mobile/src/screens/ProgressScreen.tsx mobile/src/navigation/AppNavigator.tsx mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat: add student support mobile parity screens"
```

## Task 7: Implement Profile And Transcript Parity

**Files:**
- Create: `mobile/src/screens/TranscriptScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/api/services/profile.ts`
- Modify: `mobile/src/api/services/reports.ts`
- Modify: `mobile/src/api/hooks.ts`
- Test: `mobile/src/screens/__tests__/screen-render.test.tsx`

- [ ] **Step 1: Add failing render tests for transcript parity**

```tsx
it('renders the transcript parity screen', () => {
  const tree = render(<TranscriptScreen />);
  expect(tree.getByText('Transcript')).toBeTruthy();
});
```

- [ ] **Step 2: Run the render tests to verify they fail**

Run: `cd mobile && npm run test -- screen-render`

Expected: FAIL because `TranscriptScreen` does not exist yet.

- [ ] **Step 3: Implement transcript and profile parity screens**

```tsx
// mobile/src/screens/TranscriptScreen.tsx
export function TranscriptScreen() {
  const transcript = useTranscript();

  return (
    <ScrollView>
      <Text>Transcript</Text>
      {transcript.data?.map((row) => (
        <View key={`${row.classId}-${row.assessmentId}`}>
          <Text>{row.className}</Text>
          <Text>{row.scoreLabel}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// mobile/src/screens/ProfileScreen.tsx
<Pressable onPress={() => navigation.navigate('Transcript')}>
  <Text>Open transcript</Text>
</Pressable>
```

- [ ] **Step 4: Re-run render tests and typecheck**

Run: `cd mobile && npm run test -- screen-render`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit the profile/transcript parity slice**

```bash
git add mobile/src/screens/TranscriptScreen.tsx mobile/src/screens/ProfileScreen.tsx mobile/src/api/services/profile.ts mobile/src/api/services/reports.ts mobile/src/api/hooks.ts mobile/src/screens/__tests__/screen-render.test.tsx
git commit -m "feat: add student profile and transcript mobile parity"
```

## Task 8: Android Verification And Parity Sweep

**Files:**
- Modify: `docs/testing/student-mobile-parity-audit.md`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`
- Modify: `mobile/src/screens/__tests__/screen-flow.test.ts`
- Modify: `mobile/src/navigation/__tests__/app-navigator-role-resolution.test.ts`

- [ ] **Step 1: Add a final route coverage assertion before running Android**

```ts
// mobile/src/screens/__tests__/screen-flow.test.ts
it('keeps all student web parity routes reachable in mobile', () => {
  expect(screenFlow.studentRoutes).toHaveLength(19);
});
```

- [ ] **Step 2: Run the full mobile automated verification**

Run: `cd mobile && npm run test`

Expected: PASS

Run: `cd mobile && npm run typecheck`

Expected: PASS

- [ ] **Step 3: Boot Android and validate the live student flow**

Run: `cd mobile && npm run android:emulator`

Expected: Expo starts, Metro serves the app, and the Android emulator launches the student build.

- [ ] **Step 4: Capture ADB evidence and verify the critical parity flows**

```bash
adb devices
adb shell screencap -p /sdcard/student-mobile-parity.png
adb pull /sdcard/student-mobile-parity.png .
```

Expected: At least one screenshot artifact plus manual verification of login, dashboard, classes, lesson detail, assessment start/result/history, announcements, JA, LXP, chatbot, performance, profile, and transcript.

- [ ] **Step 5: Record parity gaps or blockers with exact scope**

```md
<!-- docs/testing/student-mobile-parity-audit.md -->
# Student Mobile Parity Audit

- Verified: login, dashboard, classes, lessons, assessments, announcements, JA, LXP, chatbot, performance, profile, transcript
- Blockers: none
```

- [ ] **Step 6: Commit the final parity verification sweep**

```bash
git add docs/testing/student-mobile-parity-audit.md mobile/src/screens/__tests__/screen-render.test.tsx mobile/src/screens/__tests__/screen-flow.test.ts mobile/src/navigation/__tests__/app-navigator-role-resolution.test.ts
git commit -m "test: verify student mobile parity on android"
```

## Self-Review

### Spec coverage

- Dashboard parity: covered by Task 3.
- Classes, modules, lessons, courses: covered by Task 4.
- Assessments, history, detail, take, results: covered by Task 5.
- Announcements, JA, LXP, chatbot, performance: covered by Task 6.
- Profile and transcript: covered by Task 7.
- Android parity verification: covered by Task 8.

No spec sections are currently uncovered.

### Placeholder scan

- Removed generic “add tests later” wording and replaced it with concrete tests, commands, and files.
- Each task includes explicit files, snippets, and commands.

### Type consistency

- Route names are consistent across `types.ts`, `screen-flow.ts`, and the navigator tasks.
- Transcript/report naming is consistent across `reports.ts`, `useTranscript`, and `TranscriptScreen`.
- Assessment history naming is consistent across service, hook, and screen tasks.
