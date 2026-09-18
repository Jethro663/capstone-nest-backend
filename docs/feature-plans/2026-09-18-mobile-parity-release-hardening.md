# Mobile parity, release trust, native delivery, and design-completion plan

Date: 2026-09-18

Plan status: source and local Android artifact complete; CI, deployment, iOS publication, and physical-device evidence in progress

Authoritative evidence: `docs/feature-analysis/2026-09-18-mobile-web-parity-design-release-audit.md`

Evidence revision: `0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9`

Implementation target: current `developement` checkout; preserve unrelated work and the existing verified Android updater behavior

## Implementation checkpoint — 2026-09-18

The approved source work now covers every audit row. Automated source gates are green; release and physical-device gates remain evidence-bearing and are not treated as accepted until their artifacts exist.

| Area | Current status | Evidence boundary |
|---|---|---|
| Governance and design truth | Source complete | Typed design registry accounts for all 72 reachable routes; administrator/teacher mappings no longer manufacture blanket alignment. Device visual acceptance is pending. |
| Rich-text dependency | Source complete | Tiptap is upgraded to `3.31.3`, the generated editor is rebuilt, and its build/tests pass. Physical WebView authoring remains a device gate. |
| Android trust and hardening | Local artifact verified | Release signing fails closed, debug signing is rejected, cleartext and backup are disabled, and broad permissions/Expo OTA residue are removed. Build 47 is signed, aligned, arm64-only, and recorded in `docs/operations/mobile-release-evidence-2026-09-18.md`; public-byte and physical upgrade checks remain. |
| Platform-neutral releases | Android artifact ready | Additive migration, Android aliases, real iOS decisions, monotonic build identity, immutable artifact rules, and workflow tests are implemented. Android registration waits for deployment/public-byte equality; iOS publication remains pending. |
| Push and deep links | Source complete | Per-installation encrypted token lifecycle, queued delivery/receipts, kill switch, role-aware allowlist, deferred-auth routing, and private Android lock-screen presentation are implemented and tested. Terminated-device delivery remains a physical/runtime gate. |
| Bounded reads and offline snapshots | Source complete | Student/teacher overview, calendar, and teacher-library read models replace audited fan-out paths; snapshots are read-only, allowlisted, user-scoped, stale-labeled, and purged on logout/account switch. The aggregate clients intentionally cut over directly rather than retain a dormant fan-out fallback that could recreate F-06; rollback is by deployment. |
| Active design migration and cleanup | Source complete | The audited student deep-route family and teacher root family use current shared workspaces; constant old trees and proven-dormant screens are removed. Visual/device acceptance remains pending. |
| Automated verification | Passed | Mobile: 141 suites/802 tests; backend: 178 suites/1,796 tests; backend build, lint ceiling, mobile typecheck, migration forward/rollback, release/workflow tests, and Expo dependency alignment pass. |
| Dependency residual | Documented | Production audit is reduced from 39 to 24 advisories (0 critical, 9 high, 15 moderate); remaining React Navigation 7 and Expo 57 remediation requires separately tested breaking upgrades. |

The exact source/artifact SHAs, hashes, signer identity, public-byte checks, CI/deployment results, and remaining external acceptance gates are recorded in the release evidence generated during Phase 7.

## 1. Decision

Use a **staged cross-system remediation program**, not a page-by-page rewrite and not a single big-bang release.

The program will make release identity and distribution trustworthy first, add the missing native delivery contracts second, replace weak parity claims and high-fan-out data loading third, and then migrate the remaining active visual families while deleting only proven-dead generations.

The accepted distribution model for this plan is:

- Android remains a school/internal website-sideload channel, but moves to a protected project-owned production signing key.
- iOS remains the already-designed free SideStore acceptance channel. App Store/TestFlight distribution and a paid Apple Developer membership are not assumed.
- APNs-capable iOS background-push proof is an external acceptance gate because free personal signing does not provide a durable production push channel.
- Play Store, App Store, TestFlight, enterprise MDM, and universal/app-link domains remain outside this milestone unless separately authorized.
- Expo OTA is intentionally not presented as a release capability in this milestone. The existing verified binary admission/updater flow remains authoritative until an owned OTA publishing, channel, rollback, and observation procedure exists.

This plan touches every confirmed problem in the audit. Where external credentials or physical hardware prevent final proof, the implementation must finish the source and contract work, report the exact unverified gate, and must not label that capability accepted.

## 2. Outcome

Ship a mobile release train in which:

1. Android artifacts are production-signed, HTTPS-only, permission-minimized, backup-safe, and visibly separated from legacy debug-signed installs.
2. iOS artifacts are built from the accepted source revision, have monotonic build identity, are registered in a platform-neutral release policy, and warn or block stale clients appropriately.
3. authenticated users can register multiple mobile installations and receive backend-originated push messages without changing notification ownership or deleting the originating academic record.
4. notification taps and external custom-scheme links use one allowlisted, role-aware navigation resolver.
5. overview screens consume bounded backend read models rather than `2N`–`4N` per-class bursts, with a narrowly defined read-only offline snapshot.
6. parity is recorded per capability and design status per reachable route; neither mounted routes nor file comments can manufacture an `accepted` result.
7. direct rich-text runtime dependencies are remediated and regenerated assets are proven compatible.
8. active older-generation student and teacher routes are migrated coherently, unreachable branches are removed, and dormant files stop polluting the inventory.
9. exact source SHA, CI, deployed policy, archive hash, installed artifact, and physical-device evidence remain separate and explicit.

## 3. Scope and boundaries

### In scope

- Android signing, manifest, permission, backup, release verification, artifact packaging, and installed-update migration.
- iOS build numbering, current SideStore artifact publication, platform-aware update admission, artifact metadata, and acceptance evidence.
- Backend-owned push-device registration, token lifecycle, queued delivery, invalid-token cleanup, and mobile integration.
- React Navigation custom-scheme linking and reuse of the existing safe notification-route semantics.
- Capability-level student, teacher, and administrator parity tracking and gates.
- Backend-owned aggregated mobile read models for high-fan-out overview screens.
- A small, per-user, read-only offline snapshot with explicit staleness and privacy limits.
- Tiptap upgrade, generated rich-text rebuild, WebView compatibility, and production-reachability classification of remaining advisories.
- Route-level design migration registry; active older-generation migrations; dead-branch and dormant-screen removal.
- Automated and physical-device verification, release, rollback, and post-release observation.

### Preserved invariants

- Backend remains the authority for auth/RBAC, notification scope, official academic state, audit history, and release admission.
- Web and mobile continue to call backend `/api`; mobile never calls `ai-service` directly.
- Existing Android package identity `com.nexora.lms.mobile` and iOS bundle identity remain unchanged.
- Existing per-class endpoints remain available for focused detail screens and as a temporary aggregate-read fallback.
- Notification inbox rows and the originating academic/content record remain authoritative; push is a delivery side effect only.
- Submissions, grading, lifecycle mutations, assessment attempts, authoring, and other official writes remain online-only.
- GABHS red, white, and navy identity; current role navigation; and current accepted workflows remain fixed during visual migration.
- Existing verified Android size/SHA enforcement, bounded one-time policy refresh, monotonic release registration, and deploy-time artifact checks are retained.
- The current no-paid-Apple-program SideStore constraint is retained.

### Out of scope

- Store submission, paid Apple enrollment, enterprise signing, MDM, or public app-store launch.
- A new cross-platform design language or navigation hierarchy.
- Rewriting backend domain modules only to make mobile code shorter.
- Offline mutation queues or client authority over official state.
- Treating all npm audit entries as device-exploitable without reachability evidence.
- Replacing current notification inbox, socket, polling, or local foreground presentation; push complements them.
- Adding `//1` or another file-top marker as the source of truth.
- Unrelated web redesign or AI-service changes.

## 4. Evidence cross-reference and closure map

| Audit ID | Confirmed problem | Planned closure | Primary phase | Acceptance evidence |
|---|---|---|---|---|
| F-01 | Android release uses the debug certificate | Protected production signing, fail-closed Gradle configuration, signer assertion, legacy-install migration | Phase 2 | Expected release certificate fingerprint plus two-version same-signer physical upgrade |
| F-02 | Cleartext, broad backup/permissions, and misleading OTA configuration | Release HTTPS policy, debug-only local HTTP path, permission minimization, backup policy, explicit binary-only update contract | Phase 2 | Merged-manifest test, packaged APK inspection, feature permission smokes |
| F-03 | Published IPA is stale and iOS admission is a no-op | Monotonic iOS build, neutral artifact policy, current exact-SHA IPA, iOS stale-version UI | Phase 3 | Workflow archive/hash/SHA plus signed physical install and acceptance |
| F-04 | No server-originated background push | User-scoped device registry, queued Expo push adapter, lifecycle cleanup, mobile registration | Phase 4 | Android terminated delivery; iOS source complete, live APNs proof gated by signing/credentials |
| F-05 | Route trackers overstate behavioral parity | Capability registry with explicit evidence states and completeness gates | Phase 1 | All reachable routes/capabilities accounted for; no mechanical `aligned` rewrite |
| F-06 | Overview screens issue `2N`–`4N` request bursts | Role-scoped aggregate read models, one client adapter, bounded fallback, load budgets | Phase 5 | Request-count and representative high-class-count load tests |
| F-07 | Tiptap 3.21.0 is directly bundled behind a fix | Upgrade supported Tiptap family, regenerate embedded editor, verify stored-rich-text compatibility | Phase 1 | Audit delta, editor unit/integration tests, Android/iPhone authoring smoke |
| F-08 | Declared scheme is not connected to navigation | One allowlisted linking map shared with notification routing | Phase 4 | Cold/warm/deferred-auth deep-link tests and unauthorized-destination rejection |
| F-09 | Offline behavior is accidental | Explicit low-sensitivity read-only snapshot, user-scoped purge, staleness UI | Phase 5 | Airplane-mode view tests, account-switch/logout purge, no writes enabled |
| D-01 | Active student deep screens use the older presentation layer | Migrate one coherent student deep-route family with behavior snapshots | Phase 6 | Android/iPhone visual, accessibility, navigation, and mutation regression evidence |
| D-02 | Teacher roots are one generation behind deep workbenches | Migrate teacher root family using current primitives | Phase 6 | Same device/accessibility matrix and preserved route behavior |
| D-03 | Constant branches retain large unreachable old render trees | Delete branches only after mounted-view behavior tests pass | Phase 6 | Import/reference check and focused suites |
| D-04 | Dormant screens/placeholders contaminate inventory | Remove only after navigation, saved-route, and notification-route reconciliation | Phase 6 | Zero production references plus full route-registry gate |
| GOV-01 | `//1` cannot prove route/design acceptance | Typed route-level design ledger with evidence and revision metadata | Phase 1 | Completeness/uniqueness test; `accepted` cannot exist without evidence |

No audit finding is closed solely by documentation. A row becomes accepted only when its listed evidence exists.

## 5. Options considered

### Option A — staged cross-system program (recommended)

First establish honest registries and tests, then release trust, iOS admission, push/deep links, aggregate data/offline behavior, and finally visual migration/cleanup.

Advantages:

- isolates signing and schema migrations from large visual changes;
- preserves a rollback seam for push, aggregate reads, offline snapshots, and each visual family;
- lets exact artifact and device evidence accumulate at the point where it matters;
- avoids calling source-complete work device-accepted.

Cost: more than one release candidate and explicit compatibility adapters during rollout.

Decision: **selected**.

### Option B — one big-bang parity release

Change signing, release schema, push, data loading, offline behavior, dependencies, and all older screens in one version.

Rejected because signer migration can already require a one-time reinstall, while push credentials, data aggregation, and page migration introduce independent failure domains. A single artifact would make rollback and cause isolation unsafe.

### Option C — client-only cleanup and page redesign

Update the visible screens, add comments, refresh the IPA, and leave release identity, push, parity claims, and request fan-out unchanged.

Rejected because it would improve screenshots while preserving the severe delivery and trust failures identified by the audit.

### Option D — activate Expo OTA immediately

Align native Expo Updates metadata and publish JavaScript changes through EAS Update.

Deferred. No repository-owned publish/channel/promotion/rollback/observation procedure exists, and the current binary updater already has verified policy and integrity controls. Enabling OTA without those operating controls would convert a configuration contradiction into an ungoverned release path. A later OTA proposal can add it deliberately.

## 6. Target architecture

### 6.1 Release identity and admission

```text
accepted source SHA
  -> platform build and tests
  -> artifact metadata (platform, version, build, SHA, size, URL, source SHA)
  -> signer / archive verification
  -> publish immutable artifact
  -> register exact public artifact with backend policy
  -> old/current admission assertions
  -> physical install / update acceptance
```

Android and iOS share a neutral backend decision envelope, but installation remains platform-specific:

- Android verifies the APK byte size and SHA before invoking the package installer.
- iOS opens the controlled SideStore release/help destination; the app never attempts APK-style installation.
- Both platforms can be optional, forced, current, or temporarily unavailable.
- A missing or invalid policy fails visibly. It is not silently treated as current.

### 6.2 Notification delivery

```text
domain event
  -> durable notification row(s)
  -> existing socket/inbox path
  -> post-commit push dispatch job by notification ID
  -> active device registrations for that notification owner
  -> Expo Push Service adapter
  -> receipt reconciliation / invalid-token disable
```

The durable notification row is the source of truth. Push payloads contain the minimum routing identifiers required to re-fetch authorized content. They do not contain grade details, assessment answers, private report text, refresh tokens, or full academic payloads.

### 6.3 Deep-link resolution

```text
external custom-scheme URL OR notification tap
  -> parse allowlisted route kind and IDs
  -> wait for auth/session restoration when required
  -> confirm role/route is permitted
  -> navigate to canonical destination
  -> fall back to inbox/home with a plain error if stale or unauthorized
```

One resolver owns route kinds; notification and URL adapters only translate inputs. Unknown hosts, paths, query keys, or roles never become arbitrary navigation actions.

### 6.4 Mobile overview read models

```text
mobile overview request
  -> backend authenticates actor and role
  -> bounded database queries over all authorized classes
  -> compact, versioned response with per-section partial-state metadata
  -> mobile query adapter
  -> live view + selected offline snapshot fields
```

Read models calculate derived summaries at request time from authoritative tables. They do not introduce a second durable grade, completion, or academic-status store.

### 6.5 Governance registries

Two related but distinct registries are required:

1. **Capability parity registry** — route/capability, request/response fields, permissions, pagination, mutation order, backend/web/mobile owners, evidence, and status.
2. **Design migration registry** — role/route, mounted component, design generation, status, preserved behaviors, visual/accessibility evidence, reviewed SHA/date, and known residue.

Status values are evidence-bearing:

- `legacy`: current route is reachable and deliberately not migrated;
- `partial`: some target capabilities or design conditions remain;
- `migrated`: source change is complete but full acceptance evidence is not;
- `accepted`: required tests and the configured runtime/device evidence exist;
- `not_applicable`: reason is explicit and tested where needed.

No mapping function may rewrite every entry to `aligned` or `accepted`.

## 7. Contract and schema decisions

### 7.1 Platform-neutral app release policy

Current `app_versions` data uses APK-specific column and response names even though `platform` already permits iOS. Use an additive compatibility migration.

Add neutral columns:

| Field | Type | Rule |
|---|---|---|
| `artifact_kind` | text | `apk`, `ipa`, or `store_link`; constrained by application validation |
| `artifact_download_url` | text | HTTPS URL; required for a released policy |
| `artifact_sha256` | text nullable | Required for directly verified APK/IPA artifacts; lowercase 64 hex |
| `artifact_size_bytes` | integer nullable | Required for directly verified APK/IPA artifacts |
| `source_revision` | text nullable | Full accepted Git SHA when registered by CI |
| `distribution_channel` | text | `website`, `sidestore`, or future explicit value |

Migration rules:

- backfill neutral Android fields from `apk_*` columns;
- keep legacy `apk*` response fields during one compatibility window;
- new clients consume `artifact*` fields and platform-specific `updateAction` values;
- remove legacy columns only through a later separately reviewed contract change after all consumers migrate.

Decision envelope:

```text
platform
latestVersionCode
minSupportedVersionCode
latestNativeVersion
artifactKind
artifactDownloadUrl
artifactSha256
artifactSizeBytes
sourceRevision
distributionChannel
updateAction = none | binary_optional | binary_forced
releaseNotes
```

Android legacy aliases remain populated from the same record during compatibility. iOS no longer receives a synthesized no-op; it reads the latest iOS policy.

### 7.2 Device registration

Add a dedicated `notification_devices` table rather than storing tokens on users:

| Field | Rule |
|---|---|
| `id` | UUID primary key |
| `user_id` | required FK; cascade or explicit cleanup consistent with account lifecycle |
| `installation_id` | client-generated opaque stable ID; unique per user installation scope |
| `platform` | `android` or `ios` |
| `provider` | initially `expo` |
| `push_token_ciphertext` | encrypted at rest or protected through the repository's accepted secret-data mechanism |
| `token_fingerprint` | non-secret hash for dedupe/diagnostics; never sufficient to send |
| `app_version` / `build_number` | last reported client identity |
| `notifications_enabled` | current client opt-in state |
| `last_seen_at` | rotation/cleanup signal |
| `disabled_at` / `disable_reason` | invalid, logout, permission denied, account action, or user revoke |
| timestamps | created/updated lifecycle |

Constraints and indexes:

- unique `(user_id, installation_id)`;
- lookup by active user installations;
- token collision handling transfers no ownership silently;
- raw tokens are absent from normal logs, audit messages, metrics, and API responses.

Authenticated API:

- `PUT /api/notifications/devices/:installationId` — idempotent upsert for the current user.
- `DELETE /api/notifications/devices/:installationId` — disable the current user's installation.
- no admin endpoint exposes raw tokens.

Registration input includes platform, provider, token, permission state, app version, and build. The backend derives `user_id` from the session, never from the body.

### 7.3 Push dispatch contract

- Enqueue by durable notification ID only after the notification row transaction commits.
- One job can fan out to all currently active installations owned by the notification recipient.
- Use deterministic job IDs to avoid duplicate sends during retries.
- Treat `DeviceNotRegistered`/invalid-token receipts as a disable signal.
- Retry transient provider/network failures with bounded exponential backoff; do not retry permanent payload or authorization failures indefinitely.
- A disabled push sender leaves inbox/socket/polling intact.
- Push payload includes a notification ID and allowlisted route descriptor; the app fetches current authorized state.

### 7.4 Aggregate mobile read models

Add a backend-owned `mobile-workspace` module with read-only endpoints:

- `GET /api/mobile-workspace/student/overview`
- `GET /api/mobile-workspace/teacher/overview`
- `GET /api/mobile-workspace/calendar?from=&to=`
- `GET /api/mobile-workspace/teacher/library-index?cursor=&limit=` only if profiling confirms the existing library module fan-out cannot be covered by the teacher overview response

Response rules:

- explicit schema version;
- server-enforced role and ownership;
- bounded lists with cursors or hard documented limits;
- separate `sections` statuses so one optional subsection can fail without turning valid data into an empty list;
- stable IDs and timestamps suitable for cache invalidation;
- no hidden write side effects;
- ordinary focused endpoints remain canonical for detail and mutations.

The implementation must derive exact fields from current screen use and capability tests. It must not mirror entire backend entities by convenience.

### 7.5 Read-only offline snapshot

Persist only a reviewed allowlist:

- class IDs and display names;
- bounded current schedule summaries;
- bounded released lesson titles/status metadata;
- bounded notification list metadata already visible to the user.

Exclude grades, assessment answers, report details, auth/refresh tokens, authoring drafts, private attachments, submitted work payloads, and lifecycle/admin data.

Rules:

- storage key includes authenticated user ID and response schema version;
- maximum age is 24 hours, with a visible last-synced timestamp and offline label;
- logout, account switch, profile reset, or auth invalidation purges the user's snapshot;
- offline views disable official mutations and explain that reconnection is required;
- live success replaces the snapshot atomically; corrupt/old data is discarded;
- one runtime kill switch can disable reads from persisted snapshots without deleting live query behavior.

### 7.6 Version/build identity

- Android `versionCode` and iOS `buildNumber` both advance monotonically through the release script.
- They may share one mobile build sequence to prevent iOS remaining at build `3` while source versions advance.
- `expo.version`, native Android version name, generated iOS marketing version, artifact metadata, and backend registration must agree.
- Release verification fails on divergence.

## 8. Ownership and likely file impact

Exact filenames may narrow during test-driven implementation, but ownership must remain within these boundaries.

### Backend

- Modify `backend/src/drizzle/schema/app-version.schema.ts` and schema exports.
- Add the next ordered Drizzle migration for neutral artifact fields and notification devices; do not guess or reuse a migration number.
- Modify `backend/src/modules/app-version/**` DTOs, service, controller tests, HTTP tests, and Swagger descriptions.
- Modify `backend/src/drizzle/schema/announcements-notifications.schema.ts` or add a focused notification-device schema according to the repository's schema grouping convention.
- Modify `backend/src/modules/notifications/notifications.module.ts`, service tests, and central post-persist dispatch seam.
- Add authenticated device DTO/controller/service tests and a provider-neutral push adapter.
- Add a BullMQ processor/dispatch service for push delivery and receipt cleanup, reusing existing queue ownership where safe.
- Add `backend/src/modules/mobile-workspace/**` read-only controllers/services/DTOs/specs and register the module.
- Add privacy-safe configuration validation for push credentials and server sending flag.

### Mobile shared/native

- Modify `mobile/app.json`, Android native manifests/resources, `mobile/android/app/build.gradle`, and release verification scripts/tests.
- Add production signing property resolution that reads secrets outside the repository and fails closed for release builds.
- Modify `mobile/src/services/update/**`, `mobile/src/providers/UpdateProvider.tsx`, tests, and user-facing update surfaces for neutral platform actions.
- Add device registration API/types and a lifecycle hook/provider using the existing Expo project ID.
- Modify `mobile/src/providers/LiveNotificationProvider.tsx` only at the integration seam; preserve current inbox/socket/poll behavior.
- Add `mobile/src/navigation/linking.ts` and a shared allowed-destination resolver; connect it to `NavigationContainer`.
- Add role-scoped workspace API/query adapters and replace only overview-level fan-out consumers.
- Add offline snapshot storage, filtering, purge, and connectivity presentation.
- Modify release scripts so Android and iOS build identities advance and verify together.

### Governance and design

- Replace or refactor `mobile/src/navigation/admin-parity-manifest.ts` without deleting useful historical findings.
- Extend student and teacher route manifests into one evidence-bearing capability index, or generate a normalized registry from role-specific files.
- Add a design-migration registry keyed by reachable role and route.
- Modify route tests so every reachable route appears exactly once and dormant files never count.
- Migrate the student deep-screen family: `AssessmentHistoryScreen.tsx`, `AssessmentResultsScreen.tsx`, `TranscriptScreen.tsx`, `CalendarScreen.tsx`, and `ProfileScreen.tsx`.
- Migrate the teacher root family: `TeacherHomeScreen.tsx`, `TeacherClassesScreen.tsx`, `TeacherSectionsScreen.tsx`, `TeacherAssessmentsScreen.tsx`, `TeacherCalendarScreen.tsx`, and `TeacherProfileScreen.tsx`.
- Remove unreachable legacy branches from `DashboardScreen.tsx`, `LessonsScreen.tsx`, `AssessmentsScreen.tsx`, and `AnnouncementsScreen.tsx` after behavior tests are locked.
- Reconcile and then remove unused `LxpScreen.tsx`, `AiTutorScreen.tsx`, `TeacherUnsupportedScreen.tsx`, `ProgressScreen.tsx`, `RoleWorkspaceScreen.tsx`, and placeholder factories if the reference gate remains zero.

### CI and release

- Modify existing mobile release verification and `.github/workflows/build-mobile-ios-sidestore.yml`.
- Extend `.github/scripts/register-mobile-release.cjs` and its tests to platform-neutral artifacts while preserving verified Android behavior.
- Modify the existing CI/deploy workflows only at established release gates; do not create a parallel unverified publishing path.
- Record signer fingerprint, source revision, artifact size/hash, policy response, and physical acceptance separately.

## 9. Implementation phases and tasks

### Phase 0 — freeze evidence and write failing gates

Goal: prevent the remediation itself from manufacturing false parity or silently changing accepted behavior.

- [ ] Re-run focused baseline typecheck/tests and capture exact starting SHA/status.
- [ ] Convert audit findings into stable test fixtures; do not copy stale line numbers as assertions.
- [ ] Add capability-registry completeness and uniqueness tests for every currently reachable student, teacher, and administrator route.
- [ ] Add design-registry completeness and uniqueness tests.
- [ ] Add a rule that `accepted` requires named source evidence plus the configured runtime/device evidence; otherwise use `migrated` or `partial`.
- [ ] Add release tests that reject debug signer metadata, non-monotonic iOS build numbers, and platform/version divergence.
- [ ] Preserve a record of current debug signer fingerprint so migration messaging can identify legacy installs without treating it as a secret.

Exit gate: tests fail for the known governance/release gaps and pass for preserved behavior.

### Phase 1 — governance truth and dependency remediation

Goal: make tracking honest and remove the most direct bundled dependency risk before broad native work.

- [ ] Replace the mechanical admin `aligned` mapping with explicit per-capability statuses and evidence references.
- [ ] Correct the teacher landing mapping (`Home` versus `Classes`) from actual navigation ownership.
- [ ] Add request fields, response fields, nullability, pagination, authorization, mutation order, error states, source tests, and runtime proof fields to consequential capabilities.
- [ ] Populate student/teacher/admin entries from current evidence; preserve unknowns as unknowns.
- [ ] Add the route-level design ledger; do not mark visually unreviewed screens accepted.
- [ ] Upgrade the directly bundled Tiptap family to the compatible fixed line identified during implementation.
- [ ] Rebuild `mobile/src/generated/assessment-rich-text.ts` using the repository's existing generation path.
- [ ] Test create/edit/render of existing stored rich text, images, links, lists, tables, and malformed input in the WebView.
- [ ] Re-run production dependency audit and classify remaining paths as runtime, generated-bundle, native, or build/dev only.

Exit gate: route/design status is truthful; direct Tiptap advisory is remediated without rich-text regression; remaining audit counts are qualified by reachability.

### Phase 2 — Android release trust and native hardening

Goal: produce a durable Android release identity and a least-privilege artifact.

- [ ] Add release-only signing properties for keystore path, store password, alias, and key password from local/CI secret injection.
- [ ] Make `assembleRelease` fail before packaging if any production signing input is missing or if the resolved certificate matches the Android debug certificate.
- [ ] Keep debug builds explicitly debug-signed; never allow the backend public policy to point at a debug artifact.
- [ ] Record the production signer certificate fingerprint in protected release evidence, not the keystore or passwords.
- [ ] Set release cleartext traffic to false; preserve local HTTP only in an explicit debug manifest/build path when development needs it.
- [ ] Disable broad app backup or add explicit data-extraction exclusions; default to `allowBackup=false` because the app holds school/session data.
- [ ] Remove duplicate permissions and each unneeded special/legacy permission after feature-specific checks. `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, and old external-storage permissions require removal unless a reachable feature proves need.
- [ ] Retain `REQUEST_INSTALL_PACKAGES` only for the internal APK updater; retain camera/media/notification permissions only where current flows prove them.
- [ ] Make binary-only update policy explicit: remove misleading OTA URL/runtime/native enablement from the release path and remove or bypass unreachable Expo OTA behavior cleanly.
- [ ] Inspect the merged release manifest and packaged APK, not only `app.json`.
- [ ] Build two sequential production-signed candidates and prove same-signer upgrade on a physical Android device.

Legacy debug-install migration:

- [ ] Detect/document that debug-signed installs cannot update over the production key.
- [ ] Before uninstall, verify server-owned work is synced and warn about any device-local drafts/snapshots.
- [ ] For the bounded tester population, perform a one-time uninstall and production-signed reinstall.
- [ ] If the real installed population is larger than bounded testers, stop and review whether one final debug-signed bridge notice is needed; do not publish a mixed-signature policy.

Exit gate: production artifact is correctly signed/hardened, public policy points to it, and one physical device upgrades across two production-signed versions.

### Phase 3 — platform-neutral release policy and current iOS acceptance

Goal: stop iPhone clients from silently remaining on old shared source.

- [ ] Test-drive the additive release schema/DTO/response change and Android compatibility aliases.
- [ ] Migrate/backfill existing Android release rows without changing the current verified admission decisions.
- [ ] Implement real iOS policy lookup and `none`/optional/forced decisions using iOS build numbers.
- [ ] Update mobile release scripts so iOS `buildNumber` advances monotonically and is verified against artifact metadata.
- [ ] Add iOS stale-version UI that opens the controlled SideStore release/help path; it must not invoke Android installer APIs.
- [ ] Extend release registration to verify and register immutable IPA size/hash/source SHA before advancing the rolling alias.
- [ ] Add workflow tests proving the published metadata comes from the checked-out SHA and the archive's actual `Info.plist`.
- [ ] Build and publish a current exact-SHA unsigned IPA through the existing manual/tag workflow.
- [ ] Preserve the prior immutable IPA/hash even when the rolling prerelease moves.
- [ ] On a physical iPhone, apply the SideStore personal signature and test login/refresh, role navigation, notification inbox/taps, scored exemptions, guided workbench, teacher lesson authoring, upload/picker flows, and stale-version behavior.

Exit gate: source and current published IPA match; backend iOS admission is real; physical-iPhone proof is recorded separately from unsigned archive proof. If no iPhone/signing access is available, status remains `migrated`, not `accepted`.

### Phase 4 — backend push lifecycle and safe deep links

Goal: add reliable server-originated delivery without weakening notification authority.

#### Backend first

- [ ] Add failing schema/service/controller tests for idempotent per-user installation upsert, rotation, revocation, multi-device ownership, account isolation, and no raw token responses.
- [ ] Add encryption/protection and fingerprint handling for stored tokens.
- [ ] Add post-commit dispatch jobs from the central notification creation paths, including bulk/deduplicated creators.
- [ ] Add a provider adapter for Expo Push Service, payload minimization, transient retry, receipt lookup, and invalid-token disable.
- [ ] Add a server-side send kill switch and privacy-safe metrics.
- [ ] Prove a push failure never rolls back or deletes the durable inbox notification.

#### Mobile registration

- [ ] Add failing tests for permission granted/denied, token rotation, registration retry, logout/account switch, reinstall/new installation ID, and unsupported simulator behavior.
- [ ] Obtain the Expo token using the configured project ID on a supported physical build.
- [ ] Generate/store a per-installation opaque ID, refresh the token on launches/permission changes, and idempotently upsert it for the authenticated user.
- [ ] Best-effort revoke on logout before clearing local auth, while backend invalid-token/account lifecycle cleanup remains authoritative.
- [ ] Do not log or expose the token in analytics, UI, error reporting, or tests.

#### Deep links

- [ ] Add an allowlisted URL parser and route descriptor shared with `mobile-notification-routing`.
- [ ] Pass a typed `linking` configuration to `NavigationContainer` for the existing custom scheme.
- [ ] Support cold start, warm app, restored auth, deferred navigation after activation/login, and stale/deleted destinations.
- [ ] Reject role-inappropriate or unknown destinations and fall back to inbox/home with a clear message.
- [ ] Keep universal links/Associated Domains out of acceptance until a verified domain and Apple entitlement are approved.

Physical acceptance matrix:

| State | Android | iPhone SideStore |
|---|---|---|
| Foreground push | required | source + physical attempt |
| Background push | required | external APNs/signing gate may block |
| Terminated push | required | external APNs/signing gate may block |
| Permission denied/re-enabled | required | required where signing permits |
| Token rotation | required | required where signing permits |
| Multi-device same user | required if two devices available | best available evidence |
| Logout/account switch | required | required |
| Notification/deep-link authorization | required | required |

Exit gate: Android background/terminated push and safe routing pass physically. iOS remains explicitly unaccepted if free-signing/APNs capability prevents delivery; inbox/socket/poll behavior remains available.

### Phase 5 — bounded mobile data contracts and intentional offline reading

Goal: remove systemic request bursts and make limited offline behavior honest.

- [ ] Capture baseline request counts/timings for representative student and teacher accounts, including high-class-count fixtures.
- [ ] Derive exact aggregate response fields from mounted overview consumers; do not copy whole entities.
- [ ] Add backend authorization, pagination/limits, query-count, and partial-section tests before endpoint implementation.
- [ ] Implement student overview, teacher overview, and calendar read models with bounded database access.
- [ ] Add mobile adapters behind one feature switch/fallback seam; preserve detail and mutation services.
- [ ] Replace fan-out in `CoursesScreen`, teacher Home, student/teacher Calendar, and the active Lessons compatibility path where still reachable.
- [ ] Add teacher library index only if measurement shows the overview contract cannot safely own the required module index.
- [ ] Bound or remove fallback concurrency; never recreate `Promise.all` across all classes as the default path.
- [ ] Add an offline snapshot serializer that only accepts the approved low-sensitivity allowlist.
- [ ] Add per-user/schema storage keys, 24-hour expiry, last-sync label, corrupt-data rejection, and logout/account-switch purge.
- [ ] Disable all official mutations while rendering offline snapshots and direct users to reconnect.

Budgets to prove:

- overview request count is constant with class count from the mobile client's perspective;
- backend query count is bounded and profiled for representative high-class-count fixtures;
- initial payloads remain bounded/paginated;
- optional section failure is visible and does not impersonate a valid empty list;
- fallback can be disabled after observation without app reinstall.

Exit gate: aggregate path is live and observed; request counts no longer scale by multiple calls per class; airplane-mode snapshots are narrow, stale-labeled, user-scoped, and read-only.

### Phase 6 — active design migration and dead-generation removal

Goal: finish the mixed design generation without changing academic behavior.

Order of work:

1. student assessment history/results as one family;
2. student transcript/calendar/profile as one family;
3. teacher Home/classes/sections as one family;
4. teacher assessments/calendar/profile as one family;
5. unreachable branch and dormant-file deletion.

For each family:

- [ ] Record current mounted component, behavior invariants, navigation targets, loading/empty/error states, accessibility labels, and screenshots before changes.
- [ ] Write focused interaction/layout tests that preserve real actions rather than snapshotting decorative markup.
- [ ] Compose current route-specific workspace primitives; keep GABHS red/white/navy and avoid generic dashboard/card inflation.
- [ ] Preserve backend calls, mutation order, confirmations, pagination, role guards, and notification routes unless a separate failing contract test requires change.
- [ ] Test small Android, large Android, iPhone, large text, keyboard, screen reader labels, reduced motion, back/drawer behavior, empty/loading/error/partial states.
- [ ] Mark the route `migrated` after source verification and `accepted` only after required visual/device evidence.

Cleanup gate:

- [ ] Remove constant-theme legacy trees from the four active wrappers after mounted-view tests pass.
- [ ] Reconcile old administrator direct-entry aliases and saved/notification links before deleting aliases.
- [ ] Prove zero production imports/navigation references for dormant screens and placeholder factories.
- [ ] Remove dormant tests/assets only when they have no active behavioral ownership.
- [ ] Re-run registry completeness so deleted files cannot remain counted as routes.

Exit gate: every reachable route has truthful design status; targeted active families use the current design generation; dead branches/files no longer distort scans.

### Phase 7 — integrated verification, package, ship, and observe

Goal: release only the exact verified revision and preserve a reversible path.

- [ ] Run focused tests after each phase, then full backend/mobile suites, lint/typecheck, Expo dependency check, release verification, production dependency audit, and relevant workflow-script tests.
- [ ] Run backend migration forward and rollback validation against a disposable database; verify backfill and compatibility aliases.
- [ ] Build the production-signed Android APK from a clean dependency state; record SHA-256, size, ABI, version, build, source SHA, signer fingerprint, and merged manifest.
- [ ] Publish/register only after public bytes match the verified artifact and backend/frontend health checks pass.
- [ ] Assert old/current Android and iOS admission responses after registration.
- [ ] Trigger the SideStore workflow from the exact accepted SHA and record the immutable archive plus rolling alias.
- [ ] Complete the physical Android/iPhone acceptance matrices; distinguish missing-device proof from a source pass.
- [ ] Observe push receipts/errors, invalid-token rate, aggregate endpoint latency/error rate, update-policy failures, and client fallback use for the defined observation window.
- [ ] Remove temporary fallbacks only after the observed release is stable; otherwise use the rollback controls below.

Commit/release structure should remain reviewable:

1. governance/dependency;
2. Android trust/native hardening;
3. release contract/iOS admission;
4. push/deep links;
5. aggregate/offline;
6. design/cleanup;
7. version/package/release evidence.

Do not mix generated artifacts, migrations, broad design churn, and unrelated user changes into one opaque commit.

## 10. Verification matrix

### Automated

| Area | Required checks |
|---|---|
| Release schema | DTO validation, backfill, monotonicity, Android compatibility, iOS decisions, unavailable policy |
| Android native | signing fail-closed, non-debug certificate, merged manifest, permissions, HTTPS, backup, APK hash/size, same-signer update |
| iOS workflow | monotonic build, archive metadata, source SHA, hash/size, neutral registration, stale-client decision |
| Push devices | auth scope, idempotent upsert, rotation, revoke, account isolation, encryption/log redaction |
| Push dispatch | post-commit only, dedupe, retry, receipt cleanup, disabled sender, inbox survival |
| Linking | cold/warm/deferred auth, role allowlist, malformed URL, stale target, notification parity |
| Aggregates | RBAC, bounded queries/results, pagination, partial status, response schemas, old endpoint preservation |
| Offline | allowlist, per-user key, expiry, purge, corrupt data, no mutations |
| Governance | all reachable routes exactly once, explicit capability evidence, no dormant files, no mechanical acceptance |
| Design | focused interactions, loading/empty/error/partial, accessibility, navigation, preserved mutations |
| Rich text | generated asset, existing content, create/edit/render, links/images/lists/tables, hostile input handling |

### Runtime and physical

| Evidence | Android | iOS |
|---|---|---|
| Clean install | required | required after personal signing |
| Upgrade from previous production signer | required | SideStore reinstall/refresh behavior recorded |
| Legacy debug migration | required once for existing testers | not applicable |
| Login/activation/refresh/logout | required | required |
| Student/teacher/admin core navigation | required | required |
| Push foreground/background/terminated | required | gated by APNs-capable signing on iOS |
| Deep link cold/warm/deferred auth | required | required for custom scheme |
| Aggregate high-class-count account | required | required where fixture/account available |
| Offline snapshot/account purge | required | required |
| Visual/accessibility matrix | small + large Android | representative iPhone |
| Current exact-SHA artifact | required | required |

### Completion language

- `implemented`: source and automated tests complete.
- `deployed`: exact SHA is live in the relevant backend/frontend/release channel.
- `artifact verified`: archive/APK bytes, identity, and metadata match.
- `device verified`: named physical-device scenario passed.
- `accepted`: every required category for that capability passed or an explicitly agreed external gate was removed from scope.

These terms must not be collapsed into “done.”

## 11. Rollout and rollback

### Rollout order

1. deploy backward-compatible backend schema and response aliases;
2. deploy backend logic with push sending off and aggregate endpoints dark;
3. publish production-signed Android/internal iOS candidates;
4. enable aggregate reads for test accounts, then normal users after metrics are healthy;
5. enable Android push for test installations, then normal users;
6. publish design families in bounded releases or commits after behavioral acceptance;
7. remove compatibility/fallback paths only in a later cleanup after observation.

### Rollback controls

- **Signing:** never revert the production key. Roll back by publishing a higher build signed with the same key.
- **Release policy:** retain immutable prior artifact metadata; policy can point users to a higher corrective build, never a lower version-code regression.
- **Push:** server send flag off; inbox/socket/polling continue. Disable bad tokens individually.
- **Deep links:** restrict the allowlist or route to inbox/home; do not accept arbitrary navigation as a workaround.
- **Aggregates:** switch the client adapter to bounded legacy reads while keeping new backend endpoints harmless.
- **Offline:** disable snapshot reads and purge corrupt/versioned stores without affecting live queries.
- **Design:** restore the previous route-level component in a forward corrective commit; do not retain permanent dual render trees.
- **Schema:** additive columns and compatibility aliases permit application rollback; destructive column removal is not part of this milestone.

## 12. Observability and privacy

Collect privacy-safe operational signals:

- release checks by platform/build/action/error code;
- artifact registration success and source-revision mismatch;
- Android signer fingerprint in release evidence, not per-user telemetry;
- active installation counts by platform/app build without raw tokens;
- push jobs attempted/succeeded/transient failed/permanent failed/invalid token;
- aggregate endpoint latency, query count, payload size, partial-section rate, and fallback use;
- offline snapshot read/expired/corrupt/purged counts without content;
- deep-link accepted/rejected route kind without academic identifiers;
- design registry acceptance coverage by role/route.

Never log raw device tokens, auth tokens, message bodies, grades, answers, report contents, private file names, or full deep-link query strings.

## 13. External prerequisites and stop conditions

### Needed before the corresponding release proof

- a protected Android production keystore and credentials plus an approved custody/backup owner;
- a known physical Android device with a legacy debug install and another clean/same-signer upgrade path;
- Expo/FCM push credentials for the Android release project;
- Railway/backend secret configuration for push sending and existing release registration;
- access to the existing GitHub macOS SideStore workflow and a physical iPhone with SideStore for acceptance;
- APNs-capable signing credentials only if iOS background/terminated push is promoted from external gate to required scope;
- representative student, teacher, and administrator accounts, including at least one high-class-count fixture/account;
- explicit confirmation before any test creates durable production academic data. Prefer seeded/local/staging or read-only live acceptance.

### Stop rather than weaken safeguards

- production signing inputs missing or certificate unexpectedly changes;
- public artifact bytes differ from verified bytes;
- release policy cannot be read or is internally inconsistent;
- push requires exposing raw tokens or bypassing authenticated user ownership;
- aggregate endpoints change official academic calculations or mutation authority;
- offline work would require persisting prohibited sensitive content or enabling writes;
- a design migration requires changing an established academic procedure without separate review;
- physical proof is unavailable: report it as unavailable, never infer it from CI.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Debug-signed installs cannot upgrade to production signer | One-time bounded uninstall/reinstall with sync/draft warning; never mix signing identities in policy |
| Push duplicates existing socket/local notifications | Deterministic notification/job IDs, foreground presentation rules, inbox row as source of truth |
| Push token leakage | Encrypt/protect storage, fingerprint for diagnostics, redact logs/responses, authenticated ownership only |
| Free SideStore signing cannot prove APNs | Keep iOS push acceptance explicitly gated; do not overclaim; preserve inbox/socket behavior |
| Aggregate response becomes another giant contract | Only fields consumed by overview tasks, bounded lists, explicit schema version, focused detail endpoints retained |
| Offline snapshot leaks school data on shared devices | Narrow low-sensitivity allowlist, per-user keys, visible staleness, logout/account purge, no grades/answers/files |
| Registry becomes another stale document | Typed source registry plus route completeness/evidence tests; docs summarize rather than decide |
| Design cleanup removes a saved/notification route | Reconcile route aliases, saved paths, and notification resolver before removal |
| Dependency upgrade changes stored rich-text rendering | Regenerate asset and test old/new content before release |
| Large remediation hides regressions | Phase/commit boundaries, failing tests first, per-phase exit gates, staged rollout flags |

## 15. Assumptions and uncertainty

### Confirmed inputs

- The evidence audit is tied to revision `0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9` and its recorded source/test/artifact checks.
- Current Android size/SHA verification, update admission, bounded policy refresh, and deploy registration exist and must be extended rather than replaced.
- Current iOS distribution is an unsigned workflow archive signed by SideStore with a personal certificate, not a durable App Store/TestFlight channel.
- Current notification delivery has durable inbox rows, socket/polling, and local presentation but no device-token/server-push leg.
- The listed request fan-out and mixed design generations exist in current source.

### Planning assumptions that must be revalidated at implementation start

- The school still wants internal website APK distribution and free SideStore acceptance rather than store launch.
- The configured Expo project remains the intended push project and its Android FCM credentials can be supplied.
- Existing installed debug-signed APKs are limited enough for a controlled one-time migration. If installation count is materially larger, the migration plan requires a new decision.
- Representative non-production or safely read-only accounts can cover student, teacher, administrator, and high-class-count acceptance.
- The direct Tiptap fixed version remains compatible with the installed Expo/React Native toolchain when implementation begins.

### Unknown until implementation/runtime proof

- The visual severity of each candidate route on the actual target Android/iPhone sizes.
- Whether the free SideStore-signed build can obtain a usable Expo/APNs token in the current Apple setup.
- Exact aggregate response/query budgets until current screen fields and database plans are measured.
- Whether any apparently unused Android permission is introduced by a required native dependency rather than app source.
- Whether dormant aliases/screens are referenced by external saved links or old notifications outside the static repository.

Unknowns stay visible as `partial`, `migrated`, or blocked acceptance evidence; they are not converted into facts to make the checklist green.

## 16. Definition of complete

This program is complete only when:

- [ ] every F-01 through F-09 and D-01 through D-04 row is `accepted`, or its external prerequisite is explicitly recorded as an agreed out-of-scope gate;
- [ ] Android uses a protected non-debug signer and the same-signer physical upgrade passes;
- [ ] release APK manifest/permissions/backup/network policy match the declared policy;
- [ ] a current exact-SHA IPA is published and physically checked through SideStore;
- [ ] iOS and Android both receive real backend version admission decisions;
- [ ] Android background/terminated push passes and iOS status is stated exactly;
- [ ] external/notification routes share one allowlisted resolver;
- [ ] high-traffic overview requests no longer scale by multiple calls per class;
- [ ] offline data is narrow, stale-labeled, user-scoped, purgeable, and read-only;
- [ ] Tiptap direct advisory is remediated and its generated editor is compatible;
- [ ] capability/design registries cover every reachable route without mechanical acceptance;
- [ ] targeted student/teacher route families are visually and behaviorally accepted;
- [ ] unreachable legacy branches and proven-dormant screens are removed;
- [ ] full test, migration, package, CI, deployment, artifact, and physical evidence is summarized by exact SHA;
- [ ] rollback controls remain available through the observation window.

## 17. Immediate implementation sequence after approval

1. Lock Phase 0 failing gates and registries.
2. Complete Phase 1 dependency/governance work.
3. Prepare signing/native changes, stopping only for the protected keystore prerequisite.
4. Implement release schema/iOS admission and publish a current candidate.
5. Implement push/deep links, then aggregate/offline contracts.
6. Migrate design families and remove dead generations.
7. Run the full release ladder, commit in reviewable units, push `developement`, observe CI/deployment, and record artifact/device proof.

Implementation must follow the test-first and evidence-first order above. The existing audit report remains the evidence baseline; this plan is the single implementation source of truth.
