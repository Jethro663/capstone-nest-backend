# Mobile Experience Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved navy/red mobile interface, consistent actions and filters, modernized teacher workspaces, and a survivable Android legacy-signer migration without changing backend or academic contracts.

**Architecture:** Add a small role-neutral presentation layer and adapt current teacher/student/admin primitives through compatibility wrappers. Keep screen hooks, routes, mutations, query invalidation, and server contracts in place; only restructure presentation and local display state. Route legacy build <=46 update attempts to an external immutable artifact while retaining the normal build >=47 updater.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, React 19, TanStack Query, React Native WebView, Jest/React Test Renderer, Android Gradle/release scripts.

## Global Constraints

- Structural navy is exactly `#0C1D3A`; primary red is exactly `#DC2626`.
- Every icon-only or overflow target is at least 44 px and has an explicit accessibility label.
- Record filters use the shared filter sheet; segmented tabs are only for persistent content modes.
- Preserve backend `/api` contracts, routes, RBAC, academic state, grading rules, query invalidation, and the secure preview credential.
- Do not invent analytics fields or learner identities.
- Legacy version codes `<= 46` must never use the app-private download/install path for a target `>= 47`.
- No new dependency is required.

---

### Task 1: Shared semantic mobile interface system

**Files:**
- Create: `mobile/src/theme/mobileBrand.ts`
- Create: `mobile/src/components/ui/MobileAppBar.tsx`
- Create: `mobile/src/components/ui/MobileAction.tsx`
- Create: `mobile/src/components/ui/MobileFilterSheet.tsx`
- Create: `mobile/src/components/ui/MobileSegmentedTabs.tsx`
- Create: `mobile/src/components/ui/MobileOverflowAction.tsx`
- Create: `mobile/src/components/ui/MobileScoreState.tsx`
- Create: `mobile/src/components/ui/__tests__/MobileDesignSystem.test.tsx`

**Interfaces:**
- Produces: `mobileBrand`, `MobileAppBar`, `MobileAction`, `MobileFilterSheet<Key>`, `MobileSegmentedTabs<Key>`, `MobileOverflowAction`, and `MobileScoreState`.
- Consumes: existing React Native, safe-area, MaterialCommunityIcons, and test-renderer packages only.

- [ ] **Step 1: Write the failing shared-system tests**

```tsx
expect(mobileBrand.navy).toBe("#0C1D3A");
expect(mobileBrand.red).toBe("#DC2626");
expect(renderer.root.findByProps({ testID: "mobile-app-bar" }).props.style).toEqual(
  expect.arrayContaining([expect.objectContaining({ backgroundColor: "#0C1D3A" })]),
);
expect(renderer.root.findByProps({ accessibilityLabel: "Filter status: All" })).toBeTruthy();
expect(renderer.root.findByProps({ accessibilityLabel: "More actions for Module 1" }).props.style)
  .toEqual(expect.objectContaining({ width: 44, height: 44 }));
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `cd mobile && npm test -- --runInBand src/components/ui/__tests__/MobileDesignSystem.test.tsx`  
Expected: FAIL because the new token and components do not exist.

- [ ] **Step 3: Implement the minimal shared interfaces**

```ts
export const mobileBrand = {
  navy: "#0C1D3A",
  red: "#DC2626",
  canvas: "#F6F7F9",
  surface: "#FFFFFF",
  text: "#101828",
  muted: "#667085",
  border: "#E4E7EC",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B42318",
  minTarget: 44,
} as const;
```

`MobileFilterSheet<Key>` accepts `{ label, activeKey, options, onSelect, resultCount?, icon? }`; each option is `{ key, label, count? }`. `MobileAction` accepts `variant: "primary" | "secondary" | "tertiary" | "icon"` plus the existing label/icon/disabled/loading semantics.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `cd mobile && npm test -- --runInBand src/components/ui/__tests__/MobileDesignSystem.test.tsx && npm run typecheck`  
Expected: PASS and zero TypeScript errors.

- [ ] **Step 5: Commit the shared foundation**

```bash
git add mobile/src/theme/mobileBrand.ts mobile/src/components/ui
git commit -m "feat(mobile): add shared navy red interface system"
```

### Task 2: Role wrapper convergence and app-wide filter contract

**Files:**
- Modify: `mobile/src/theme/teacher.ts`
- Modify: `mobile/src/theme/tokens.ts`
- Modify: `mobile/src/theme/admin.ts`
- Modify: `mobile/src/theme/studentDark.ts`
- Modify: `mobile/src/components/teacher/TeacherMobilePrimitives.tsx`
- Modify: `mobile/src/components/teacher/TeacherWorkspacePrimitives.tsx`
- Modify: `mobile/src/components/student/StudentWorkspacePrimitives.tsx`
- Modify: `mobile/src/components/admin/AdminMobilePrimitives.tsx`
- Modify tests in each role primitive `__tests__` directory
- Add: `mobile/src/screens/__tests__/mobile-filter-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 shared components.
- Produces: current role exports backed by the shared app bar/action/filter/tab implementations.

- [ ] **Step 1: Add failing wrapper and source-contract tests**

```tsx
expect(root.findByProps({ testID: "teacher-compact-header" }).props.style)
  .toEqual(expect.arrayContaining([expect.objectContaining({ backgroundColor: "#0C1D3A" })]));
expect(root.findByProps({ accessibilityLabel: "Filter records: All" })).toBeTruthy();
```

```ts
for (const source of recordFilterSources) {
  expect(source.contents).not.toMatch(/\.map\([^)]*filter[\s\S]{0,500}<TeacherChip/);
}
```

- [ ] **Step 2: Confirm the tests fail on the white headers and chip rows**

Run: `cd mobile && npm test -- --runInBand src/components/teacher/__tests__/TeacherMobilePrimitives.test.tsx src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx src/components/student/__tests__/StudentWorkspacePrimitives.test.tsx src/components/admin/__tests__/AdminMobilePrimitives.test.tsx src/screens/__tests__/mobile-filter-contract.test.ts`  
Expected: FAIL on navy header/filter selector assertions.

- [ ] **Step 3: Delegate existing role APIs to the shared system**

```tsx
export function TeacherSelectMenu<Key extends string>(props: {
  label: string;
  selectedValue: Key;
  options: Array<{ label: string; value: Key }>;
  onSelect: (value: Key) => void;
}) {
  return <MobileFilterSheet label={props.label} activeKey={props.selectedValue}
    options={props.options.map(({ value, label }) => ({ key: value, label }))}
    onSelect={props.onSelect} />;
}
```

Map `TeacherActionButton` tones to shared variants while retaining its signature. Implement `AdminFilterBar` as search plus `MobileFilterSheet`; adapt `StudentSelectMenu`; delegate teacher/student segmented components to `MobileSegmentedTabs`.

- [ ] **Step 4: Convert semantic record filters identified by the source-contract inventory**

For each record subset, replace chip/tab rows with the shared selector while leaving non-filter choices intact:

```tsx
<TeacherSelectMenu
  label="Filter status"
  selectedValue={statusFilter}
  options={STATUS_FILTERS.map(({ value, label }) => ({ value, label }))}
  onSelect={setStatusFilter}
/>
```

- [ ] **Step 5: Run the wrapper, filter-contract, and full typecheck gates**

Run: `cd mobile && npm test -- --runInBand src/components/teacher/__tests__ src/components/student/__tests__/StudentWorkspacePrimitives.test.tsx src/components/admin/__tests__/AdminMobilePrimitives.test.tsx src/screens/__tests__/mobile-filter-contract.test.ts && npm run typecheck`  
Expected: PASS and no remaining inventoried horizontal record-filter rows.

- [ ] **Step 6: Commit wrapper convergence**

```bash
git add mobile/src/theme mobile/src/components mobile/src/screens
git commit -m "refactor(mobile): unify role controls and record filters"
```

### Task 3: Teacher Home and Notification Center

**Files:**
- Modify: `mobile/src/screens/TeacherHomeScreen.tsx`
- Modify: `mobile/src/screens/NotificationsInboxScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-mobile-render.test.tsx`
- Add: `mobile/src/screens/__tests__/teacher-home-notification-layout.test.ts`

**Interfaces:**
- Consumes: shared app bar/actions/filter from Tasks 1–2 and existing dashboard/notification hooks.
- Produces: approved Home and Notification compositions with unchanged navigation/data behavior.

- [ ] **Step 1: Write failing source and render assertions**

```ts
expect(home).toContain('testID="teacher-next-up"');
expect(home).not.toContain("<TeacherContextStrip");
expect(notifications).toContain("MobileFilterSheet");
expect(notifications).not.toMatch(/FILTERS\.map/);
expect(notifications).not.toContain("Notification center keeps");
```

- [ ] **Step 2: Run the new layout test and confirm red**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-home-notification-layout.test.ts src/screens/__tests__/teacher-mobile-render.test.tsx`  
Expected: FAIL because the old context strip/filter row is present.

- [ ] **Step 3: Implement the approved hierarchy using existing data**

```tsx
<View testID="teacher-next-up" style={{ margin: 16, borderRadius: 20, backgroundColor: mobileBrand.navy, padding: 18 }}>
  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>NEXT UP</Text>
  <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>{nextUp.title}</Text>
</View>
```

Notifications render compact icon/count facts, existing search behavior, and one `MobileFilterSheet<FilterMode>` wired to `setFilterMode`.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-home-notification-layout.test.ts src/screens/__tests__/teacher-mobile-render.test.tsx && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit the home/notification slice**

```bash
git add mobile/src/screens/TeacherHomeScreen.tsx mobile/src/screens/NotificationsInboxScreen.tsx mobile/src/screens/__tests__
git commit -m "feat(mobile): modernize teacher home and notifications"
```

### Task 4: Module management and lesson preview

**Files:**
- Modify: `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- Modify: `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-module-detail-contract.test.ts`
- Modify: `mobile/src/screens/__tests__/teacher-lesson-preview-contract.test.ts`

**Interfaces:**
- Consumes: `MobileOverflowAction`, `MobileSegmentedTabs`, existing module action sheets, native block renderer, and preview URL mutation/query.
- Produces: quiet accessible management and two-mode scrollable preview.

- [ ] **Step 1: Change contract tests to the new requirements**

```ts
expect(moduleSource).toContain("MobileOverflowAction");
expect(moduleSource).not.toContain('label="Manage item"');
expect(lessonSource).not.toContain('key: "compare"');
expect(lessonSource).toContain('nestedScrollEnabled');
```

- [ ] **Step 2: Run both tests and confirm red**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-module-detail-contract.test.ts src/screens/__tests__/teacher-lesson-preview-contract.test.ts`  
Expected: FAIL on old Manage/Compare implementation.

- [ ] **Step 3: Replace visible management buttons with labeled overflow controls**

```tsx
<MobileOverflowAction
  accessibilityLabel={`More actions for ${itemTitle}`}
  onPress={() => setManagingItem({ id: item.id, sectionId: section.id, title: itemTitle, index: iIndex })}
/>
```

- [ ] **Step 4: Remove Compare and give WebView a dedicated scroll owner**

```tsx
<TeacherSegmentedTabs items={[{ key: "mobile", label: "Mobile" }, { key: "web", label: "Web" }]} />
<WebView nestedScrollEnabled source={{ uri: webPreviewUrl }} style={{ flex: 1, minHeight: 520 }} />
```

Delete compare-only composition/state branches; keep the secure preview loading/error/retry path.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-module-detail-contract.test.ts src/screens/__tests__/teacher-lesson-preview-contract.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit module/lesson changes**

```bash
git add mobile/src/screens/TeacherModuleDetailScreen.tsx mobile/src/screens/TeacherLessonDetailScreen.tsx mobile/src/screens/__tests__
git commit -m "feat(mobile): streamline module and lesson workspaces"
```

### Task 5: Assessment list search, filters, and visible pagination

**Files:**
- Modify: `mobile/src/screens/TeacherAssessmentsScreen.tsx`
- Modify: `mobile/src/screens/teacher-assessments/model.ts`
- Modify: `mobile/src/screens/__tests__/teacher-assessments-layout.test.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-assessment-filters.test.ts`

**Interfaces:**
- Consumes: complete `records` aggregation, `filterTeacherAssessments`, shared search/filter/actions.
- Produces: `paginateTeacherAssessments(records, page, pageSize)` and visible list controls.

- [ ] **Step 1: Write failing pagination/model tests**

```ts
expect(paginateTeacherAssessments(Array.from({ length: 23 }, (_, id) => ({ id })), 2, 10))
  .toMatchObject({ page: 2, pageCount: 3, total: 23, items: expect.arrayContaining([{ id: 10 }]) });
expect(source).not.toContain("<TeacherContextStrip");
expect(source).toContain("assessment-display-pagination");
```

- [ ] **Step 2: Run assessment list tests and confirm red**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-filters.test.ts src/screens/__tests__/teacher-assessments-layout.test.tsx`  
Expected: FAIL because pagination is absent and the strip remains.

- [ ] **Step 3: Implement deterministic local display pagination**

```ts
export function paginateTeacherAssessments<T>(records: T[], requestedPage: number, pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { items: records.slice((page - 1) * pageSize, page * pageSize), page, pageCount, total: records.length };
}
```

Wire `search`, class/status/type filters, `displayPage`, reset effects, and previous/next actions. Keep bulk selection keyed across the complete filtered result.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-filters.test.ts src/screens/__tests__/teacher-assessments-layout.test.tsx && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit assessment list changes**

```bash
git add mobile/src/screens/TeacherAssessmentsScreen.tsx mobile/src/screens/teacher-assessments/model.ts mobile/src/screens/__tests__
git commit -m "feat(mobile): add searchable paginated assessments"
```

### Task 6: Assessment overview, submissions, and question analytics

**Files:**
- Modify: `mobile/src/screens/TeacherAssessmentDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-guided-workbench-layout.test.ts`
- Add: `mobile/src/screens/__tests__/teacher-assessment-detail-modernization.test.tsx`

**Interfaces:**
- Consumes: existing assessment detail, submissions, stats, question analytics queries and shared filter/score components.
- Produces: selected analytics question sheet and semantic submission scores.

- [ ] **Step 1: Add failing interaction assertions**

```tsx
fireEvent.press(root.findByProps({ accessibilityLabel: "Analyze question 1" }));
expect(root.findByProps({ testID: "question-analytics-detail" })).toBeTruthy();
expect(root.findAllByType(MobileScoreState).length).toBeGreaterThan(0);
expect(source).not.toContain("filterItems.map");
```

- [ ] **Step 2: Run the detail test and confirm red**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-detail-modernization.test.tsx src/screens/__tests__/teacher-guided-workbench-layout.test.ts`  
Expected: FAIL because analytics rows are not interactive and chip filters remain.

- [ ] **Step 3: Implement the scannable overview and submission controls**

```tsx
<MobileFilterSheet label="Filter submissions" activeKey={submissionFilter}
  options={filterItems.map(([key, label]) => ({ key, label, count: submissionCounts[key] }))}
  onSelect={setSubmissionFilter} />
<MobileScoreState score={score} maximum={assessment.points} state={displayStatus} />
```

- [ ] **Step 4: Implement question analytics selection using existing fields**

```tsx
<Pressable accessibilityLabel={`Analyze question ${index + 1}`} onPress={() => setSelectedQuestion(question)}>
  <QuestionAnalyticsSummary question={question} />
</Pressable>
<TeacherActionSheet visible={Boolean(selectedQuestion)} title="Question analysis" onClose={() => setSelectedQuestion(null)}>
  <View testID="question-analytics-detail">
    <Text>{selectedQuestion?.correctCount}/{selectedQuestion?.totalResponses} correct</Text>
    <Text>{selectedQuestion?.averagePoints}/{selectedQuestion?.points} average points</Text>
    {selectedQuestion?.options.map((option) => (
      <Text key={option.optionId}>{option.text}: {option.selectionCount} ({option.selectionPercent}%)</Text>
    ))}
    {selectedQuestion?.textAnswers.map((answer, index) => <Text key={`${index}-${answer}`}>{answer}</Text>)}
  </View>
</TeacherActionSheet>
```

- [ ] **Step 5: Run focused tests and typecheck**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-detail-modernization.test.tsx src/screens/__tests__/teacher-guided-workbench-layout.test.ts && npm run typecheck`  
Expected: PASS without new analytics fields.

- [ ] **Step 6: Commit assessment detail changes**

```bash
git add mobile/src/screens/TeacherAssessmentDetailScreen.tsx mobile/src/screens/__tests__
git commit -m "feat(mobile): make assessment insights actionable"
```

### Task 7: Focused submission review

**Files:**
- Modify: `mobile/src/screens/TeacherAssessmentReviewScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-assessment-review.test.tsx`

**Interfaces:**
- Consumes: existing attempt, rubric, scoring, attachments, return mutations and `MobileScoreState`.
- Produces: compact review control region and selected-question navigator.

- [ ] **Step 1: Write failing review hierarchy assertions**

```tsx
expect(root.findByProps({ testID: "review-control-panel" })).toBeTruthy();
expect(root.findByProps({ testID: "learner-answer" })).toBeTruthy();
expect(root.findByProps({ testID: "expected-answer" })).toBeTruthy();
expect(root.findAllByType(TeacherStats)).toHaveLength(0);
```

- [ ] **Step 2: Run the review suite and confirm red**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-review.test.tsx`  
Expected: FAIL on old stats-card composition.

- [ ] **Step 3: Implement the focused review composition**

```tsx
<View testID="review-control-panel"><MobileScoreState score={earned} maximum={possible} state={status} /></View>
<QuestionNavigator activeIndex={activeIndex} count={responses.length} onSelect={setActiveIndex} />
<View testID="learner-answer"><RichAnswer value={activeResponse.answer} /></View>
<View testID="expected-answer"><RichAnswer value={activeQuestion.correctAnswer} /></View>
```

Keep current grading, rubric, file open/download, and return functions connected to the active response.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `cd mobile && npm test -- --runInBand src/screens/__tests__/teacher-assessment-review.test.tsx && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit submission review changes**

```bash
git add mobile/src/screens/TeacherAssessmentReviewScreen.tsx mobile/src/screens/__tests__/teacher-assessment-review.test.tsx
git commit -m "feat(mobile): focus teacher submission review"
```

### Task 8: Legacy Android signer migration

**Files:**
- Modify: `mobile/src/providers/UpdateProvider.tsx`
- Modify: `mobile/src/providers/__tests__/UpdateProvider.test.tsx`

**Interfaces:**
- Consumes: existing update decision, `Linking.openURL`, immutable `artifactDownloadUrl`/`apkDownloadUrl`, and normal update service.
- Produces: `openLegacyMigrationDownload()` behavior that bypasses private-cache download/install.

- [ ] **Step 1: Add the failing legacy-path test**

```tsx
fireEvent.press(root.findByProps({ accessibilityLabel: "Download APK outside the app" }));
await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith("https://example.test/nexora.apk"));
expect(updateService.downloadApk).not.toHaveBeenCalled();
expect(updateService.installApk).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the updater test and confirm red**

Run: `cd mobile && npm test -- --runInBand src/providers/__tests__/UpdateProvider.test.tsx`  
Expected: FAIL because the external-download action is not implemented.

- [ ] **Step 3: Implement the fail-closed external handoff**

```ts
const openLegacyMigrationDownload = async () => {
  const url = state.decision?.artifactDownloadUrl ?? state.decision?.apkDownloadUrl;
  if (!url || !url.startsWith("https://")) {
    setError("The secure school APK link is unavailable. Keep this app installed and contact support.");
    return;
  }
  await Linking.openURL(url);
};
```

Render numbered sync, credential, download, uninstall, install, sign-in, and version-confirmation steps. The legacy CTA calls only this function; the ordinary CTA remains unchanged.

- [ ] **Step 4: Run updater and release tests**

Run: `cd mobile && npm test -- --runInBand src/providers/__tests__/UpdateProvider.test.tsx src/services/update/__tests__/update.service.test.ts src/release/__tests__`  
Expected: PASS for legacy and ordinary update paths.

- [ ] **Step 5: Commit updater migration**

```bash
git add mobile/src/providers/UpdateProvider.tsx mobile/src/providers/__tests__/UpdateProvider.test.tsx
git commit -m "fix(mobile): preserve apk across legacy signer migration"
```

### Task 9: Full verification, Android package, and release

**Files:**
- Modify through repository scripts: mobile version/release metadata and generated release manifest files defined by `mobile/package.json`
- Update: `openspec/changes/modernize-mobile-experience/tasks.md`
- Update: `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` with final evidence

**Interfaces:**
- Consumes: all prior commits and existing mobile release scripts.
- Produces: exact-SHA verified production APK and evidence ledger.

- [ ] **Step 1: Run the complete mobile verification**

Run: `cd mobile && npm run typecheck && npm test -- --runInBand`  
Expected: zero type errors and all suites passing.

- [ ] **Step 2: Run production export and release preflight**

Run the exact scripts exposed by `mobile/package.json`: `npm run test:release`, the Android production Expo export command used by the repository, and `npm run release:prepare` with the next version followed by `npm run release:verify`.  
Expected: bundle/export success and internally consistent version/hash/size metadata.

- [ ] **Step 3: Inspect the APK identity**

```bash
sha256sum next-frontend/public/downloads/nexora-student-mobile-release.apk
apksigner verify --print-certs next-frontend/public/downloads/nexora-student-mobile-release.apk
apkanalyzer manifest application-id next-frontend/public/downloads/nexora-student-mobile-release.apk
apkanalyzer manifest version-code next-frontend/public/downloads/nexora-student-mobile-release.apk
```

Expected: `com.nexora.lms.mobile`, next version code, manifest-matching SHA-256, and the established production certificate digest beginning `46cb`.

- [ ] **Step 4: Review the final diff and commit remaining metadata/evidence**

Run: `git diff --check && git status --short && git diff --stat`  
Expected: no whitespace errors, no unrelated changes, and only planned files.

```bash
git add openspec docs mobile
git commit -m "release(mobile): ship modernized nexora experience"
```

- [ ] **Step 5: Push and observe exact-SHA release evidence**

```bash
git push origin developement
gh run list --commit "$(git rev-parse HEAD)" --limit 10
```

Read each returned run ID, then run `gh run watch RUN_ID_FROM_LIST --exit-status --interval 10`. Verify the existing deployed/download surface advertises the same version, hash, size, and immutable APK URL. Record CI/deployment/artifact evidence separately from physical-device evidence.

- [ ] **Step 6: Close the OpenSpec checklist only for proven items**

Mark implemented/verified tasks complete. Leave physical-device migration and authenticated teacher acceptance explicitly unverified when no device/session is available; do not convert artifact success into device success.
