# Cross-surface assessment, student mobile, APK, and evaluations isolation analysis

Date: 2026-09-14
Phase: 1 — analysis only
Starting revision: `2379d072` on `developement`, equal to `origin/developement` at the start of the investigation

## Executive finding

All five reports are reachable in the current system, but they do not share one root cause.

1. The teacher module's **Create New Assessment** branch is a confirmed legacy bypass around the current `NewAssignmentWizard`.
2. The active student home is a confirmed text-led, vertically repetitive implementation; the reported emptiness is especially visible when there are few pending tasks.
3. The mobile question taker has working server-backed violation counting and sequential-question rules, but its own exit handlers explicitly save and then leave. It also applies anti-cheat listeners to file-upload assessments that legitimately open system pickers.
4. The reported APK size mismatch is confirmed in production. The API advertises build 39 and its 41,071,223-byte package while the download URL now serves build 40 at 92,479,364 bytes. Android supports direct multi-version upgrades; the defect is release-policy/artifact drift.
5. The current admin campaign form and API contract are present and aligned. Production evidence shows an outdated Android build is blocked before campaign validation, so the APK drift can surface as “campaign not created.” The exact build/error seen on the reporter's device remains unverified.

## Scope and evidence method

Inspected surfaces:

- Web teacher module detail and current assignment-creation wizard.
- Web and mobile student assessment takers plus the backend attempt policy.
- Mobile student dashboard data/render path and phone-width runtime output.
- Mobile update provider, API admission, backend version policy, release artifact, manifest, CI, and Railway deploy workflow.
- Mobile admin evaluations screen, typed API service, backend DTO/controller/service, and production update admission.

Evidence used:

- Serena symbol and reference tracing followed by focused source reads.
- Existing focused test suites at the untouched starting revision.
- Read-only authenticated production checks using the supplied student and admin accounts. Credentials and tokens were not written to this report.
- Live version-policy, manifest, APK headers, repository APK metadata, SHA-256, and Android package metadata.
- A 390×844 Expo-web rendering of the supplied student account through a local, non-persistent test proxy to the production API.

No production campaign was created during this phase. That would have changed durable academic/admin data and is not needed to prove the admission failure.

## Evidence ledger

| ID  | Status     | Finding                                                                                                                                                                                                                                                                                            | Evidence                                                                                                                                                                                                                    |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Confirmed  | The module flow directly calls `assessmentService.createDraft({ classId })`, attaches the returned ID, and pushes the editor route.                                                                                                                                                                | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx:1228-1296`                                                                                                                        |
| E2  | Confirmed  | Current module copy tells the teacher that an empty assessment will be created and attached.                                                                                                                                                                                                       | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx:2254-2257`                                                                                                                        |
| E3  | Confirmed  | The current guided flow is `NewAssignmentWizard`: format, class-record destination, title/schedule, idempotent recovery, then `createFromSetup`.                                                                                                                                                   | `next-frontend/src/components/teacher/assessment/NewAssignmentWizard.tsx:29-169`, `:201-430`                                                                                                                                |
| E4  | Confirmed  | The class workspace already uses the wizard and routes successful creation to `.../edit?created=1`.                                                                                                                                                                                                | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx:3368-3391`                                                                                                                                           |
| E5  | Confirmed  | The module test codifies the obsolete behavior by expecting `createDraft`, attach, and direct editor navigation.                                                                                                                                                                                   | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx:504-537`                                                                                                                     |
| E6  | Confirmed  | The active home path is selected by a constant theme comparison; the large legacy render below it is unreachable while the theme background remains `#FBFAF8`.                                                                                                                                     | `mobile/src/screens/DashboardScreen.tsx:1173-1225`                                                                                                                                                                          |
| E7  | Confirmed  | `StudentHomeView` renders greeting, priority, schedule, two vertically stacked move tiles, update, and profile notice almost entirely as text/icon/card rows.                                                                                                                                      | `mobile/src/screens/student-home/StudentHomeView.tsx:228-435`                                                                                                                                                               |
| E8  | Confirmed  | On the supplied account at 390×844, the first viewport was greeting → “Your next move” → one schedule row → the beginning of two more stacked cards. There was no student illustration, subject artwork, or compact at-a-glance day summary.                                                       | Authenticated runtime observation, 2026-09-14                                                                                                                                                                               |
| E9  | Confirmed  | The low-data fallback becomes generic copy (“ready for the day,” “up to date,” “nothing else is due”), preserving the same long vertical geometry instead of creating a purposeful empty state.                                                                                                    | `mobile/src/screens/student-home/StudentHomeView.tsx:186-203`, `:334-395`                                                                                                                                                   |
| E10 | Confirmed  | `buildStudentHomeAgenda` is tested but has no production consumer within the inspected `mobile/src` scope. The active view reimplements prioritization.                                                                                                                                            | `mobile/src/screens/student-home/model.ts:26-62`; only consumer found was `mobile/src/screens/student-home/__tests__/model.test.ts`                                                                                         |
| E11 | Confirmed  | Mobile prevents capture, records screenshot attempts, records non-active `AppState`, resynchronizes on foreground, and asks the backend to increment violations.                                                                                                                                   | `mobile/src/screens/AssessmentTakeScreen.tsx:293-348`, `:409-447`                                                                                                                                                           |
| E12 | Confirmed  | Mobile locks previous-question navigation for strict/timed attempts and requires an answer before advancing in strict mode.                                                                                                                                                                        | `mobile/src/screens/AssessmentTakeScreen.tsx:250-254`, `:471-484`, `:1206-1230`                                                                                                                                             |
| E13 | Confirmed  | Mobile's `beforeRemove` and hardware-back handlers prevent the first event only long enough to save, then dispatch/go back. The visible header back button calls `navigation.goBack()` directly.                                                                                                   | `mobile/src/screens/AssessmentTakeScreen.tsx:449-469`, `:952-967`                                                                                                                                                           |
| E14 | Confirmed  | `AssessmentTake` has no navigator-level gesture lock or presentation containment.                                                                                                                                                                                                                  | `mobile/src/navigation/AppNavigator.tsx:451-458`                                                                                                                                                                            |
| E15 | Confirmed  | Mobile registers screen-capture and app-background violations for file-upload assessments too. System document/image pickers can move the app out of `active`, so permitted uploads can be counted as violations.                                                                                  | `mobile/src/screens/AssessmentTakeScreen.tsx:242-245`, `:409-447`, file-picker ownership in the same screen                                                                                                                 |
| E16 | Confirmed  | Web scopes fullscreen/visibility anti-cheat to an active non-file-upload attempt, restores fullscreen, displays escalating warnings, and relies on the same backend progress/violation contract.                                                                                                   | `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/take/page.tsx:373-473`, `:724-761`                                                                                                                        |
| E17 | Confirmed  | Existing mobile assessment tests cover preparation, rendering, random order, sequential navigation, deadline submission, and foreground resync, but no test asserts that header/hardware/gesture navigation remains blocked during an ongoing question attempt.                                    | `mobile/src/screens/__tests__/screen-render.test.tsx:6795-7152`                                                                                                                                                             |
| E18 | Confirmed  | Repository APK, manifest, and Android metadata agree on build 40 / `0.1.39`, 92,479,364 bytes, SHA-256 `65f08decccc3cc2e11c0ae8b9596a98442e11525a27bbf6d161c2b3853be0aa8`. The APK contains arm64-v8a, armeabi-v7a, x86, and x86_64.                                                               | `mobile/app.json`, `mobile/android/app/build.gradle`, `next-frontend/public/downloads/nexora-student-mobile-release.json`, repository artifact inspection                                                                   |
| E19 | Confirmed  | At 2026-09-14T13:15:20Z, production policy returned build 39/minimum 39 and expected 41,071,223 bytes with SHA-256 `6e4b3664...` for client builds 1, 20, and 38.                                                                                                                                  | `GET /api/app-version/check` live read                                                                                                                                                                                      |
| E20 | Confirmed  | At the same check, the live manifest and live APK served build 40 metadata and 92,479,364 bytes. The live bytes match the repository build-40 hash, not the API's build-39 hash/size.                                                                                                              | `https://nexora-lms.com/downloads/nexora-student-mobile-release.json` and `.apk` live reads                                                                                                                                 |
| E21 | Confirmed  | The update provider verifies the downloaded bytes against API policy and raises `size_mismatch`; it cannot safely accept the different live package.                                                                                                                                               | `mobile/src/services/update/update.service.ts` (`verifyApkIntegrity`), `mobile/src/providers/UpdateProvider.tsx:210-271`                                                                                                    |
| E22 | Confirmed  | CI verifies repository manifest/APK agreement, but Railway deployment never registers that manifest with `/api/app-version/register`. No automated registration caller was found within inspected `.github`, `mobile`, `backend`, `next-frontend`, or root scripts.                                | `.github/workflows/ci.yml:207`; `.github/workflows/railway-deploy.yml`; `mobile/scripts/app-version-release.cjs:300-339`                                                                                                    |
| E23 | Confirmed  | The backend has a secret-protected, monotonic registration endpoint capable of upserting the policy row.                                                                                                                                                                                           | `backend/src/modules/app-version/app-version.controller.ts:46-96`; `backend/src/modules/app-version/app-version.service.ts:40-116`                                                                                          |
| E24 | Confirmed  | Mobile admin campaign creation supplies the DTO's form type, audience, optional class, trimmed title, ISO range, and status; the backend contract accepts the same fields and roles.                                                                                                               | `mobile/src/screens/AdminEvaluationsScreen.tsx:175-212`; `mobile/src/api/services/evaluations.ts:234-254`; `backend/src/modules/lxp/dto/lxp.dto.ts:368-392`; `backend/src/modules/lxp/system-evaluation.service.ts:166-223` |
| E25 | Confirmed  | The admin screen only has source-contract coverage for its builder; it has no rendered interaction test proving the create button's request, failure message, and success reset/invalidation.                                                                                                      | `mobile/src/screens/__tests__/admin-content-insights-contract.test.ts:61-77` and no additional matching test found in inspected mobile test scope                                                                           |
| E26 | Confirmed  | Production authenticated reads to campaigns returned `403 APP_UPDATE_REQUIRED` for Android build 38 and `200` for builds 39 and 40. An invalid create from build 38 was rejected by the update guard; the same invalid request from build 39 reached DTO validation and returned 400 field errors. | Read-only authenticated production checks, 2026-09-14                                                                                                                                                                       |
| E27 | Confirmed  | The mobile client also locally blocks protected requests until Android update admission is `allowed`; the backend guard rejects any identified Android build below the minimum before controller execution.                                                                                        | `mobile/src/api/client.ts:81-118`, `:122-136`; `backend/src/modules/app-version/app-version.guard.ts:16-64`                                                                                                                 |
| E28 | Unverified | The exact Android build and alert text on the device where campaign creation failed.                                                                                                                                                                                                               | No device log/screenshot was supplied; the production mechanism was proven independently.                                                                                                                                   |

## Issue 1 — teacher module assessment creation

### Reachability and state flow

`TeacherModuleDetailPage` owns the Add Block dialog. After a section is selected, assessment has two modes:

```text
Add Block
  -> Assessment
     -> Create New Assessment
        -> createDraft({ classId })
        -> attachItem(sectionId, assessmentId)
        -> refresh module
        -> push legacy editor URL
     -> Attach Existing Assessment
        -> attachItem(sectionId, selected assessmentId)
```

The maintained creation path is different:

```text
NewAssignmentWizard
  -> creation context / academic capability
  -> format
  -> class-record period/category/slot
  -> title, due policy, attempts
  -> idempotent createFromSetup
  -> editor with created=1
```

### Ownership and coupling

- UI owner: teacher module page.
- Guided-flow owner: `NewAssignmentWizard` plus `assignment-creation.ts` and `assessmentService.createFromSetup`.
- Auth dependency: the wizard requires `actorId`; the module page currently does not consume `useAuth`.
- Module dependency: a wizard-created assessment must be attached to the originally selected section after creation succeeds.
- Academic invariants: format immutability, current period capability, gradebook placement, idempotent recovery, and “draft before publish” must remain owned by the current wizard/backend contract.

### Root cause

Confirmed implementation drift: the module page retained the pre-wizard `createDraft` branch and its tests were never migrated when the guided flow became canonical.

### Removal/isolation boundary

Replace only the **create-new** branch. Keep lesson creation, file upload/library attach, and existing-assessment attach unchanged. The module dialog should close into the canonical wizard; on success, attach the returned assessment ID to the stored section and only then navigate to the editor. If attach fails, do not create a second assessment on retry; retain/recover the created ID and offer attachment retry.

No additional create-new assessment branch was found within the inspected module page scope.

## Issue 2 — student mobile homepage

### What is functionally preserved

- Backend/query ownership remains in `DashboardScreen` and bridge components.
- Navigation targets for notifications, class, lesson, assessment, calendar, and profile work in the active view.
- Priority is assessment → lesson → class → classes fallback.
- The supplied account rendered real lesson, schedule, event, profile, notification, and intervention data.

### Why the current design feels empty

The complaint is supported by layout evidence rather than missing data. The active page repeats the same visual grammar—eyebrow, heading, white card, icon, several lines of copy—down one long column. Even with real data, a phone viewport shows one action and one class before the next stacked section. With sparse data, the same large blocks become generic completion text.

The page has no student-facing visual anchor, no compact “today” identity, no subject color/art, and no celebratory/progress treatment. Existing JA assets are available under `mobile/assets/ja/`, including `ja_cheer.png`; no new artwork is required.

### Technical isolation

Redesign `StudentHomeView` and its focused tests while preserving `DashboardScreen` data contracts and navigation. Integrate or remove the orphaned `buildStudentHomeAgenda` helper so priority rules have one owner. Do not revive the unreachable legacy dashboard branch.

The old branch below `DashboardScreen:1225` is technical debt, but deleting the entire branch is not required to improve the active home and would unnecessarily widen this release.

## Issue 3 — mobile assessment containment and anti-cheat

### Existing protections that are real

- Server-owned ongoing attempt, expiry, draft responses, question order, last index, and violation count.
- Strict/timed one-way question navigation.
- Screenshot capture prevention and screenshot listener.
- Background/inactive violation registration.
- Third violation may lock/auto-submit through the backend.
- Foreground resynchronization and a paused UI on sync failure.

### Confirmed gaps

1. Header back, hardware back, and navigator `beforeRemove` all permit leaving after saving.
2. Native back-swipe/gesture is not disabled at route level.
3. The only violation feedback is a status card located after the main question/upload card, so it is not an immediate modal warning like web.
4. There is no pre-attempt policy acknowledgement explaining capture/background/three-strike behavior.
5. File-upload attempts receive capture/background violations even when system pickers are part of the authorized workflow.

### Required policy boundary

Containment applies to an active, non-file-upload question attempt. File-upload assignments keep ordinary navigation and system-picker behavior, matching web's anti-cheat scope. Backend count/auto-submit remains authoritative; mobile must not invent a separate threshold.

Mobile cannot prevent Android's Home/Recents buttons or another app from covering it. It can disable all in-app exit paths, detect lifecycle loss, record it once, immediately display the server-returned warning state on return, and prevent answering while synchronization is uncertain.

## Issue 4 — APK update mismatch across several versions

### Exact failure sequence

```text
Installed build 1/20/38
  -> version check returns policy build 39
  -> expected size 41,071,223 and build-39 SHA
  -> fixed download URL serves current build 40
  -> downloaded size is 92,479,364
  -> verifyApkIntegrity correctly deletes package and raises size_mismatch
  -> admission stays blocked
```

The version gap is correlated but not causal. A clean Android install can update directly from an older signed APK to the newest higher `versionCode`. The app correctly refuses a package whose bytes contradict the signed policy.

### Root cause and release gap

The release flow has three independent states:

1. source/embedded version,
2. hosted manifest/APK,
3. backend `app_versions` policy.

CI covers state 1 ↔ repository state 2. Railway deploy publishes state 2. Nothing in the workflow advances state 3 after the frontend artifact is live. Manual registration was therefore a hidden, fallible release step.

### Recovery and prevention boundary

- Publish the next APK and manifest normally.
- After the frontend deployment and live byte verification succeed, register the exact committed manifest through Railway-injected `CI_ADMIN_SECRET` without printing it.
- Recheck representative old builds, the immediately previous build, and the new build.
- Add one bounded client recovery: on verification mismatch, re-fetch policy and retry automatically only if version/hash/size/URL changed; otherwise keep the hard integrity failure.

The retry improves the short deployment-transition window. It must never weaken size/SHA verification or accept the fixed URL's bytes on trust.

## Issue 5 — admin Evaluations campaign creation

### Current direct path

```text
AdminEvaluationsScreen
  -> New campaign
  -> local title/date validation
  -> evaluationsApi.createCampaign
  -> POST /lxp/system-evaluation-campaigns
  -> backend role/form/date checks
  -> campaign insert
  -> assignments when active
  -> audit record
  -> query invalidation
```

The current source contract is aligned end-to-end. Existing unit suites pass. No direct DTO mismatch, route mismatch, or missing create control was found within the inspected scope.

### Confirmed shared blocker

An Android client below `minSupportedVersionCode` is denied twice: locally by `apiClient` admission and authoritatively by `AppVersionGuard`. The guard runs before `SystemEvaluationService.createCampaign`, so a stale client cannot create a campaign. The current production mismatch simultaneously prevents that same client from installing the advertised build.

This explains a credible deadlock:

```text
old admin APK
  -> campaign POST blocked: APP_UPDATE_REQUIRED
  -> updater downloads bytes newer than policy metadata
  -> integrity mismatch
  -> admin cannot update and cannot create
```

Because the reporter's exact build/error is unavailable, classify that attribution as **Inferred**, backed by a **Confirmed** production mechanism. The campaign builder still needs a rendered interaction regression test so future direct failures are observable and its success/error states are protected.

## Baseline verification at the untouched revision

| Surface                                                                       | Command scope                     | Result                    |
| ----------------------------------------------------------------------------- | --------------------------------- | ------------------------- |
| Teacher module + wizard                                                       | two focused Next.js Jest suites   | 2 suites, 16 tests passed |
| Mobile assessment model, updater/provider, admin API/contract, student agenda | six focused mobile Jest suites    | 6 suites, 63 tests passed |
| Backend version guard/service + system evaluations                            | three focused backend Jest suites | 3 suites, 34 tests passed |

These green tests do not disprove the reports. E5, E17, E22, and E25 show why: the old behavior is asserted, the missing behavior is not asserted, and production registration is outside existing CI verification.

## Risk and blast-radius summary

| Change area               | Primary risk                                                                   | Preserved invariant                                            |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Module wizard adoption    | Orphan draft if module attach fails                                            | Idempotent assessment creation and explicit module attachment  |
| Student home redesign     | Hiding urgent work or breaking navigation                                      | Backend data ownership and one clear next action               |
| Assessment containment    | Blocking legitimate uploads/accessibility or double-counting lifecycle changes | Server violation threshold and file-upload exemption           |
| APK release automation    | Publishing policy before bytes are live or exposing the CI secret              | Exact size/SHA verification and monotonic version registration |
| Admin campaign regression | Test-only confidence masking live admission                                    | Backend RBAC, date validation, assignments, and audit history  |

## Phase 1 exit decision

Proceed to a cross-surface plan. The evidence supports bounded changes in:

- teacher module web UI/tests,
- student home mobile UI/model/tests,
- mobile assessment navigation/listener behavior/tests,
- mobile update recovery/tests,
- release registration script/workflow/tests,
- admin evaluations rendered interaction tests and clearer update-block messaging.

No database schema change, AI-service change, assessment backend threshold change, or campaign API contract change is justified by the findings.
