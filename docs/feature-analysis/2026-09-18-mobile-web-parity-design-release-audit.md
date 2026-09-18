# Mobile APK/IPA Web-Parity, Design, and Release Audit

Date: 2026-09-18

Repository revision inspected: `0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9`

Scope: `mobile/`, its Android release artifact, the iOS SideStore workflow and live rolling prerelease, relevant backend controller contracts, and the corresponding web route inventories.

Boundary: analysis only. No product code, configuration, database state, release, or deployment was changed.

## 1. Executive verdict

The mobile application is **not severely outdated overall at current source**. Student, teacher, and administrator route coverage is broad, the current TypeScript build passes, all 134 mobile test suites pass, and a normalized static endpoint scan found no confirmed literal HTTP method/path mismatch.

The severe problems are concentrated in delivery, native integration, and proof:

| Priority | Finding | Status | Why it matters |
|---|---|---|---|
| P0 release blocker | The Android release APK is signed with the standard Android debug certificate. | **Confirmed** | It is not a production-trustworthy signing identity and is unsuitable for a durable public/school release channel. |
| P0 current iOS parity | The published SideStore IPA is `0.1.41` from commit `5318b475...`; current shared source is `0.1.45` at `0ea31222...`. | **Confirmed** | iPhone testers do not have the current guided redesign, scored exemptions, notification/roster improvements, or teacher lesson authoring. |
| P1 native notifications | Mobile creates local notifications from an authenticated socket and foreground polling, but no device-token registration or APNs/FCM server delivery path was found. | **Confirmed** | Notifications are not reliably delivered while the app is terminated or unable to run its JavaScript/socket/polling loop. |
| P1 Android release hardening | The release allows cleartext traffic, backup, broad legacy/special permissions, and disables Expo Updates in the packaged manifest. | **Confirmed** | This widens the attack/privacy surface and makes the apparent OTA fallback unavailable in the shipped APK. |
| P1 parity governance | Route and fixture checks are substantial but incomplete; the admin manifest mechanically rewrites every baseline entry to `aligned`. | **Confirmed** | A green route test can overstate field, action-order, permission, pagination, and runtime parity. |
| P1 scale/reliability | Several high-traffic screens issue one or more requests per class, reaching `1 + 3N` or `1 + 4N` request shapes. | **Confirmed** | Larger class loads increase latency, radio/battery use, partial failures, and the chance that a module appears incomplete. |
| P1 dependency remediation | The directly bundled Tiptap `3.21.0` editor dependency has current high-severity advisories; `3.31.3` is offered as a non-major fix. | **Confirmed** | Rich-text authoring embeds this code in a WebView-generated asset and should not remain on a known vulnerable release. |
| P2 product integration | A custom URL scheme exists, but no React Navigation linking configuration or initial-URL handler was found. | **Confirmed** | External links cannot reliably open the intended class, assessment, lesson, or notification destination. |
| P2 mobile resilience | React Query state is memory-only; no persisted query cache was found. | **Confirmed** | Previously loaded academic data is not available as a deliberate offline/read-only experience. |
| P2 design completion | Core roots are modern, but several active deep student screens and teacher roots remain on the older presentation layer; large unreachable legacy branches also remain. | **Confirmed source structure; visual severity unverified** | The app can feel inconsistent and the code does not provide a trustworthy migration ledger. |

### Bottom line

The next mobile milestone should **not** be another general page rewrite. It should be a release-trust and delivery-parity milestone:

1. production Android signing and manifest hardening;
2. a current iOS build plus iOS version/update admission;
3. real background push delivery;
4. capability-level parity gates and aggregate endpoints;
5. route-level design migration tracking and removal of unreachable legacy surfaces.

## 2. What was inspected

### Source and route coverage

- Student route inventory and mounted screen map in `mobile/src/navigation/student-route-manifest.ts:8-43` and `mobile/src/navigation/AppNavigator.tsx:311-341`.
- Teacher drawer, stack, and web mapping inventory in `mobile/src/navigation/teacher-route-manifest.ts:8-94`.
- Administrator baseline, current parity registry, and exact web route inventory in `mobile/src/navigation/admin-parity-manifest.ts:46-322` and following entries.
- Current administrator navigator registrations in `mobile/src/navigation/AppNavigator.tsx:931-997`.
- Backend controller decorators and mobile API service call sites, normalized by method and route shape.
- Existing web/mobile audit documents were used as leads, but old findings were rechecked against current source before being retained.

### Native and release coverage

- `mobile/app.json`, checked-in Android project configuration, merged release manifest, and the built release APK.
- Repository mobile release workflows, including `.github/workflows/build-mobile-ios-sidestore.yml`.
- Live GitHub rolling SideStore prerelease and recent workflow runs on 2026-09-18.
- Package compatibility and current npm advisory snapshot.

### Validation run

| Check | Result |
|---|---|
| `npm run typecheck` | Passed, including the administrator contract gate: 19 contracts across 57 layer checks. |
| `npm run test -- --runInBand` | Passed: 134 suites, 756 tests, 0 failures. React test-renderer/`act` warnings remain noisy. |
| `npx expo install --check` | Passed: Expo SDK dependencies are aligned. |
| `npm run release:verify` | Passed for the current Android release metadata. |
| Static mobile/backend HTTP route scan | 318 unique mobile method/path literals versus 475 backend controller routes; no unmatched mobile literal remained after reviewing four typed dynamic path families. |
| APK integrity | 41,119,367 bytes; SHA-256 `72bde7c7ed2c0cb1efeaa1905f89f4c069d994ddedb3ad8433197aa2cc8f2c08`. |
| APK architecture | `arm64-v8a` only. Appropriate for most current physical Android devices, but not a universal/x86 emulator artifact. |
| APK signing | Valid signature, but signer is `CN=Android Debug`; certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. |

Passing source checks establish internal consistency. They do **not** establish current IPA parity, physical-device behavior, production signing, live authenticated behavior, APNs/FCM delivery, or visual acceptance.

## 3. Feature anatomy and current parity

| Surface | Current mobile anatomy | Parity verdict | Important residue |
|---|---|---|---|
| Authentication/onboarding | Login, activation password, reset password, secure storage, refresh/session handling, profile completion | **Broad source parity confirmed** | No current physical Android/iPhone authentication evidence was collected in this audit. |
| Student core | Home, Classes, Assessments, Calendar, JA, Announcements, Profile plus class/module/lesson/assessment/history/results/performance/transcript/LXP routes | **Broad route coverage confirmed** | Several deep screens still use the older presentation system. Route presence is stronger than response-field proof. |
| Assessment attempt | Detail, start/take/results/history; back/gesture protection, app-state handling, screen-capture handling, file-upload exceptions | **Substantially aligned** | Policy acknowledgement and violation feedback UX remain less explicit than the most guided web flow; live device behavior is unverified. |
| JA/LXP/tutor | Current production routes converge into the `JaScreen` Ask, Replay, and Learner's Path workspace | **Current integrated path confirmed** | Standalone `LxpScreen.tsx` and `AiTutorScreen.tsx` are no longer mounted in production navigation and should not be judged as active pages. |
| Teacher core | Home, classes, sections, assessments, calendar, lessons, library, class record, announcements, reports, interventions, performance, evaluations, profile, and deep authoring/review routes | **Broad source parity confirmed** | The published IPA predates teacher lesson authoring and the guided workbench redesign. Root screens are not all migrated to the latest workspace primitives. |
| Administrator core | Dedicated destinations for diagnostics, users, sections, classes, calendar, roster, class record, user reports, library, announcements, reports, evaluations, chatbot, audit, settings, and profile | **Broad current-source parity confirmed** | The parity registry marks alignment mechanically and the fixture gate covers only a subset of actual capabilities. Legacy direct-entry aliases remain. |
| Notifications | Inbox, socket delivery, polling, quiet banner, local native display, tap routing | **Foreground/live-session feature is present** | No device push token, backend token registration, APNs, or FCM sending contract was found. |
| Android update | Backend policy, forced/optional APK flow, HTTPS URL/size/SHA checks, download/install handling | **Integrity flow present** | Release is debug-signed. Expo OTA is attempted in code but disabled in the packaged manifest. |
| iOS update/delivery | Manual/tag-triggered unsigned SideStore IPA workflow | **Incomplete and currently stale** | No iOS update admission or in-app stale-version prompt; no current `0.1.45` IPA; no App Store/TestFlight signing channel. |
| External links | Custom scheme is declared | **Incomplete** | No navigation `linking` map, initial-URL processing, or universal-link/Associated Domains evidence. |
| Offline/read resilience | React Query retries and normal in-memory caching | **Incomplete** | No persisted cache or defined read-only/offline task set. |

### Contract conclusion

**Confirmed:** no additional literal HTTP method/path mismatch was found within the inspected current source. The four unmatched-looking templates were reviewed and resolved to valid backend route families:

- `PATCH /users/${id}/${action}` with typed suspend/reactivate actions;
- `POST /assessments/${kind}/${id}/image` for question/option images;
- `POST /assessments/${id}/${kind}` for attachment/rubric-source operations;
- `GET /reports/${endpoint}` with typed report endpoint keys.

**Not proven:** response field parity, nullability, pagination retention, permission behavior, mutation ordering, and live authenticated behavior. The application does not use one generated contract shared by backend, web, and mobile, so TypeScript success cannot prove cross-repository DTO equivalence.

## 4. Severe and high-impact findings

### F-01 — Android release identity is a debug key

Status: **Confirmed**

Priority: **P0 for production/public distribution; P1 for bounded internal acceptance**

Evidence:

- `mobile/android/app/build.gradle:100-115` defines only `signingConfigs.debug` and assigns it to the `release` build type.
- `apksigner verify --print-certs` identifies the built release signer as `CN=Android Debug`.

Impact:

- There is no protected production signing identity, controlled key custody, or credible long-term update identity.
- A future switch to a production key cannot update installs signed by this debug key through Android's normal same-signature update path.
- A debug key is routinely shared or regenerated and must not be treated as a release secret.

Isolation boundary:

- This can be repaired independently of page parity.
- The work crosses secret storage, CI/local build injection, release verification, installer/update compatibility, and migration instructions for existing debug-signed installs.

Acceptance evidence required:

- production signer certificate fingerprint recorded outside the repository;
- release build fails closed when signing material is absent;
- two consecutive production-signed versions update over one another on a physical device;
- debug-signed and production-signed channels are explicitly separated.

### F-02 — Android's packaged security/update manifest contradicts the intended release behavior

Status: **Confirmed**

Priority: **P1**

Evidence:

- `mobile/app.json:15-29` allows cleartext traffic and includes duplicate notification/vibration permissions.
- `mobile/android/app/src/main/AndroidManifest.xml:3-9` explicitly requests package installation, legacy storage, microphone, overlay, and vibration permissions.
- `mobile/android/app/src/main/AndroidManifest.xml:17-20` enables app backup and cleartext traffic but sets `expo.modules.updates.ENABLED` to false.
- The packaged APK contains those settings; the merged manifest and `aapt dump xmltree` confirm them.
- `mobile/src/services/update/update.service.ts:134-148` attempts Expo OTA only when `Updates.isEnabled` is true, so the packaged release always skips this path.

The packaged APK declares 30+ permission entries after dependency merging, including `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, old external storage permissions, camera, notification, biometric, boot/wake, and many launcher badge permissions. This is not evidence that the app misuses those capabilities. It is evidence that release permission minimization has not been completed. No microphone feature was found in current mobile source.

Impact:

- HTTP transport is not forced to TLS at the platform boundary.
- Backup behavior is broad and no explicit backup/data-extraction rule was found in `android/app/src/main/res`.
- Reviewers/users see permissions that the product may not need.
- OTA configuration in `app.json:52-57` does not match the native artifact actually shipped.

### F-03 — The live iOS artifact is four app versions and four mobile commits behind

Status: **Confirmed live on 2026-09-18**

Priority: **P0 current iPhone parity**

Live evidence:

- Rolling release: [Nexora iOS SideStore — v0.1.41 build 3](https://github.com/Jethro663/capstone-nest-backend/releases/tag/ios-sidestore-latest).
- Release target and latest successful workflow SHA: `5318b475a88ada8aa974023643c1fea41693a3f3`.
- Current source: version `0.1.45`, iOS build number `3`, revision `0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9`.
- The latest successful iOS workflow run was `34921522765` on 2026-09-15.

Mobile changes absent from that IPA:

- `5f4982f4` — notification controls and class roster search;
- `eb3399b4` — scored exemptions in the class record;
- `0620fbb5` — guided workbench redesign;
- `99cb7847` — teacher lesson authoring parity.

Delivery limitation:

- `.github/workflows/build-mobile-ios-sidestore.yml:3-18` runs only by manual dispatch or matching tag.
- The job generates an ephemeral iOS project and an unsigned IPA (`:24-69`, `:150-177`).
- SideStore applies a personal seven-day development signature. This is an acceptance channel, not a durable school deployment channel.
- `mobile/src/providers/UpdateProvider.tsx:107-124` gives every non-Android platform a no-op update provider. An old IPA receives no app-level stale-version warning or admission decision.

### F-04 — Background/offline push notification delivery is absent

Status: **Confirmed within inspected source**

Priority: **P1**

What exists:

- local notification handling and permission request;
- Android channel creation;
- local `scheduleNotificationAsync` calls;
- a notification socket;
- 10-second notification polling and 90-second reminder polling while the provider can run;
- notification tap routing.

Evidence: `mobile/src/providers/LiveNotificationProvider.tsx:38-47`, `:49-61`, `:544-599`, and `:800-895`.

What was not found:

- `getExpoPushTokenAsync` or `getDevicePushTokenAsync`;
- backend registration/revocation of device tokens;
- APNs or FCM credentials/sending integration;
- token rotation, multi-device ownership, logout revocation, or invalid-token cleanup.

Impact:

- The app can turn a socket/polled event into a local banner while its runtime is active.
- It cannot guarantee a server-originated alert after process termination, prolonged suspension, network transitions, or iOS background restrictions.

This is a cross-system feature, not a one-file mobile fix. Backend user/device scope must remain authoritative.

### F-05 — Parity trackers prove mounting more strongly than behavior

Status: **Confirmed**

Priority: **P1 governance**

Evidence:

- `mobile/src/navigation/admin-parity-manifest.ts:46-299` preserves a useful baseline containing explicit `partial` and `missing` findings.
- `mobile/src/navigation/admin-parity-manifest.ts:301-311` then maps every entry to its target route and sets every status to `aligned`, regardless of per-capability evidence.
- The admin typecheck gate currently checks 19 contracts across 57 layers, while the route inventory covers more screens and many more actions.
- The student manifest lists route names but has no web-path/capability mapping comparable to the admin inventory.
- `mobile/src/navigation/teacher-route-manifest.ts:63-94` maps web routes, but `/dashboard/teacher` is mapped to mobile `Classes` even though mobile's actual authenticated teacher landing route is `Home`. This is tracker drift, not a confirmed runtime navigation failure.
- Administrator navigation keeps old direct-entry aliases for Classes, Assessments, and Academic at `mobile/src/navigation/AppNavigator.tsx:988-995`.

Impact:

- A mounted route can be counted as parity even when fields, filters, pagination, authorization, confirmation, exports, or mutation order differ.
- Old saved routes and new canonical routes can keep two visual/behavioral generations alive.

### F-06 — Per-class fan-out is a systemic mobile performance/reliability risk

Status: **Confirmed**

Priority: **P1 at realistic class scale**

Representative request shapes:

| Screen | Request shape after class list | Evidence |
|---|---:|---|
| Teacher Home | assessments + announcements + at-risk for each class (`3N`) | `TeacherHomeScreen.tsx:105-120` |
| Student Classes/Courses | modules + completions + assessments for each class (`3N`) | `CoursesScreen.tsx:67-84` |
| Student Lessons compatibility screen | modules + completions + announcements + assessments for each class (`4N`) | `LessonsScreen.tsx:277-302` |
| Teacher Calendar | assessments + announcements for each class (`2N`) | `TeacherCalendarScreen.tsx:108-117` |
| Student Calendar | assessments + announcements for each class (`2N`) | `CalendarScreen.tsx:149-157` |
| Teacher Library | modules for every class plus files/folders/storage | `TeacherLibraryScreen.tsx:47-48` |

Impact:

- Larger teachers and students pay linearly increasing startup and refresh cost.
- `Promise.all` refreshes create burst traffic and all-at-once failure behavior.
- Partial errors can look like missing modules, announcements, or assessments even when the underlying feature exists.

The durable fix is a backend-owned, paginated/aggregated workspace contract or explicitly bounded concurrency—not only more client retries.

### F-07 — A directly bundled rich-text dependency is behind a security fix

Status: **Confirmed from the 2026-09-18 npm advisory snapshot**

Priority: **P1/P2, depending on reachability review**

Evidence:

- `mobile/package.json:35-37` and `:88-113` pin the Tiptap family to `3.21.0`.
- `npm audit --omit=dev` identifies high-severity advisories in `@tiptap/core` and offers `3.31.3` without a major-version change.
- Tiptap is bundled into `mobile/src/generated/assessment-rich-text.ts` and loaded for assessment rich-text editing.

The same audit reports 65 vulnerable package nodes: 1 critical, 20 high, 42 moderate, and 2 low. That total must not be interpreted as 65 exploitable APK vulnerabilities. For example, the critical `shell-quote` path comes through React Native's `react-devtools-core`, and many high entries are Expo/Metro build tooling. Each path needs reachability and final-bundle classification. Tiptap is called out separately because it is direct and intentionally bundled into an in-app WebView asset.

### F-08 — Declared deep-link capability is not wired to navigation

Status: **Confirmed within inspected source**

Priority: **P2**

Evidence:

- `mobile/app.json:7` declares `nexora-lms-mobile`.
- Android intent filters declare the scheme at `mobile/android/app/src/main/AndroidManifest.xml:26-32`.
- `NavigationContainer` at `mobile/src/navigation/AppNavigator.tsx:1268-1287` has no `linking` configuration.
- No `Linking.getInitialURL`, URL subscription, or equivalent initial external URL handler was found.

Notification taps have their own internal resolver, but that does not make external email/web links functional deep links. iOS universal links/Associated Domains were also not found.

### F-09 — Offline behavior is accidental rather than a defined feature

Status: **Confirmed within inspected source**

Priority: **P2**

- `mobile/src/providers/AppProviders.tsx` mounts a normal `QueryClientProvider`.
- `mobile/src/api/queryClient.ts` configures in-memory retries/staleness.
- No React Query persister or persistent query cache was found.
- Network state is used by an administrator status hook, not as an application-wide offline mode.

This does not mean every mobile action should work offline. A safe scope would be persisted, explicitly stale, read-only views for the last synchronized schedule, class list, released lesson content, and notifications. Submissions, grading, lifecycle actions, and official state should remain online/backend-authoritative.

## 5. Design-generation audit

### Current design verdict

There is **no evidence that every mobile page is severely visually outdated**. The source shows a mixed but improving design system:

- Student Home, Classes, Assessments, and Announcements delegate to current presentation views.
- JA was part of the 2026-09-16 guided workbench change.
- Most deep teacher workspaces use `TeacherWorkspacePrimitives` alongside teacher mobile primitives.
- Administrator screens broadly use `AdminMobilePrimitives`.

The remaining problem is incomplete migration plus ambiguous ownership, not a wholly obsolete app.

### Active screens closest to the older design generation

These are the first visual-review targets because they still compose local layouts from generic primitives and `studentDarkTheme` instead of a route-level current workspace system:

1. `AssessmentHistoryScreen.tsx`
2. `AssessmentResultsScreen.tsx`
3. `TranscriptScreen.tsx`
4. `CalendarScreen.tsx`
5. `ProfileScreen.tsx`

Teacher roots that appear one generation behind the migrated deep workbenches are Home, Classes, Sections, Assessments, Calendar, and Profile. They are not confirmed broken; they are confirmed to use the older primitive layer rather than the newer workbench composition.

**Visual severity remains Unverified** because this audit did not capture current authenticated screenshots across small Android, large Android, and iPhone dimensions. Source age and primitive choice identify candidates, not a visual acceptance verdict.

### Severe code staleness that is mostly not user-visible

Four active wrapper files select their new views with comparisons against constant theme values, leaving large old render trees unreachable below the branch:

- `DashboardScreen.tsx:1173-1225` selects `StudentHomeView`;
- `LessonsScreen.tsx:408-425` selects `StudentClassesView`;
- `AssessmentsScreen.tsx:527-545` selects `StudentAssessmentsView`;
- `AnnouncementsScreen.tsx:90-110` selects `StudentAnnouncementsView`.

This is important because a file-top marker could label the whole file “updated” while hundreds of lines of obsolete design remain in the same file.

Other dormant inventory:

- `StudentRoutePlaceholder` and placeholder factories remain in `AppNavigator.tsx:143-221`, but no production route references them.
- Standalone `LxpScreen.tsx` and `AiTutorScreen.tsx` have no production source references; current LXP/tutor routes use `JaScreen` at `AppNavigator.tsx:272-308`.
- `TeacherUnsupportedScreen.tsx`, `ProgressScreen.tsx`, and `RoleWorkspaceScreen.tsx` have no current navigation references within the inspected scope.

These dormant files should be removed only after import/reference, test, and saved-route reconciliation. They are cleanup targets, not evidence that current users see placeholder pages.

### Corrected older findings

The following older concerns are **not current findings**:

- Student Home's “Small steps” cards are now stacked, and class-card actions use a full-width primary action plus wrapping secondary actions. Current tests assert this layout.
- Teacher structured lesson authoring now has typed block editing/rendering and current parity tests.
- Assessment exit containment now covers navigation removal, Android hardware back, swipe gestures, app-state changes, screen capture, and file-upload exceptions.
- The administrator mobile route set is no longer the small generic-tools surface described by the older baseline audit.

## 6. Cascade map

| Edge | Source | Downstream consumers | Failure mode |
|---|---|---|---|
| C-01 | Android signing configuration | APK installer, update compatibility, release verification, existing installs | A signing change can make installed debug builds non-upgradable without uninstall/data loss. |
| C-02 | `app.json` plus checked-in native manifest | Expo config, Gradle merge, packaged APK, OTA runtime | Metadata says OTA is configured while the native artifact disables it. |
| C-03 | Backend notification event | socket/poll provider, local notification scheduler, OS notification tray | Delivery stops when the client runtime cannot receive/poll; there is no server-to-device push leg. |
| C-04 | Class count `N` | home, courses, lessons, calendars, library, refresh behavior | Request bursts and partial failures grow linearly or by several calls per class. |
| C-05 | Route parity manifest | tests, developer confidence, migration decisions | Mechanical `aligned` status can hide missing field/action/runtime evidence. |
| C-06 | Theme-constant branch | mounted new view and unreachable legacy render tree | File-level design labels become misleading and future edits can land in dead code. |
| C-07 | Shared-source commit | Android artifact, manual iOS workflow, rolling prerelease | Android/current source advances while iPhone testers stay on an older feature set. |
| C-08 | Tiptap dependency pin | generated editor HTML, WebView authoring, stored rich text | A vulnerable direct dependency stays embedded until the generated asset is rebuilt and retested. |

## 7. Isolation and disassembly assessment

### Safe independent work packets

#### Packet A — Android release trust

Owners: signing/CI, Android native config, release verifier.

Keep out: screen redesign and API feature work.

Tasks:

- introduce a protected production signing configuration and fail-closed release build;
- define migration behavior for existing debug-signed installs;
- disable cleartext in production while preserving an explicit development build path;
- minimize permissions from actual feature use;
- add backup/data-extraction rules or disable backup as policy requires;
- reconcile Expo Updates metadata with the packaged native manifest.

Validation:

- manifest diff, signer fingerprint, release verification, clean install, same-signer upgrade, forced/optional updater, HTTPS-only failure path.

Rollback:

- retain a clearly named internal debug-signed artifact channel; never silently mix its update policy with production.

#### Packet B — iOS current-delivery parity

Owners: iOS workflow, version policy, release evidence.

Keep out: App Store distribution unless separately authorized.

Tasks:

- build and publish an IPA from the exact current accepted source revision;
- add iOS version/update awareness instead of the current no-op provider;
- decide whether SideStore remains acceptance-only or a durable signed/TestFlight channel is required;
- run authenticated physical-iPhone acceptance for the four missing change groups.

Validation:

- source SHA/version/build metadata, archive hash, install, login/refresh, navigation, notifications, file flows, lesson authoring, scored exemptions, and update behavior.

Rollback:

- preserve immutable prior IPA/hash metadata; rolling-tag movement alone is not sufficient evidence.

#### Packet C — Server-originated mobile push and deep links

Owners: backend notifications, mobile native provider, APNs/FCM credentials, navigation routing.

Keep out: changes to notification academic-record ownership or global deletion semantics.

Tasks:

- create user/account-scoped device registration, rotation, logout revocation, and invalid-token cleanup;
- send APNs/FCM messages from backend-owned notification events;
- map safe notification payloads and external links to allowlisted mobile destinations;
- define foreground, background, terminated, denied-permission, and multi-device behavior.

Validation:

- Android and iPhone foreground/background/terminated tests, token rotation, account switch, revoked device, duplicate suppression, and destination authorization.

Rollback:

- feature flag server sending while keeping the current inbox/socket path authoritative.

#### Packet D — Contract and data-orchestration hardening

Owners: backend contracts, web/mobile API clients, contract tests.

Keep out: visual redesign.

Tasks:

- replace route-only parity with a capability matrix covering request, response, permissions, pagination, action order, and runtime proof;
- stop mechanically rewriting every admin baseline entry to aligned;
- generate or share schemas where feasible;
- add aggregate/paginated cross-class endpoints for high-fan-out workspaces;
- retain ordinary per-class endpoints for focused detail screens.

Validation:

- contract fixtures for all consequential actions, representative high-class-count load tests, partial-failure behavior, and web/mobile comparison against the same seeded account.

Rollback:

- mobile can fall back to per-class endpoints behind one query adapter if the aggregate endpoint fails during rollout.

#### Packet E — Route-level design completion and dead-surface removal

Owners: mobile design system and navigation.

Keep out: contract/behavior changes unless separately reviewed.

Tasks:

- visually audit the five student deep-screen candidates and older teacher roots on current devices;
- assign each reachable route a design generation/status;
- migrate one coherent route family at a time;
- delete theme-constant unreachable render branches after behavior snapshots/tests pass;
- remove dormant screens/placeholders only after saved-route and notification-route checks.

Validation:

- route inventory completeness, small/large Android and iPhone screenshots, dynamic text, keyboard, reduced motion, screen-reader labels, back/drawer behavior, and existing mutation tests.

Rollback:

- route-level component switch, not a file-wide flag or dual permanent render tree.

## 8. Recommended improvement backlog (maximum five)

1. **Establish trusted Android and current iOS releases.** Production signing, hardened manifest, exact-SHA artifacts, current IPA, and physical-device acceptance come before more UI polish.
2. **Implement backend-owned remote push plus safe deep links.** Preserve user scope and source records; add full lifecycle tests for tokens and destinations.
3. **Replace route parity with capability parity.** A route is not aligned until fields, permissions, pagination, mutations, action order, and runtime evidence are recorded.
4. **Collapse per-class fan-out.** Add bounded aggregate/paginated contracts for overview screens and define a small persisted read-only offline surface.
5. **Create a route-level design ledger, then remove dead generations.** Prioritize active deep student screens and teacher roots; clean unreachable branches and dormant screens after acceptance.

## 9. Should updated pages get a `//1` marker?

**No. `//1` is too ambiguous and will become false evidence.**

It does not record:

- which design generation “1” means;
- whether the route is fully migrated or only partially restyled;
- which role and route were reviewed;
- whether behavior, accessibility, and physical-device rendering passed;
- when it was reviewed and against which accepted design;
- whether the file also contains unreachable legacy branches or multiple screens.

The current source demonstrates the problem: `DashboardScreen.tsx`, `LessonsScreen.tsx`, `AssessmentsScreen.tsx`, and `AnnouncementsScreen.tsx` mount a new view but retain a large older view in the same file. A top-of-file `//1` would call both generations updated.

### Better tracking model

Use one route-level design migration registry as the source of truth. Each reachable route should record:

| Field | Example meaning |
|---|---|
| Role + route | `student / AssessmentResults` |
| Design generation | `student-guided-workbench-v2` |
| Status | `legacy`, `partial`, `migrated`, or `accepted` |
| Owner component | actual mounted component, not only the wrapper filename |
| Behavior preserved | submission, grading, notification, or lifecycle contract that must not change |
| Evidence | test names and current screenshots/device matrix |
| Reviewed revision/date | exact Git SHA and review date |
| Known residue | dead branch, old alias, accessibility issue, or missing device proof |

Then add a check that:

- every reachable student/teacher/admin route appears exactly once;
- no removed/dormant file counts as an updated route;
- `accepted` requires source tests plus the agreed visual/accessibility evidence;
- missing and duplicate route entries fail the check.

If a human-readable file comment is still useful, use it only as secondary metadata, for example:

`DESIGN_STATUS: student-guided-workbench-v2 | partial | registry=AssessmentResults | reviewed=2026-09-18`

That is searchable and descriptive. The route registry—not the comment—should decide whether a page is considered current.

## 10. Uncertainty and remaining proof

### Confirmed by this audit

- current source route inventories and mounted screen mappings;
- current TypeScript/test/Expo dependency checks;
- normalized literal method/path compatibility within the inspected source;
- current APK version, size, hash, ABI, signer, permissions, and update metadata;
- current live SideStore release version/SHA and workflow history;
- absence of push-token registration, navigation linking configuration, and persistent query cache within inspected source;
- fan-out query shapes and mixed design-generation source structure.

### Inferred, with reasons

- Background notification reliability is inadequate because delivery depends on client socket/poll execution and no server-to-device push leg was found.
- Larger accounts will see more latency/partial failures because overview request counts grow by multiple calls per class.
- The older primitive screens are the most likely visual-consistency outliers because they are outside the newer route-specific workspace systems.

### Unverified

- authenticated live backend behavior for every student, teacher, and administrator action;
- response-field parity for all dynamic payloads;
- current physical Android installation/update/login behavior;
- any physical iPhone behavior for source `0.1.45` because no such current IPA is published;
- APNs/FCM delivery, since no implementation was found;
- small-screen, large-screen, iPhone, keyboard, screen-reader, and reduced-motion visual acceptance for every route;
- production deployment state beyond the read-only artifact/workflow evidence listed above.

No additional dependency or contract-path mismatch was found within the inspected scope. This is a bounded result, not proof that no runtime or semantic mismatch exists anywhere in the product.
