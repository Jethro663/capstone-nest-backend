# Immutable Assignment Format and Mobile Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make assessment format immutable after creation and give mobile teachers the same safe three-step assignment creation flow as web.

**Architecture:** The backend rejects type changes for existing records. Web and mobile omit type on updates, while a native modal route consumes the existing creation-context/editor contracts and persists exact pending requests before transmission. Editor handoff reloads server truth.

**Tech Stack:** NestJS/Drizzle, Next.js/React, Expo/React Native, React Navigation, TanStack Query, AsyncStorage, Jest, Playwright, Gradle Android.

## Global Constraints

- Existing assessment formats remain unchanged and readable.
- Creation supports question (`quiz`) and file-upload formats.
- No assessment or workbook write occurs before final create or Skip.
- Mobile retries reuse the exact mutation ID and payload, scoped to actor and class.
- File-upload assignments do not expose an attempt limit.
- Academic labels and slot availability come from backend creation context.
- Mobile builds use `https://capstone-backend-v2-production.up.railway.app/api`.

---

### Task 1: Backend-enforced format immutability

**Files:**
- Modify: `backend/src/modules/assessments/assessments.service.ts`
- Test: `backend/src/modules/assessments/assessments.service.spec.ts`
- Test: `backend/test/assessment-editor.integration-spec.ts`

**Interfaces:**
- Consumes: `UpdateAssessmentDto.type` and stored `Assessment.type`.
- Produces: `ASSESSMENT_TYPE_IMMUTABLE` without changing persistent state.

- [ ] **Step 1: Write the failing service and editor tests**

```ts
await expect(service.updateAssessment(id, { type: AssessmentType.FILE_UPLOAD }, actor))
  .rejects.toMatchObject({ response: { code: "ASSESSMENT_TYPE_IMMUTABLE" } });
expect((await service.getAssessmentById(id)).type).toBe(AssessmentType.QUIZ);
```

- [ ] **Step 2: Run tests and verify RED**

```bash
cd backend && npm test -- --runInBand src/modules/assessments/assessments.service.spec.ts
```

Expected: the different type is accepted or reaches the previous attempt guard.

- [ ] **Step 3: Reject a changed type before update work**

```ts
if (updateAssessmentDto.type !== undefined && updateAssessmentDto.type !== existingAssessment.type) {
  throw new BadRequestException({
    code: "ASSESSMENT_TYPE_IMMUTABLE",
    message: "Assessment format is fixed after creation. Create a new assessment to use another format.",
    fieldErrors: [{ field: "type", message: "Assessment format cannot be changed after creation" }],
  });
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
cd backend && npm test -- --runInBand src/modules/assessments/assessments.service.spec.ts
cd backend && npm run test:e2e -- --runInBand test/assessment-editor.integration-spec.ts
```

### Task 2: Remove post-creation format controls from web and mobile editors

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx`
- Modify: `next-frontend/src/components/teacher/assessment/NewAssignmentWizard.tsx`
- Test: `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx`
- Modify: `mobile/src/features/assessment-editor/SettingsFields.tsx`
- Modify: `mobile/src/features/assessment-editor/model.ts`
- Modify: `mobile/src/screens/TeacherAssessmentEditorScreen.tsx`
- Test: `mobile/src/features/assessment-editor/__tests__/model.test.ts`
- Test: `mobile/src/screens/__tests__/teacher-assessment-editor.test.tsx`

**Interfaces:**
- Consumes: stored type for conditional authoring UI.
- Produces: existing-assessment update requests without `settings.type`; pre-creation AI setup may still choose type.

- [ ] **Step 1: Add failing UI and payload assertions**

```ts
expect(screen.queryByText("Assessment format")).not.toBeInTheDocument();
expect(buildEditorRequest(assessmentToEditor(existing), "mutation", "save").settings)
  .not.toHaveProperty("type");
```

- [ ] **Step 2: Verify RED in focused suites**

```bash
npm test --prefix next-frontend -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx'
npm test --prefix mobile -- --runInBand src/features/assessment-editor/__tests__/model.test.ts
```

- [ ] **Step 3: Remove controls and immutable update fields**

```ts
const { type: _fixedType, ...editableSettings } = document.settings;
const settings = document.id ? editableSettings : { ...document.settings };
```

Delete the web Settings switcher, omit `type` from web updates, hide type in the mobile editor, and replace promises of later switching with fixed-format copy.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npm test --prefix next-frontend -- --runInBand 'app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.test.tsx'
npm test --prefix mobile -- --runInBand src/features/assessment-editor/__tests__/model.test.ts src/screens/__tests__/teacher-assessment-editor.test.tsx
```

### Task 3: Mobile creation contract and exact retry recovery

**Files:**
- Create: `mobile/src/types/assignment-creation.ts`
- Create: `mobile/src/features/assignment-creation/model.ts`
- Create: `mobile/src/features/assignment-creation/recovery.ts`
- Modify: `mobile/src/api/services/assessments.ts`
- Test: `mobile/src/features/assignment-creation/__tests__/model.test.ts`
- Test: `mobile/src/features/assignment-creation/__tests__/recovery.test.ts`

**Interfaces:**
- Produces: `AssignmentCreationContext`, `AssignmentSetup`, `buildAssignmentRequest`, `getPendingAssignmentCreation`, and `createAssignmentFromSetup`.
- Consumes: creation-context GET, editor POST, AsyncStorage and UUID mutation IDs.

- [ ] **Step 1: Write failing conversion and persistence tests**

```ts
expect(buildAssignmentRequest(classId, mutationId, setup, "Q1", true).settings)
  .toEqual({ title: "", type: "file_upload", quarter: "Q1" });
expect(AsyncStorage.setItem).toHaveBeenCalledBefore(mockedSaveEditor);
```

- [ ] **Step 2: Verify RED**

```bash
npm test --prefix mobile -- --runInBand src/features/assignment-creation/__tests__
```

- [ ] **Step 3: Implement context, conversion and exact recovery**

```ts
const key = `assignment-creation:v1:${actorId}:${classId}`;
await AsyncStorage.setItem(key, JSON.stringify(request));
const result = await assessmentsApi.saveEditor(undefined, request);
```

Clear on success or definite 4xx, retain on network/5xx, and reject different input while one request is uncertain.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npm test --prefix mobile -- --runInBand src/features/assignment-creation/__tests__
```

### Task 4: Native three-step modal and editor handoff

**Files:**
- Replace: `mobile/src/screens/TeacherCreateAssessmentScreen.tsx`
- Modify: `mobile/src/screens/TeacherClassDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentsScreen.tsx`
- Modify: `mobile/src/screens/AdminAssessmentsScreen.tsx`
- Modify: `mobile/src/screens/TeacherAssessmentEditorScreen.tsx`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Test: `mobile/src/screens/__tests__/teacher-assignment-creation.test.tsx`

**Interfaces:**
- Consumes: Task 3 model/recovery and backend context.
- Produces: modal route and editor params `{ assessmentId, classId, created: true }`.

- [ ] **Step 1: Write failing native interaction tests**

```tsx
fireEvent.press(screen.getByText("File upload assignment"));
expect(await screen.findByText("Class record setup")).toBeTruthy();
fireEvent.press(screen.getByText("Skip setup and start editing"));
expect(navigation.replace).toHaveBeenCalledWith(
  "TeacherAssessmentEditor",
  expect.objectContaining({ created: true }),
);
```

- [ ] **Step 2: Verify RED**

```bash
npm test --prefix mobile -- --runInBand src/screens/__tests__/teacher-assignment-creation.test.tsx
```

- [ ] **Step 3: Implement wizard and route all New actions through it**

```tsx
<RootStack.Screen
  name="TeacherCreateAssessment"
  component={TeacherCreateAssessmentScreen}
  options={{ presentation: "modal" }}
/>
```

Use backend labels/capabilities, exact available slots, retained Back state, question-only attempts, no due date, 180ms reduced-motion-aware transitions, and 409 rollback.

- [ ] **Step 4: Add backend-derived editor confirmation and verify GREEN**

```tsx
{route.params?.created && detail.data ? (
  <Text>Draft created · students cannot see it yet</Text>
) : null}
```

Run the focused native interaction and editor suites with zero failures.

### Task 5: Full verification, Android packaging and release

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Review: all task and OpenSpec files.

**Interfaces:**
- Produces: Android `0.1.22` / build `23`, exact APK manifest, scoped commit, exact CI/Railway deployment, and registered live update policy.

- [ ] **Step 1: Run all required source gates**

```bash
npm test --prefix backend && npm run lint --prefix backend && npm run build --prefix backend && npm run test:e2e --prefix backend
npm test --prefix next-frontend && npm run lint --prefix next-frontend && npm run typecheck --prefix next-frontend && npm run build --prefix next-frontend
npm test --prefix mobile && npm run typecheck --prefix mobile && npm run test:release --prefix mobile
```

- [ ] **Step 2: Bump versions and build production APK**

```bash
cd mobile/android
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
```

Set `0.1.22` / `23` in both version owners before building.

- [ ] **Step 3: Validate and prepare delivery metadata**

```bash
cp mobile/android/app/build/outputs/apk/release/app-release.apk next-frontend/public/downloads/nexora-student-mobile-release.apk
cd mobile
npm run release:prepare -- --release-notes "Guided assignment creation now matches web and keeps the chosen format fixed after creation."
npm run release:verify
```

Verify package, version, permission, arm64 ABI, signature, 16KB alignment, archive integrity, embedded production API, and byte equality.

- [ ] **Step 4: Rerun invalidated checks, review and publish**

```bash
git diff --check
openspec validate guided-assignment-creation --strict
git fetch origin developement
git rev-list --left-right --count origin/developement...HEAD
git push origin developement
```

Commit only reviewed task paths, then correlate the pushed SHA to all CI and downstream deployment jobs.

- [ ] **Step 5: Verify and register live delivery**

```bash
curl -fsSL https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk -o "$LIVE_APK"
sha256sum "$LIVE_APK"
curl -fsS 'https://capstone-backend-v2-production.up.railway.app/api/app-version/check?platform=android&currentNativeVersion=0.1.21&currentVersionCode=22&currentOtaVersion=0.1.21'
```

Compare size/SHA to the manifest, register through the authorized production secret path, and prove build 22 receives build 23 while build 23 receives `updateType: none`.
