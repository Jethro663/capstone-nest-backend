# Mobile Experience Modernization — Feature Impact Plan

**Status:** Approved for implementation by the user on 2026-09-21  
**Primary evidence:** `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md`  
**Visual contract:** `/home/jethro/.codex/visualizations/2026/09/21/01a0c425-9c46-7d21-b436-ec2ffe985ce5/nexora-mobile-teacher-redesign.html`  
**OpenSpec change:** `openspec/changes/modernize-mobile-experience/`

## 1. Decision summary and feature brief

Implement the **Navy frame, red intent** direction from the approved HTML preview. Dark navy (`#0C1D3A`) becomes the structural color for app bars and high-level navigation; Nexora red (`#DC2626`) remains the primary action and urgency color; white and neutral surfaces remain the content canvas. Introduce one shared action hierarchy and one shared record-filter bottom sheet across mobile roles, then modernize the named teacher workflows without changing backend contracts, routes, RBAC, academic state, or grading behavior.

The Android update failure is a signer-lineage problem, not a visual defect. Builds through version code 46 used a different certificate from build 47. The new release must add a one-time external-browser/download-manager reinstall path for those legacy builds because Android will reject an in-place update and the existing app-private cache is not a durable handoff across uninstall.

**Recommendation:** implement through compatibility wrappers and focused screen migrations, not a blanket rewrite. This gives the whole app a consistent shell and controls while keeping existing domain behavior stable.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Shared semantic mobile tokens and role-neutral app bar, action, filter sheet, segmented tabs, overflow action, and score-state primitives.
- Teacher, student, and admin presentation wrappers adapted to those primitives.
- Removal of horizontal record-filter button rows across mobile; chips remain valid for tags, selected entities, calendar presets, editor options, and other non-record-filter semantics.
- Redesign of Teacher Home, Notification Center, Module Detail, Lesson Preview, Assessment List, Assessment Detail, Analytics drill-down, and Submission Review.
- Legacy Android signer-migration guidance and external artifact opening.
- Test, package, production-sign, release metadata, commit, push, CI/deployment observation, and artifact verification.

### Non-goals

- No backend, database, schema, DTO, route, RBAC, audit, grading, notification-delivery, or academic lifecycle change.
- No full dark mode or navy reading canvas.
- No new analytics API and no learner-identity inference from aggregate question data.
- No mechanical replacement of all React Native `Pressable` uses.
- No redesign of unrelated web pages.

### Permissions

The user explicitly requested automatic planning, implementation, testing, mobile packaging, commit, push, and deployment observation after confirmation. Destructive production data operations are not required or authorized.

### Assumptions

- [Confirmed] `mobile/` is the active generic mobile target under the repository kernel.
- [Confirmed] Existing `/api` contracts remain authoritative; web and mobile do not call `ai-service` directly.
- [Confirmed] The HTML preview is approved as the visual target.
- [Unverified] A physical Android device is not currently connected; installation acceptance will remain a separate evidence gate unless that changes.

## 3. Current-state evidence ledger

| Status | Evidence | Consequence |
|---|---|---|
| Confirmed | `mobile/src/theme/teacher.ts` maps `topbar` to white and uses dusty `#C96B68`; `deepBlue` incorrectly aliases red | Teacher surfaces cannot achieve web-aligned navy/red contrast through current roles |
| Confirmed | `mobile/src/theme/tokens.ts` uses a separate blue-led Material-like palette | Global token ownership is fragmented and cannot express the approved brand roles consistently |
| Confirmed | `TeacherScreen`, `StudentScreen`, and `AdminScreen` each implement their own header | A wrapper-level app-bar migration can reach many screens without route changes |
| Confirmed | `TeacherSelectMenu`, `StudentSelectMenu`, and `AdminFilterBar` duplicate selection/filter behavior | A shared filter sheet can consolidate the dominant role-specific implementations |
| Confirmed | `TeacherChip` is used for both record filters and non-filter selection/tags | Migration must be semantic, not a blind component deletion |
| Confirmed | `TeacherLessonDetailScreen.tsx` exposes Mobile/Web/Compare and renders WebView inside a scrolling screen | Compare and nested scrolling explain constrained web preview usability |
| Confirmed | `TeacherAssessmentsScreen.tsx` renders `TeacherContextStrip` below a titled app bar and has no visible display pagination | The list duplicates identity and lacks user-visible page navigation |
| Confirmed | `TeacherAssessmentDetailScreen.tsx` uses `TeacherChip` for submission status filters and non-interactive analytics rows | The named problems are owned locally and can reuse shared controls |
| Confirmed | `TeacherAssessmentReviewScreen.tsx` starts with `TeacherStats` and chip-heavy navigation | The review hierarchy can be improved without changing grading mutations |
| Confirmed | `UpdateProvider.tsx` detects `currentVersionCode <= 46 && latest >= 47` | The app already knows the signer-migration boundary |
| Confirmed | `mobile/src/services/update/update.service.ts` writes ordinary downloads beneath `FileSystem.cacheDirectory` | The current file can be removed when the old app is uninstalled |
| Confirmed | APK certificate inspection found build <=46 digest `fac617…` and build 47 digest `46cb…` for the same package | Android in-place installation must fail across that boundary |
| Confirmed | The assessment analytics API already returns totals, correctness, average points, option distribution, and text answers | An interactive drill-down is possible without a backend change |
| Unverified | No live physical-device installation evidence is available in the current environment | Artifact/signature success must not be presented as device success |

## 4. End-to-end impact and consumer map

| Producer / owner | Interface | Consumers | Planned effect | Compatibility |
|---|---|---|---|---|
| `mobile/src/theme/mobileBrand.ts` | semantic colors, spacing, radii, shadows | shared UI primitives and role themes | New source of visual truth | Additive; role theme names remain available |
| `mobile/src/components/ui/MobileAppBar.tsx` | title, back/menu, refresh, right action | role screen wrappers | Navy, safe-area-aware shared header | Wrappers preserve existing props |
| `mobile/src/components/ui/MobileAction.tsx` | `variant`, tone, icon, label, state | role buttons and focused screens | Four consistent action variants | Legacy tones map to semantic variants |
| `mobile/src/components/ui/MobileFilterSheet.tsx` | label, value, options, select, optional count | teacher/student selectors, admin filter bar, named filter rows | One record-filter interaction | Screen state and query semantics unchanged |
| `mobile/src/components/ui/MobileSegmentedTabs.tsx` | active key and persistent modes | teacher/student tab wrappers | Consistent content-mode navigation | Not used for record filters |
| `mobile/src/components/ui/MobileOverflowAction.tsx` | accessible label and press | module sections/items | Quiet 44 px management entry | Opens existing action sheets/mutations |
| `mobile/src/components/ui/MobileScoreState.tsx` | score, maximum, state | assessment detail/review | Consistent score emphasis | Presentation only |
| Role primitive files | compatibility props | all role-owned screens | Shared structure without import churn | Domain behavior unchanged |
| Named teacher screens | existing hooks and navigation contracts | teachers | Approved task-first hierarchy | Same routes and APIs |
| `UpdateProvider.tsx` | update decision and CTA | legacy Android installs | External durable handoff for <=46 | Normal >=47 path unchanged |
| Existing release scripts/workflows | version, hash, certificate, manifest | updater/public artifact | Publish verified next APK | Existing production signer retained |

No new backend producer or public API consumer is introduced. A focused final search found no additional signer-migration storage owner beyond the update service and provider within the inspected mobile scope.

## 5. Conflicts, invariants, risks, and design options

### Conflicts resolved

- The active parity spec required Mobile/Web/Compare. It is amended to Mobile/Web with a dedicated WebView scroll owner.
- The active parity spec forbade ellipsis-only management and required visible Manage. It is amended to require a 44 px explicitly labeled overflow control, preserving discoverability without the eye-sore text.

### Frozen invariants

- Backend owns auth/RBAC, official academic state, analytics totals, audit history, and durable orchestration.
- Existing routes, query keys, mutations, invalidation, secure preview credential, grading rules, and lifecycle checks remain intact.
- The app continues to collect complete assessment pages before local display filtering/pagination.
- Ordinary production-signed updates continue checksum verification and in-app installation.

### Main risks

1. Shared wrappers have a broad visual blast radius. Mitigation: compatibility props, focused component tests, then full mobile suite.
2. Record-filter conversion could accidentally change editor/toggle chips. Mitigation: migrate only controls whose purpose is selecting a record-list query subset.
3. Nested WebView scrolling can remain broken if both parent and child own vertical scroll. Mitigation: dedicated fixed/flex preview region and contract test for absence of Compare.
4. Local display pagination can hide selected rows across pages. Mitigation: selection remains keyed by record ID across the complete filtered set and bulk copy reports total selected.
5. Legacy users can lose unsynced local data. Mitigation: explicit stop condition before uninstall and external download before removal.

### Options

- **A — Navy frame, red intent (selected):** strongest web/mobile identity, high content readability, limited risk.
- **B — White shell with navy typography:** lowest change but remains visually bland and fails the requested contrast.
- **C — Full navy/dark dashboard:** visually dramatic but harms dense academic reading and over-expands scope into dark mode.

## 6. Recommended architecture, data flow, security, and error behavior

### Presentation architecture

Role-neutral shared primitives own only rendering and accessibility. Role wrappers map existing public props to shared primitives. Screens continue to own domain state and invoke existing hooks. This avoids a “mega component” that knows teacher/admin/student business rules.

### Filter data flow

`screen state -> MobileFilterSheet active option -> existing setter -> existing memo/query -> reset local display page`. Search remains a text input beside the compact filter trigger. Multiple independent criteria render multiple compact triggers, not rows of pills.

### Assessment list data flow

`existing paginated API -> existing complete record aggregation -> search/class/status/type filters -> local display slice -> list rows`. The page size is 10, `pageCount = max(1, ceil(filtered.length / 10))`, and criteria changes reset `displayPage` to 1.

### Analytics data flow

`getQuestionAnalytics(assessmentId) -> question rows -> selectedQuestion state -> bottom sheet/dialog`. Display only fields already present. Network errors keep the current inline error behavior with retry through screen refresh.

### Lesson preview data flow

Mobile mode uses the existing native block renderer. Web mode requests the existing five-minute read-only lesson-scoped URL and renders it in a dedicated WebView. Expiry, load, and error states retain retry behavior and never expose an account JWT.

### Legacy update data flow

`release decision -> legacy boundary -> explicit warning -> Linking.openURL(immutable HTTPS artifact) -> user-controlled uninstall/install -> fresh sign-in/version confirmation`. The provider must not call `downloadApk` or the installer for the legacy branch. Invalid or non-HTTPS URLs fail closed with a clear message.

## 7. Contract, schema, migration, and compatibility changes

- **Backend/API:** none.
- **Database/schema:** none.
- **Navigation routes:** none.
- **Mobile presentation contracts:** Compare mode removed; Manage text replaced by explicitly labeled overflow controls; role header backgrounds/icons change.
- **Component compatibility:** existing role exports remain during this change and delegate to shared primitives.
- **Update compatibility:** builds <=46 use a one-time manual reinstall; builds >=47 use the normal verified path.
- **Data migration:** none.
- **Dependency changes:** none expected; React Native Modal, Linking, WebView, Expo FileSystem, and existing icon package are sufficient.

## 8. Ordered implementation phases with exact owners

1. **Shared foundation** — create `mobile/src/theme/mobileBrand.ts` and shared UI primitives under `mobile/src/components/ui/`; tests under `mobile/src/components/ui/__tests__/`.
2. **Compatibility wrappers** — modify `TeacherMobilePrimitives.tsx`, `TeacherWorkspacePrimitives.tsx`, `StudentWorkspacePrimitives.tsx`, and `AdminMobilePrimitives.tsx`; update their focused tests.
3. **App-wide record filters** — convert `AdminFilterBar` centrally and migrate screen-local record filter rows in notifications, teacher sections/classes/announcements/reports/evaluations/interventions/performance/library/lessons, discussion/extraction boards, and student announcement/assessment filters when they represent record subsets.
4. **Home and notifications** — modify `TeacherHomeScreen.tsx` and `NotificationsInboxScreen.tsx` with layout tests.
5. **Module and lesson** — modify `TeacherModuleDetailScreen.tsx` and `TeacherLessonDetailScreen.tsx` with contract tests.
6. **Assessment list/detail** — modify `TeacherAssessmentsScreen.tsx` and `TeacherAssessmentDetailScreen.tsx`; add pagination and analytics interaction tests.
7. **Review** — modify `TeacherAssessmentReviewScreen.tsx` and its tests.
8. **Updater** — modify `UpdateProvider.tsx` and focused tests; retain update service behavior for normal releases.
9. **Release** — run full validation, bump through repository scripts, build, verify, commit, push, observe exact-SHA CI/deployment, and verify public artifact metadata.

## 9. Verification matrix and acceptance criteria

| Layer | Command/evidence | Acceptance |
|---|---|---|
| Shared UI | focused Jest tests for shared and role primitives | Navy app bar, action variants, filter sheet, tabs, overflow, scores and 44 px targets pass |
| Named screens | focused layout/contract/render tests | Approved hierarchy and interactions present; old Compare/filter rows/redundant strips absent |
| Updater | `UpdateProvider.test.tsx`, update service/release tests | Legacy path opens external HTTPS URL and does not call private-cache installer; normal path unchanged |
| Static | `npm run typecheck` in `mobile/` | zero TypeScript errors |
| Regression | `npm test -- --runInBand` in `mobile/` | all mobile suites pass |
| Bundle | Expo Android production export | bundle/assets complete without runtime config errors |
| Release | `npm run test:release`, `release:prepare`, `release:verify` as defined by repository scripts | manifest/version/hash/certificate checks pass |
| Artifact | `apksigner verify --print-certs`, SHA-256, package/version inspection | package `com.nexora.lms.mobile`, expected version, production cert digest `46cb…`, manifest digest match |
| CI/deploy | GitHub exact-SHA workflow and existing Railway/download surface observation | required jobs green; public artifact metadata resolves to the pushed release |
| Device | physical build <=46 migration and build >=47 update | external download survives uninstall; reinstall/sign-in works; normal in-place update works; otherwise recorded unverified |

Acceptance also requires no horizontal record-filter pill rows in inspected mobile record-list sources, no new backend/schema changes, and no claims beyond available device evidence.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

Ship the shared system and named workflows in one mobile release so users do not see a half-migrated navigation shell. Publish only after production certificate/hash checks. Legacy guidance activates solely at the detected signer boundary.

### Rollback

If mobile tests/export fail, do not publish. If artifact verification fails, retain the previous manifest and APK. Product-code rollback is a normal Git revert because there is no schema or data migration. A published APK cannot downgrade installed version codes automatically; rollback would require a higher-version corrective APK signed by the same production certificate.

### Observability

Use existing updater decision/error logs and release verification output. Confirm the public manifest returns the expected version, hash, size, and artifact URL. UI presentation changes add no analytics or telemetry to avoid scope expansion.

### Cleanup

After migration, remove duplicated role-internal filter/modal markup that no longer has callers, but retain compatibility exports until a later explicitly scoped cleanup. Do not remove the legacy branch until supported evidence shows no build <=46 population and that removal is separately approved.

### Unverified boundaries

- Physical device update/reinstall and authenticated teacher acceptance cannot be proven without device access and credentials.
- Current external download-manager behavior can be unit-tested and URL-validated, but OEM install prompts vary.
- “All filters” coverage is bounded to the focused source inventory and final semantic search; no claim is made that generated code or inactive experimental branches were inspected.

