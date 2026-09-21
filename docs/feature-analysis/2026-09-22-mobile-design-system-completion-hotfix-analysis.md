# Mobile Design-System Completion Hotfix — Isolation Analysis

**Date:** 2026-09-22
**Scope:** `mobile/` presentation, native Android chrome, and mobile release packaging
**Authority:** analysis first, followed by separately ordered planning and finish-and-ship execution in the same user request
**Coverage boundary:** current tracked source, the committed build-48 APK, the two supplied screenshots, focused Jest contracts, and focused repository searches. Generated dependencies and unrelated backend/web behavior were not inspected.

## 1. Executive verdict

The reported problem is not one isolated color typo. The prior navy/red redesign established the correct shared primitives, but the migration stopped at compatibility wrappers and selected teacher flows. Current evidence shows three coupled failure classes:

1. **Confirmed shared header contrast bug.** `RoleHeaderNavigationButton` and `RoleMenuButton` render a white `theme.surface` control while student, teacher, and admin wrappers pass `mobileBrand.white` as the icon color. The menu icon is therefore white on white inside the navy app bar.
2. **Confirmed student-render verification gap.** The supplied Home screenshot shows the “Two small next moves” tiles stacking like the legacy column implementation. Current source and the embedded build-48 bundle contain the intended `moveStack`/row implementation, but the regression test only searches source text. It does not render either interactive or disabled move rows, so it cannot detect the visual failure demonstrated by the screenshot.
3. **Confirmed incomplete design-system migration.** A production-source scan found 64 UI files outside `mobile/src/theme/` with 439 direct color literals. Android resources still define a black adaptive-icon background, white status bar/splash, and legacy `#023c69`. Only six production files import `MobileAction`, while screen-local action components and two legacy `Button`/`TouchableOpacity` implementations remain.

The feature is highly shared but safely remediable without backend or academic-contract changes. The correct hotfix is a completion pass: centralize every presentation color behind the semantic mobile token layer, introduce an inverse app-bar action contract, make the drawer itself navy-framed, replace the fragile student move tile with a rendered/tested row primitive, converge remaining action implementations, update native chrome, and add an automated design-system audit that prevents raw palette drift.

## 2. Evidence and confidence

| Status | Finding | Evidence | Consequence |
|---|---|---|---|
| Confirmed | White-on-white drawer/menu icon | `RoleMenuButton` and the back fallback use `backgroundColor: theme.surface`; `StudentScreen`, `TeacherScreen`, and `AdminScreen` pass `color={mobileBrand.white}` | Root navigation can appear blank or “pure white” despite the navy app bar |
| Confirmed | App-bar fallback action already has the correct inverse treatment | `MobileAppBar` uses a translucent white surface and a white icon when it owns navigation directly | Shared role navigation should delegate to the same inverse action contract |
| Confirmed | The screenshot’s follow-up tile geometry contradicts the source contract | Supplied `image-1.png`; `StudentHomeView.MoveTile`; `student-follow-up-layout.test.ts` | Static text checks are insufficient proof of rendered mobile layout |
| Confirmed | Build 48 contains current Home strings and excludes legacy `moveTopRow` | `unzip -p ...build48.apk assets/index.android.bundle` searched for `moveStack`, `moveTopRow`, and current labels | The repository did not merely package the pre-fix source; device/runtime layout still needs stronger coverage |
| Confirmed | 303 production TS/TSX files were scanned; 64 non-theme UI files have 439 raw color literals | Read-only Node inventory over `mobile/src`, excluding tests, themes, mocks, and generated output | The palette is not centrally enforceable today |
| Confirmed | New action system is not app-wide | Six production files import `MobileAction`; 85 production files contain direct `Pressable`; local `ActionButton`/`Button` helpers remain; one `TouchableOpacity` remains | Main actions can still look unrelated across screens |
| Confirmed | Record-filter convergence is substantially complete | `MobileFilterSheet`, role adapters, and the focused filter-contract tests; the only remaining student class segmented control switches Current/Completed modes | Filters do not need a new interaction model; the guard should preserve this distinction |
| Confirmed | Native Android palette is outdated | `mobile/app.json`; `android/app/src/main/res/values/colors.xml`; `styles.xml` | Status bar, splash, launcher background, and navigation chrome can visibly contradict the in-app system |
| Confirmed | Multiple legacy token families remain active | `tokens.ts`, `studentDark.ts`, `teacher.ts`, `admin.ts`, auth theme, per-screen status palettes | Screens can be internally consistent yet disagree with one another |
| Unverified | Exact installed build and device font/display scale for the supplied screenshots | Screenshots contain no version diagnostic | Physical-device acceptance must remain separate from source/APK evidence |

## 3. Feature anatomy

### 3.1 Inbound entry points

- `AppRoot` and `AppProviders` own native root composition and system-chrome opportunity.
- `AppNavigator` owns role resolution and student/teacher/admin navigator stacks.
- `StudentScreen`, `TeacherScreen`, and `AdminScreen` adapt role surfaces to `MobileAppBar`.
- `RoleDrawerProvider` and `RoleNavigationDrawer` own the shared drawer, menu trigger, Back fallback, destinations, profile, and logout affordance.
- Screen-local `rightAction` nodes can bypass shared app-bar action styling.
- Android `app.json` and `res/values/*.xml` own launcher, splash, status bar, and navigation-bar presentation.

### 3.2 Outbound dependencies and preserved contracts

- Navigation callbacks continue to use the existing role drawer model, route names, source-aware Back behavior, and stack fallbacks.
- Student Home continues to use the existing agenda builder, assessment/lesson/class navigation, and query data.
- Teacher, student, and admin screens keep current APIs, React Query keys, mutations, cache invalidation, permissions, academic state, grading rules, and audit behavior.
- Android update policy, signer migration, package ID, and installer behavior stay unchanged except for the required release version bump and final artifact metadata.
- Accessibility labels, selected/disabled/busy states, 44 px minimum targets, and safe-area behavior remain mandatory.

### 3.3 Visual-system owners

The approved direction remains **navy frame, red intent**:

- `#0C1D3A` owns app bars, drawer structure, system chrome, and high-emphasis context.
- `#DC2626` owns primary intent, urgency, selected accent, and destructive confirmation.
- White and neutral surfaces own reading, lists, forms, and dense records.
- Green, amber, danger, and information tones communicate state only.

`mobileBrand.ts` is the intended source of truth, but direct literals and parallel theme families currently allow components to bypass it.

## 4. Full mismatch inventory

### 4.1 Shared shell and navigation

- `components/navigation/RoleNavigationDrawer.tsx`
  - white surface + white icon contrast failure in menu/back actions;
  - drawer header is white instead of navy;
  - shared drawer imports the teacher theme even for student/admin roles;
  - modal scrim remains a direct literal.
- `components/ui/MobileAppBar.tsx`
  - correct structural navy, but inverse action color is duplicated as a literal;
  - arbitrary `rightAction` children are not guaranteed to use the inverse header variant.
- `components/student/StudentWorkspacePrimitives.tsx`, `components/teacher/TeacherMobilePrimitives.tsx`, `components/admin/AdminMobilePrimitives.tsx`
  - all pass white to the incompatible shared navigation button;
  - wrapper APIs are otherwise the correct convergence seam.
- `screens/JaScreen.tsx`
  - directly supplies drawer/menu colors and retains a large local palette.

### 4.2 Student surfaces

- `screens/student-home/StudentHomeView.tsx`
  - screenshot-visible follow-up-row layout failure;
  - local move-row implementation duplicates `StudentListRow` geometry;
  - direct inverse text literals and a bespoke app-bar notification action;
  - static source test does not render the problem path.
- `screens/student-classes/StudentClassCard.tsx`
  - direct navy/white/status literals and local action geometry;
  - the Current/Completed segmented mode is semantically valid and must remain a segmented control.
- Student assessment/JA flows with dense local palettes:
  - `StudentGuidedAssessmentScreen.tsx`
  - `StudentJaReviewAssessmentScreen.tsx`
  - `AssessmentTakeScreen.tsx`
  - `AssessmentDetailScreen.tsx`
  - `AssessmentHistoryScreen.tsx`
  - `AssessmentResultsScreen.tsx`
  - `StudentGeneratedLessonScreen.tsx`
- Additional student presentation drift:
  - `ClassDetailScreen.tsx`
  - `CalendarScreen.tsx`
  - `StudentEvaluationsScreen.tsx`
  - `ProfileScreen.tsx`
  - `student-announcements/StudentAnnouncementsView.tsx`
  - `JaScreen.tsx`

### 4.3 Teacher surfaces

- Presentation/status owners with direct literals:
  - `components/teacher/TeacherPresentationCards.tsx`
  - `MobileClassRecordWorkbook.tsx`
  - `TeacherDiscussionBoard.tsx`
  - `TeacherExtractionBoard.tsx`
  - teacher announcement, confirmation, and module dialogs
  - `TeacherWorkspacePrimitives.tsx`
- Screen-local drift:
  - `TeacherHomeScreen.tsx`
  - `TeacherAssessmentDetailScreen.tsx`
  - `TeacherAssessmentReviewScreen.tsx`
  - `TeacherAssessmentEditorScreen.tsx`
  - `TeacherClassesScreen.tsx`
  - `TeacherSectionsScreen.tsx`
  - `TeacherEvaluationsScreen.tsx`
  - `teacher-ai-draft/TeacherAiDraftReviewPanel.tsx`
  - `teacher-assessments/ai-job-presentation.ts`
- `TeacherCreateAssessmentScreen.tsx` still defines a local `Button` abstraction rather than delegating to `MobileAction`.
- `TeacherAiDraftScreen.tsx` still uses `TouchableOpacity` for question-type selection; this is a persistent option selector, not a record filter, but its rendering should use shared token/control geometry.
- `class-card-presets.ts` retains six unrelated rainbow gradients that feed teacher presentation cards and class/section editor previews.

### 4.4 Admin surfaces

- Direct palette remnants:
  - `AdminClassesScreen.tsx`
  - `AdminMaintenanceSettingsScreen.tsx`
  - `AdminReportsScreen.tsx`
  - `AdminUsersScreen.tsx`
  - `AdminAnnouncementRow.tsx`
- Admin wrapper-level actions already delegate to `MobileAction`; the remaining work is token convergence and header inverse behavior.

### 4.5 Shared infrastructure, auth, notifications, and modals

- Auth/account:
  - `PasswordChangeForm.tsx`
  - `campus-login-theme.ts`
  - `MobileAuthPrimitives.tsx`
  - `MobileCampusLogin.tsx`
  - `MobileLoginStatusModal.tsx`
  - `LoginScreen.tsx`
- Notifications/providers:
  - `NotificationsInboxScreen.tsx`
  - `MobileNotificationQuickPanel.tsx`
  - `LiveNotificationProvider.tsx`
  - `StudentInterventionAlertProvider.tsx`
  - `UpdateProvider.tsx`
- Shared/modal primitives:
  - `components/ui/primitives.tsx`
  - `DatePickerModal.tsx`
  - `MobileAction.tsx`
  - `MobileFilterSheet.tsx`
  - `MobileScoreState.tsx`
  - `StudentDiscussionBoard.tsx`
  - `JaChatWorkspace.tsx`
  - `JaHubSheets.tsx`
  - `OfflineWorkspaceNotice.tsx`

### 4.6 Native and generated presentation

- `mobile/app.json` adaptive-icon background is black.
- `android/app/src/main/res/values/colors.xml` uses white splash, black icon background, legacy blue, and white dark-primary values.
- `android/app/src/main/res/values/styles.xml` forces a white status bar and does not define the desired navigation-bar treatment.
- `scripts/build-assessment-rich-text.cjs` embeds old blue/gray CSS into the generated rich-text editor bundle.
- `utils/module-cover-images.ts` is dormant in mobile but retains a legacy rainbow palette; repository-wide search found no mobile consumer.
- `mobile/profile_screen.xml` is a tracked historical UI dump, not a runtime owner. It should be excluded from runtime claims and may be cleaned separately, not used as proof of current behavior.

## 5. Cascade map

| Edge | Provider | Interface / state | Consumer | Effect if changed | Risk | Confidence | Disposition |
|---|---|---|---|---|---|---|---|
| E1 | `mobileBrand` | semantic colors, alpha surfaces, spacing, radii | all role themes and shared primitives | central visual identity | High blast radius, low behavior risk | Confirmed | Expand tokens; prevent direct literals outside approved owners |
| E2 | `MobileAppBar` | navigation/right actions | every role wrapper | header contrast and touch targets | High | Confirmed | Add/consume a shared inverse header action |
| E3 | `RoleHeaderNavigationButton` | drawer/menu vs Back resolution | student, teacher, admin, JA | root navigation visibility | High | Confirmed | Remove caller-supplied raw color; use semantic surface variant |
| E4 | `RoleNavigationDrawer` | drawer header, groups, destinations, footer | all mobile roles | role navigation consistency | High | Confirmed | Navy header, neutral body, red selected intent, shared tokens |
| E5 | `StudentHomeView.MoveTile` | lesson/task follow-up rows | student Home | screenshot-visible rendering | High | Confirmed symptom; runtime cause bounded | Replace local tile with exported/tested stable row primitive |
| E6 | source-only layout tests | regex assertions | CI/mobile job | false confidence in visual structure | High | Confirmed | Add rendered component/style/accessibility tests |
| E7 | role action adapters | legacy signatures mapped to `MobileAction` | teacher/admin/student screens | button hierarchy | Medium | Confirmed | Preserve signatures; migrate local primary/secondary actions |
| E8 | filter adapters | compact trigger + bottom sheet | record-list screens | space and consistency | Medium | Confirmed | Preserve current implementation; add no-regression audit |
| E9 | state tone maps | success/warning/danger/info | assessment, AI, notifications, workbook | meaningful highlights | Medium | Confirmed | Central semantic state palette; no decorative rainbow roles |
| E10 | auth/native themes | login, splash, status/navigation bar, launcher | pre-auth and startup | first-impression mismatch | Medium | Confirmed | Apply the same navy/red/neutral contract |
| E11 | release scripts | version/build, APK, manifest | frontend download and backend policy | deliverability | High operational | Confirmed | Bump once after final inputs; rebuild and verify exact bytes |
| E12 | route/API contracts | navigation, React Query, backend mutations | all workflows | functional regressions if altered | High | Confirmed | Frozen; presentation-only hotfix |

No additional high-risk dependency was found within the inspected mobile presentation and release scope.

## 6. Isolation and implementation seams

1. **Token seam:** expand `mobileBrand.ts` with inverse, overlay, information, and state-border roles. Keep compatibility aliases in role themes while replacing direct literals in consumers.
2. **Header seam:** make `MobileAction` support an inverse icon/text presentation or add a dedicated `MobileHeaderAction`; have app bar and role navigation share it.
3. **Drawer seam:** keep `RoleDrawerProvider` behavior untouched while restyling `RoleNavigationDrawer` exclusively through shared tokens.
4. **Student-row seam:** extract/export a single stable next-move row with explicit full-width row geometry, bounded text scaling, and interactive/non-interactive variants. Render-test both variants.
5. **Action seam:** keep cards/list rows as `Pressable`; migrate actual primary/secondary/tertiary/icon actions and eliminate local `Button`/`TouchableOpacity` action implementations.
6. **Palette seam:** move screen-specific status colors into semantic tone maps, then enforce zero direct UI color literals through a repository script.
7. **Native seam:** synchronize `app.json`, Android values/styles, global `StatusBar`, and generated rich-text CSS without changing package/update behavior.
8. **Release seam:** final mobile-source/native changes require a new production APK and exact-SHA CI/deployment/artifact proof.

## 7. Design options

### A. Complete the existing system and enforce it — recommended

Migrate every inventoried active UI owner to semantic tokens and shared action/header contracts, add an automated audit, and ship one new build. This directly satisfies the full-control request while preserving the approved preview and existing workflows.

### B. Patch only the two screenshots

Fix the drawer trigger and Home follow-up row only. This is faster but leaves the confirmed 64-file palette bypass and guarantees the same inconsistency will recur. Rejected because it contradicts the requested “every speck” scope.

### C. Replace all role themes and primitives at once

Delete compatibility layers and rewrite screens against a new monolithic theme/component system. This offers theoretical purity but creates unnecessary behavioral and merge risk. Rejected because the existing adapters are useful seams and API/procedure stability is a hard invariant.

## 8. Required improvements

1. Add a deterministic mobile design audit to CI/typecheck-adjacent verification.
2. Render-test shared navigation and student follow-up rows instead of relying on source regexes.
3. Centralize status and overlay colors; direct literals belong only in token/native-generation authorities.
4. Make system chrome and startup surfaces part of the mobile design contract.
5. Record physical-device UI/update acceptance separately from source, Jest, APK, CI, and live-download evidence.

## 9. Validation and rollback

- **Focused:** rendered navigation contrast, drawer, Student Home rows, shared action variants, token audit, native palette script checks.
- **Static:** TypeScript and admin client contracts.
- **Regression:** full mobile Jest suite and release tests.
- **Bundle:** production Expo export and generated rich-text verification.
- **Android:** production-signed ARM64 APK, package/version/ABI/signature/16-KB/API/installer checks.
- **Delivery:** exact pushed SHA, CI, Railway frontend delivery, backend release registration, live manifest/APK byte equality, and update-policy read-back.
- **Rollback:** revert the hotfix commits and restore the prior release manifest/policy only through a new verified release; never overwrite or force-push history.

## 10. Unverified boundaries

- The screenshots do not expose the installed build number, font scale, or display-size setting.
- Authenticated physical-device traversal of every route is unavailable from repository evidence alone.
- A static palette audit proves token ownership, not pixel-perfect rendering; rendered tests and physical-device review remain distinct evidence classes.
- OEM-specific status/navigation-bar appearance and legacy build reinstall prompts require device acceptance.
