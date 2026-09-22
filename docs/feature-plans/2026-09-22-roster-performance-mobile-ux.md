# Roster activation, performance, and mobile UX: isolation and delivery plan

**Date:** 2026-09-22
**Starting revision:** `3678c7990b26e6d5d91a2a405c3dd04e400ee9d3` on `developement`, aligned with `origin/developement` at inspection.
**Evidence rule:** Confirmed = current source or command; Inferred = deduction from named evidence; Unverified = requires runtime, device, data, or user decision.
**Scope:** The named web and mobile flows. The pre-existing uncommitted edits to `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` belong to earlier work and must be preserved.

## 1. Decision summary

1. **Roster import:** offer an explicit, default-off **Activate new accounts without OTP** choice at final preview/commit. Apply it only to new users created by this roster transaction, as the user confirmed. Existing matched users retain their current status; suspended/archived accounts are never silently reactivated. Backend, not the button, sets both `status=ACTIVE` and `isEmailVerified=true`; log the choice and send the temporary credential without an OTP. Keep existing verification endpoints for other onboarding and recovery flows.
2. **Performance:** make the teacher's next decision the page's organizing principle: class overview, learners needing review, intervention response, and concept evidence. Replace dense color-only heatmap cells with a sortable, labeled concept table and clear evidence counts. Comparison must say which baseline/follow-up, assessment scope, dates, sample sizes, and missing-data state are shown. Web and mobile use the same backend definitions.
3. **Mobile:** remove the 60-second updater timer; check at cold launch, return to foreground with a reasonable debounce, and explicit refresh. Let ordinary use continue during check/download. Respect server-required update gates. Do not promise silent APK installation: Android's PackageInstaller user-action exemptions have strict installer/OS/permission conditions ([Android API](https://developer.android.com/reference/android/content/pm/PackageInstaller.SessionParams)).
4. **Mobile UX:** repair the student class action hit areas and destinations; consolidate calendar, class-record, and report filters; give review restrictions a readable question-first view; align login and teacher surfaces to `mobileBrand`; replace native `Alert.alert` usage with one accessible branded dialog host while keeping action semantics.

The performance direction is grounded in the [IES data-use practice guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/12/Published) and its cycle of examining evidence, acting, and monitoring progress. The [IES MTSS DataWall project](https://ies.ed.gov/use-work/awards/project-datawall-decision-support-system-mtss) emphasizes explicit decision rules and progress monitoring. Canvas's [Gradebook guide](https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf) supports compact sorting/filtering over long chip lists. Moodle's [quiz review behavior](https://docs.moodle.org/500/en/Quiz_attempt) supports question-by-question readable review with availability restrictions preserved. These are design references, not claims that Nexora has the same data or policy.

## 2. Scope, assumptions, permissions, non-goals

- User explicitly authorized Phase 1 planning and subsequent implementation, tests, mobile packaging, and shipment once this plan is complete. Preserve unrelated changes and current branch.
- The user confirmed the OTP choice is **per roster commit and new accounts only**. Never reinterpret it as an always-on system setting. The choice must remain visible in the preview and final action.
- Do not weaken password reset, existing-account verification, role checks, academic lifecycle, audit, class-record formulas, or intervention policy. The requested design work should consume existing APIs unless a named contract must change.
- Browser and device acceptance must distinguish mocked/local data from authenticated live school data. A signed APK and emulator render cannot prove a particular phone upgraded.

## 3. Current-state evidence ledger

| ID | State and owner | Evidence and confidence |
|---|---|---|
| R1 | Roster commit has `sectionId`, `enrolledRows`, `pendingRows`, no activation choice. | `backend/src/modules/roster-import/dto/roster-import.dto.ts:103-116`; `next-frontend/src/services/roster-import-service.ts:64-67` — Confirmed. |
| R2 | New import accounts are inserted with `PENDING` and `isEmailVerified=false`, then `UserCreatedEvent` requests an OTP and generated-password email. | `backend/src/modules/roster-import/roster-import.service.ts:735-759,827-853` — Confirmed. |
| R3 | Login rejects unverified or non-ACTIVE users; the listener sends OTP only when `requiresOTP`. | `backend/src/modules/auth/auth.service.ts:34-60`; `backend/src/modules/users/listeners/user-events.listener.ts:20-40` — Confirmed. |
| R4 | Preview page commits registered and pending rows with no mode choice. | `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx:225-251,465-483` — Confirmed. |
| P1 | Web performance fetches summary, at-risk, comparison, logs, diagnostics independently; comparison and heatmap occupy separate long sections. | `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx:574-620,1305-1420,1505-1690` — Confirmed. |
| P2 | Comparison contract exposes class-average/assessment scope, before/after sample size/date/score, trend, and filter options. | `next-frontend/src/types/performance.ts:37-85`; `next-frontend/src/services/performance-service.ts:28-76` — Confirmed. |
| P3 | Mobile performance consumes corresponding summary, risk, and comparison hooks and derives counts locally. | `mobile/src/screens/TeacherPerformanceScreen.tsx:1-170` — Confirmed. |
| P4 | Mobile summary types and screen use legacy `averageBlendedScore`/`thresholdApplied` fields, while the current backend summary returns `averages.blended`/`threshold`. Mobile had no diagnostics consumer for concept evidence. | `mobile/src/types/performance.ts`, `mobile/src/screens/TeacherPerformanceScreen.tsx`, `backend/src/modules/performance/performance.service.ts` — Confirmed during implementation. |
| U1 | Android provider checks on mount, foreground transition, policy failure, and every 60 seconds. | `mobile/src/providers/UpdateProvider.tsx:710-731` — Confirmed. |
| U2 | Student class card already has distinct handlers and `initialTab` destinations; visual layout and actual hit behavior need runtime testing. | `mobile/src/screens/student-classes/StudentClassCard.tsx:192-258`; `StudentClassesView.tsx:172-199` — first clause Confirmed, failure cause Unverified. |
| U3 | Student calendar has horizontal school-year and class `FilterChip` rails. | `mobile/src/screens/CalendarScreen.tsx:81-105,375-432` — Confirmed. |
| U4 | Academic workbook uses multiple wrapping `TeacherChip`/`AdminChip` groups for period, section, student, and item, including protected score actions. | `mobile/src/components/academic/AcademicWorkbook.tsx:215-310` — Confirmed. |
| U5 | Reports present report types as wrapping chips. | `mobile/src/screens/TeacherReportsScreen.tsx:243-275` — Confirmed. |
| U6 | Assessment detail labels a manage action `Review restrictions` when preparation is disallowed; it calls `openEditor()`. Current review/analytics code has question evidence, but the restriction path and policy must be traced before redesign. | `mobile/src/screens/TeacherAssessmentDetailScreen.tsx:520-603` — Confirmed. |
| U7 | Mobile login uses a large gradient/photo hero and `campusColors` aliasing `mobileBrand`; role surfaces use navy `#0C1D3A`, red `#DC2626`, white. | `mobile/src/components/auth/MobileCampusLogin.tsx:87-270`; `mobile/src/components/auth/campus-login-theme.ts`; `mobile/src/theme/mobileBrand.ts` — Confirmed. |
| U8 | Native `Alert.alert` appears in 294 call sites across 60 production files; 28 JSX `Modal` tags also occur. The latter count includes already-custom modal implementations and requires classification before changes. | `rg -n 'Alert\\.alert\\(' mobile/src --glob '!**/__tests__/**' --glob '*.{ts,tsx}'`; `rg -l` and `rg -n '<Modal\\b'` on the same scope, 2026-09-22 — Confirmed within inspected source. |
| U9 | Shared drawer logout uses native `Alert.alert` and runs `onClose` then `onLogout` after confirmation; tests characterize this behavior. | `mobile/src/components/navigation/RoleNavigationDrawer.tsx:140-158`; `__tests__/RoleNavigationDrawer.test.tsx:286-340` — Confirmed. |

## 4. Cascade map and consumer search

| Edge | Provider → interface → consumer | Effect if changed or cut | Risk / disposition |
|---|---|---|---|
| E1 | Admin roster page → typed commit DTO → Nest controller/service | A button without DTO/server support cannot activate accounts; old clients must default to OTP. | Direct, high. Add optional validated flag; update both types and tests. |
| E2 | Commit service → users, userRoles, studentProfiles, enrollments, pendingRoster history | Activation flag must affect **created** users only; enrollment and import-history writes must remain atomic. | Stateful/security, high. Reuse transaction and audit. |
| E3 | Commit service → `UserCreatedEvent` → OTP and password emails | Skipped OTP still needs a safe first credential delivery; event `requiresOTP` must match persisted status. Email delivery after commit can fail. | Async/external, high. Preserve failure reporting/retry path; verify template wording. |
| E4 | User account status → auth login and mobile/web onboarding | `ACTIVE` plus verified marker permits login; pending accounts still follow existing OTP route. | Security, high. Test both modes and wrong/duplicate/existing emails. |
| E5 | Performance API DTOs → web service/page and mobile hooks/screen | Redesign should preserve metric meaning and null/missing states; changing the API would widen consumer work. | Cross-client, high. Keep contract unless evidence proves it insufficient. |
| E6 | Academic record and assessment evidence → performance comparison/heatmap | Color or trend alone can imply a causal intervention effect where samples differ. | Academic, high. Show source, dates, sample size, and evidence gaps. |
| E7 | Release manifest/policy → UpdateProvider → download, hash verification, installer | Removing polling must not skip mandatory upgrade or trust checks. | Operational/security, high. Keep checks on launch/resume/manual refresh. |
| E8 | Student class card → typed navigation `initialTab` → class detail | Cards may appear separate while hit targets overlap or the target tab is ignored. | Direct UX, medium. Test measured hit areas and actual tab state. |
| E9 | Calendar/class record/reports controls → local state/API hooks | New filter controls must preserve options, reset invalid selections, and refetch behavior. | Stateful UX, medium. Change presentation and test state transitions. |
| E10 | Drawer and 59 other modules → `Alert.alert` → callback actions | Modal swap can break destructive confirmation, cancellation, async actions, accessibility, and tests. | Cross-app, high. Inventory signatures then migrate to compatible branded host with queue/fallback and smoke tests. |
| E11 | Assessment restrictions → academic capabilities → editor/review view | Must show questions read-only when `canPrepare=false`, and must never bypass release/grade policy. | Academic/security, high. Separate readable review from edit action. |
| E12 | Backend class summary/diagnostics → mobile performance types, API, hook, screen | Legacy mobile field names yielded `N/A` for current backend summary; lack of diagnostics made mobile concept review diverge from web. The diagnostics GET calls `buildPerformanceDiagnostics`, which upserts `studentConceptMastery` rows. | Contract/stateful, high. Read canonical summary fields and existing diagnostics endpoint, tolerate cached legacy fields, and load diagnostics only when Concepts is opened. |

Search boundary: focused Serena symbols, owning routes, service types, and a production `mobile/src` alert scan. Generated files, dependencies, and unrelated services were excluded. No additional dependency was found within those inspected scopes; endpoint and modal consumer coverage still needs final focused recheck during implementation.

## 5. Conflicts, options, and recommended architecture

### OTP and account activation

- **A. Per-import mode (recommended):** optional `skipVerification=false` in commit DTO, admin preview toggle plus explicit confirmation, and audited status/email/notification behavior only for newly inserted users. Compatible with old clients and existing pending accounts.
- **B. Global admin setting:** affects manual creation and other producers in `users.service.ts`; needs policy owner, persistence, UI, migration, and broader security review. Not implied by a roster-import button.
- **C. Remove OTP globally:** also changes password recovery and activation routes; contradicts current auth contracts and expands account-takeover risk. Reject unless explicitly requested.

Even in A, `isEmailVerified=true` means **administrative attestation**, not proof that the mailbox owner clicked a link. Copy/audit must describe that honestly. A typo in the roster email could send credentials to the wrong person; preview must surface the exact email and require intentional activation selection. Existing users are matched but never activated by this flag.

### Performance display

- **A. Decision workspace (recommended):** summary with data coverage; prioritized learners; intervention response table with before/after source and sample size; concept evidence table with labels and counts; optional details/diagnostics. This fits the current API.
- **B. Chart-only makeover:** faster visually but retains confusing data semantics and color-only interpretation.
- **C. New longitudinal data model:** could add baseline/goal series later, but current before/after contract does not establish regular progress monitoring. Defer schema work.

### Mobile updater and dialogs

- **Updater:** remove only the periodic timer. Cold launch, foreground return with debounce, and explicit refresh cover normal discovery. Background policy fetch/download may be quiet; Android installation may still need user action. Required-update lock must continue to follow server policy.
- **Dialogs:** classify each native alert as information, simple confirmation, destructive confirmation, choice list, or input. Reuse a single branded dialog host for simple cases; preserve specialized sheets/role dialogs where they already meet the design. Do not replace Android system permissions or installer prompts, which the app does not own.

## 6. Contracts, data, security, and errors

- Commit request adds optional `skipVerification?: boolean`, default `false`. No response-envelope or schema migration expected. Recheck all public callers with Serena references and focused text search.
- The response's legacy `pendingRosterIds` and `summary.pending` keys continue to count newly created accounts in both modes, so existing consumers keep working; the DTO comments state that they are not account-status indicators under skip mode.
- Within the existing transaction, insert newly created accounts with `ACTIVE`/verified when true, `PENDING`/unverified otherwise. Emit `requiresOTP: !skipVerification`; still send unique temporary password. Record mode, actor, count, section, and result in `academic.roster.imported` audit metadata without storing cleartext credentials.
- Backend must validate the admin route and reject malformed flags. Preview and final confirmation show how many **new** accounts will be active immediately. `afterAcademicCommit` logs and swallows post-commit mail failures (`backend/src/database/academic-transaction.ts:65-75`), so a successful response confirms database state but **not** delivery. The UI describes an email attempt; operations must watch mail errors and recover undelivered credentials through the established account recovery process. A durable delivery status would require a separate backend job/outbox contract and is outside this activation toggle.
- Performance presentation has no teacher mutation controls and uses existing API calculations. Its diagnostics GET currently refreshes derived mastery rows, so the new mobile consumer requests it only when Concepts is opened. Every derived count is labeled by filter and evidence window; null scores must render as missing, not zero.
- Mobile dialogs must be accessible: focus, close/cancel semantics, back button, screen-reader labels, safe areas, min 44 px touch targets, and serialized queued calls. Logout waits for confirmation and handles asynchronous failure visibly.

## 7. Ordered implementation and validation

1. **Auth contract and web roster.** Owners: backend roster DTO/service/tests; frontend roster service/page/tests. Recheck all callers. Validate both modes, existing-user invariance, audit and event payload, credential email, and login path. Roll back by omitting/false flag; deployed clients remain compatible.
2. **Performance web.** Owners: web teacher performance page and page tests, shared presentation helpers if useful. Keep existing API. Browser test with fixture data for no data, mixed evidence, filtering, narrow and wide viewports; compare values with backend payload. Roll back component layout without data migration.
3. **Performance mobile and targeted screens.** Owners: `TeacherPerformanceScreen`, `StudentClassCard`/`StudentClassesView`, `CalendarScreen`, `AcademicWorkbook`, `TeacherReportsScreen`, assessment detail/review, login components and their existing tests. Validate actions, all filter state, read-only restrictions, GABHS palette, accessibility, and no horizontal clipping on emulator. Roll back by screen.
4. **Updater.** Owner: `UpdateProvider` and provider tests. Verify no periodic timer, launch/resume/manual check, debounce, mandatory policy, download hash/install handoff, Android and iOS branches. Roll back by restoring previous check cadence without touching release policy.
5. **Native alert migration.** Owners: shared UI dialog provider/root and each production file found in the inventory. Migrate by alert category, update tests, search for remaining `Alert.alert`, inspect every bespoke modal for design consistency. Validate confirm/cancel/destructive callbacks and queued alerts. Roll back by module if needed.
6. **Release gates.** Backend lint/type/build/test/e2e as applicable; frontend lint/type/Jest/build/dev/browser; mobile typecheck/Jest/design audit/Expo/emulator. Build signed APK, validate package/version/signer/hash and updater policy, commit scoped files, push `developement`, verify exact-SHA CI, Railway and public artifact. Record any unavailable authenticated or physical-device evidence explicitly.

## 8. Acceptance matrix

| Scenario | Expected evidence |
|---|---|
| Default roster import | Newly created account remains pending, OTP event queued, credential delivery requested, existing matches unchanged. |
| Skip roster import | New account immediately active with verified marker, no OTP event, credential delivery requested, audit records mode; malformed/unauthorized request rejected. |
| Teacher performance web/mobile | Same filtered counts and before/after values; missing evidence and scope stated; concept data is readable without relying on color. |
| Student class actions | Separate 44 px or larger targets; Tasks opens assignments and Schedule opens calendar for the selected class. |
| Filters | Calendar, record, and report controls expose all prior choices without a wrapping button wall; invalid selections reset visibly. |
| Review restrictions | Questions can be read top to bottom while edits remain blocked by academic capabilities. |
| Update check | No 60-second periodic request; launch, foreground, and explicit refresh find updates; normal use continues during non-required checks. |
| Dialogs | No production module imports React Native Alert for app-owned dialogs; cancel and destructive behavior are preserved; system installer/permissions remain platform-owned. |
| Visuals | Login, teacher pages, dialogs, and web page rendered at phone/tablet/desktop sizes; navy/red/white tokens, focus, contrast, and clipping inspected. |

## 9. Rollout, observability, cleanup, unresolved boundaries

- The optional backend flag enables a compatible backend-first rollout. Observe import audit mode/count, account email failures, activation login errors, update policy request rate, and app modal error reports. Do not log passwords or OTPs.
- For Android, expose the new version only after the signed APK's advertised hash/size and download URL match; retain rollback artifact and immutable version policy. No schema rollback is expected.
- Unverified now: actual data distributions and analytics semantics in a school account; behavior on the reporter's physical Android device; whether local browser access can authenticate to teacher/admin routes. Resolve these during implementation/testing, and do not claim device or live acceptance without evidence.
- The previous mobile modernization analysis remains a separate historical document; this is the canonical report and plan for the present request.

## 10. Implementation and verification record

The optional roster flag, admin preview control, state/audit/event behavior, OTP-aware credential email, web performance workspace, mobile performance diagnostics/summary parity, updater cadence, named mobile filters, read-only assessment review, branded login, and app-owned dialog migration are implemented in the working tree. During modal review, a callback ordering issue was corrected so choosing a destructive action does not also run `onDismiss`. The 25 production files using React Native `Modal` were inspected at their modal bodies: they already supply custom sheets/dialog/page content, whereas only `Alert.alert` delegated app-owned copy/buttons to the default Android alert. The platform installer and permission prompts remain OS-owned.

Confirmed local gates as of 2026-09-22: backend lint (0 errors, 2,297 warnings below its 2,300 warning cap), backend full Jest (178 suites/1,800 tests), backend build; web full Jest (200 suites/905 tests), focused roster/performance (2 suites/14 tests), lint, typecheck, and production build; mobile full Jest (149 suites/834 tests), final focused academic workbook/performance tests (2 suites/6 tests), typecheck, and design-system audit. `git diff --check` also passes. The full mobile suite preceded small dialog callback, filter-sheet close, and performance copy/color adjustments; affected focused checks were rerun afterward.

Local browser inspection used fixture data for the web performance action/concept views and roster preview, plus Expo web for the mobile login. A 390 px layout check found no horizontal overflow in those inspected views. An Android 15 x86_64 emulator ran a successful JDK 17 `assembleDebug` build (510 Gradle tasks). Native fixture-backed inspection covered the redesigned login, teacher performance Overview/Concepts/Response, academic class record and filter sheet, teacher reports, and branded logout dialog. The first Response screenshot exposed an undefined sample count; the screen and regression test were corrected, and a second native screenshot showed the explicit unavailable label and no clipping. A no-record class-record fixture also exposed a missing default period; that was corrected and tested. The fixture class lacked `isActive`, so its Create button was disabled by the normal class policy. This is local fixture evidence, not authenticated school acceptance, a production-signed APK, or proof of a physical Android upgrade.

Follow-up native inspection covered the student class card, Tasks and Schedule destinations, calendar/filter sheet, class-workspace safe area, and restricted teacher assessment review. The original class action layout collapsed into small targets under the observed stale Metro render. After a cache-cleared bundle and static `Pressable` styles, Tasks and Schedule each measured 443 px wide with a 31 px gap in the 1080 px emulator; taps reached Assessments and Calendar respectively. The Tasks destination exposed a header beneath the Android status bar and dark title text on navy, fixed with a top safe area and white title. Calendar's selected today cell originally combined white text with a pale blue fill; it now uses white text on red, while unselected today uses red text on pale red. The restricted assessment route originally repeated repair controls and called the question view a student preview; it now shows two fixture questions in a read-only scroll with those controls hidden. Its pale status bar now has dark icons, and returning to the navy Assessments screen restores light icons. Evidence screenshots are in `/home/jethro/.codex/visualizations/2026/09/22/01a0c8a6-4b1b-76d2-9821-fa2b6de75f69/nexora-native-review/`. Focused mobile verification after these changes passed 3 Jest suites/89 tests, typecheck, design-system audit, and `git diff --check`.

The initial release check missed owner-only files outside the repository. A subsequent targeted search found `/home/jethro/.config/nexora/android-release/credentials.env` and `nexora-production.jks`; only the four variable names and certificate fingerprint were inspected, never the credential values. Gradle's `verifyNexoraReleaseSigner` passed with certificate SHA-256 `46cbcee985a7e0ecfda5a8fddfbdd679d9f0312ee07d96a593817302eb7c0a39`, matching the documented production signer and differing from the debug signer.

Java 17, explicit production `/api` URL, and ARM64 build inputs produced `0.1.49`/build 50 from source revision `ba51d78690fdc524671cfab81ff873b7d779024e`; Gradle completed 604 tasks successfully. Archive integrity, `aapt` package/version/SDK/ABI, APK Signature Scheme v2, certificate, alignment, and the backend URL in the packaged bundle passed. The 37,650,538-byte APK SHA-256 is `a5189f94b0958de0fd0fbef2e65a9930bbdf1a1f855d5619e6dc0e479a5c0dd6`. The build 49 and build 50 APKs have the same signer. Immutable and rolling repository copies match the new bytes; `release:prepare`, `release:verify`, and the frontend production build passed after embedding.

The manifest retains build 49 as supported, making its move to build 50 optional while older unsupported builds remain forced; the deployment registration verifier now checks that optional decision too. Public delivery, exact-SHA CI/deployment, and physical-device acceptance remain unverified until their corresponding gates run.
