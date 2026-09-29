# iOS TestFlight Logout and Announcement Composer Hotfix Plan

Date: 2026-09-29
Status: reviewed and authorized for execution through `$finish-and-ship`
Canonical analysis: `docs/feature-analysis/2026-09-29-ios-testflight-logout-announcement-composer-hotfix-analysis.md`
Starting revision: `28728fb2a9d16ca4d5828aec31e1c30c66efe55e` on `developement` tracking `origin/developement` at `0 0` divergence

## 1. Decision summary and feature brief

Implement one bounded shared-mobile hotfix that makes logout visibly immediate and reliable on iOS, removes drawer modal stacking, and raises both writable announcement-composer variants into keyboard- and safe-area-aware focused layouts.

Recommended design:

1. Use the native platform `Alert` only for the role-drawer logout confirmation so the existing drawer `Modal` never opens the branded `AppAlert` `Modal` on top of itself.
2. In `AuthProvider`, synchronously transition rendered auth state to signed out, capture the current access/refresh credentials for best-effort remote cleanup, clear local credentials/session state immediately, and run push-installation plus backend refresh-token revocation without delaying navigation.
3. Center the shared teacher announcement editor in a `KeyboardAvoidingView` with top/bottom safe-area padding.
4. Move the admin announcement editor into its own focused `AdminScreen` state instead of inserting it below feed filters inside a paginated list header.

This preserves backend ownership of refresh-token revocation, maintenance-session shutdown, audit, announcement mutations, and role authorization.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Student, teacher, and admin drawer logout, because all consume the same `RoleDrawerProvider` and `AuthProvider.logout`.
- Direct profile logout for all roles and incomplete-profile logout, because they consume the same provider method.
- Push-device revocation, secure local credential/session cleanup, server refresh-token revocation, and rendered navigator transition.
- Teacher announcement create/edit from the announcement workspace and class-detail workspace.
- Admin announcement create/edit from the cross-class announcement workspace.
- Regression tests, mobile typecheck/full Jest, TestFlight/SideStore configuration tests, shared-source Android APK packaging, scoped commit/push, exact-SHA CI/deployment observation, artifact verification, and TestFlight delivery when configured credentials permit it.

### Non-goals

- No backend endpoint, DTO, response-envelope, schema, migration, RBAC, audit-policy, or announcement-content contract change.
- No global replacement of `AppAlert` or redesign of unrelated modal consumers.
- No web or AI-service UI work.
- No unrelated query-cache refactor; cache scoping remains a separately reviewable improvement.
- No claim of physical-iPhone acceptance without a tester completing the specified device checks.

### Permissions and workspace constraints

- The explicit `$finish-and-ship` request authorizes implementation, tests, required shared-mobile packaging, scoped commit, push, and configured deployment triggered by that push.
- Preserve the pre-existing user change in `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md`; never stage it.
- Include the canonical 2026-09-29 isolation report and this plan in the scoped release commit.
- Stay in the current checkout/branch and do not create a worktree.

### Assumptions

- The exact installed TestFlight build/SHA is unverified. Current source is authoritative for implementation; final iPhone acceptance must record the installed build.
- “Announcement composer” is role-ambiguous. Both current writable variants have confirmed placement defects, so both are fixed without changing their contracts.
- Server and push revocation are best-effort cleanup after a user has confirmed logout; local access must end immediately even when the network is slow or unavailable.

## 3. Current-state evidence ledger

| ID | Status | Evidence | Consequence |
|---|---|---|---|
| E1 | Confirmed | `mobile/src/components/navigation/RoleNavigationDrawer.tsx:133-153,205-211` and `mobile/src/components/ui/AppAlert.tsx:64-103` | Drawer logout currently attempts a second React Native `Modal`. |
| E2 | Confirmed | `AppAlert.tsx:19-31`; `RoleNavigationDrawer.test.tsx:301-353` | Test mode delegates to mocked native `Alert`, so the existing test cannot expose production modal stacking. |
| E3 | Confirmed | `mobile/src/providers/AuthProvider.tsx:156-168` | Rendered session/local cleanup occur after sequential remote cleanup. |
| E4 | Confirmed | `mobile/src/api/client.ts:66-69,102-106`; `push-registration.runtime.ts:60-66`; `auth.ts:41-47` | Two 30-second remote paths can precede the local transition. |
| E5 | Confirmed | `backend/src/modules/auth/auth.controller.ts:266-280`; `auth.service.ts:243-265`; `token.service.ts:295-304` | The backend contract revokes maintenance access and refresh token and writes best-effort audit. It must stay unchanged. |
| E6 | Confirmed | `TeacherAnnouncementEditorModal.tsx:73-86,287-325` | Teacher composer is bottom-anchored with fixed bottom padding and no outer keyboard/safe-area contract. |
| E7 | Confirmed | `TeacherAnnouncementsScreen.tsx:206-220`; `TeacherClassDetailScreen.tsx:748` | One shared teacher owner fixes two consumers. |
| E8 | Confirmed | `AdminAnnouncementsScreen.tsx:164-285`; `AdminPaginatedList.tsx:96-134` | Admin composer is inserted after filters in the list header with no focused reveal. |
| E9 | Confirmed | Focused baseline: 3 suites and 20 tests passed on 2026-09-29 | Current logic tests are green but do not cover native iOS geometry/presentation. |
| E10 | Unverified | No physical TestFlight session/build identity was available | Device acceptance remains a release boundary. |

## 4. End-to-end impact and consumer map

```text
drawer/profile press
  -> RoleNavigationDrawer confirmation (drawer only)
  -> AuthProvider.logout
       -> immediate React session=null -> AppNavigator auth route
       -> local in-memory + SecureStore + AsyncStorage cleanup
       -> session snapshot/offline user/editor recovery cleanup
       -> captured access token -> notification installation revocation
       -> captured refresh token -> POST /api/auth/mobile/logout
            -> maintenance access revoke
            -> refresh-token revoke
            -> logout audit

teacher announcement page/class detail
  -> TeacherAnnouncementEditorModal
       -> unchanged class-scoped create/update mutation

admin announcement feed
  -> focused AdminScreen composer
       -> unchanged class-scoped create/update mutation
       -> return to/refetch feed
```

Direct consumers searched:

- Drawer logout wiring: student, teacher, admin, and compatibility role navigator paths in `AppNavigator.tsx`.
- Direct logout wiring: student, teacher, admin, and incomplete-profile screens.
- Teacher editor: announcement workspace and class-detail workspace.
- Admin editor: only `AdminAnnouncementsScreen`.
- Public server contract: only mobile `authApi.logout` calls `/auth/mobile/logout`; backend controller/service/token owners remain compatible.

## 5. Conflicts, invariants, risks, and design options

### Invariants

- Mobile continues to use bearer tokens plus secure storage; no web-cookie assumptions.
- Logout must revoke the server refresh token when reachable and must not weaken maintenance-session revocation or audit.
- Local logout must succeed even if push or backend cleanup fails.
- Announcement class selection, title/content, pinning, schedule, attachments, create/update payloads, refetch, and authorization stay intact.
- SideStore/default iOS identity and production TestFlight identity remain isolated by existing configuration.

### Options considered

1. **Patch offsets and close the drawer before opening branded alert.** Smallest diff, but dismissal/presentation timing remains native-platform-sensitive and fixed composer offsets do not handle keyboard/safe-area changes. Rejected.
2. **Local-first auth plus existing focused screen/dialog primitives.** Bounded ownership, preserves contracts, testable, and solves both perceived and persisted logout delay. Recommended.
3. **Global modal host and unified teacher/admin announcement editor.** Could remove broader duplication, but widens blast radius across many `AppAlert` consumers and mixes a hotfix with a product refactor. Rejected for this release.

### Principal risks and controls

- Remote cleanup loses credentials after local clearing: capture access/refresh tokens before cleanup and pass them explicitly to the remote calls.
- A remote failure becomes an unhandled logout rejection: aggregate remote cleanup with `Promise.allSettled`; local cleanup failures remain visible to tests.
- Admin edit opened from a scrolled row remains off-screen: replace the feed render with a focused `AdminScreen`, causing a fresh top-positioned scroll surface.
- Keyboard covers teacher actions: assert iOS `KeyboardAvoidingView` behavior and safe-area padding in tests, then verify on TestFlight.
- Shared mobile changes affect Android: run the complete mobile suite and package the repository Android release artifact.

## 6. Recommended architecture, data flow, security, and error behavior

### Logout

- `RoleNavigationDrawer` imports native React Native `Alert`; all other branded alerts remain unchanged.
- `AuthProvider.logout` captures `getAccessToken()` and `getRefreshToken()`, calls `setSession(null)` before awaiting anything, starts remote cleanup with captured credentials, and runs existing local cleanup immediately.
- `authApi.logout` accepts an optional captured refresh token and owns only the server request; provider owns local cleanup.
- `revokeCurrentPushInstallation` and `notificationsApi.revokeDevice` accept an optional captured access token and send it explicitly so clearing global/storage state cannot deauthorize the already-authorized cleanup.
- Remote cleanup is best effort and never restores the local session. Local cleanup errors are not silently converted to success.

### Composer

- Teacher: retain the current editor fields and action footer, but wrap the modal surface in an iOS-padding `KeyboardAvoidingView`, center the card, and use safe-area-derived top/bottom padding.
- Admin: when `showComposer` is true, render a dedicated `AdminScreen` with Close action and the existing editor section. When false, render the current paginated feed and filters. Save/reset returns to and refetches the feed.

### Error behavior

- Logout navigation changes immediately after confirmed intent, even offline.
- Push/backend failures do not re-authenticate the user or block local cleanup.
- Announcement save failures retain current alert copy and keep the composer state available for correction/retry.

## 7. Contract, schema, migration, and compatibility changes

- Backend HTTP contract: unchanged.
- Announcement API contract: unchanged.
- Database/schema/migrations: none.
- Internal TypeScript compatibility:
  - `authApi.logout(capturedRefreshToken?)` remains callable without an argument.
  - `revokeCurrentPushInstallation(capturedAccessToken?)` remains callable without an argument.
  - `notificationsApi.revokeDevice(installationId, capturedAccessToken?)` remains callable with its existing single argument.
- Existing Android and iOS clients remain server-compatible.

## 8. Ordered implementation phases and exact owners

1. **RED — logout modal and immediacy tests**
   - `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`
   - `mobile/src/providers/__tests__/auth-verification.test.tsx`
   - `mobile/src/api/__tests__/auth-api.test.ts`
   - Add production-mode native-alert and deferred-remote-cleanup assertions; run and record expected failures.
2. **GREEN — logout implementation**
   - `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
   - `mobile/src/providers/AuthProvider.tsx`
   - `mobile/src/api/services/auth.ts`
   - `mobile/src/services/notifications/push-registration.runtime.ts`
   - `mobile/src/api/services/notifications.ts`
3. **RED — composer layout/focus tests**
   - `mobile/src/screens/__tests__/announcement-editors.test.tsx`
   - Assert iOS keyboard/safe-area teacher layout and focused admin composer mode; record expected failures.
4. **GREEN — composer implementation**
   - `mobile/src/components/teacher/TeacherAnnouncementEditorModal.tsx`
   - `mobile/src/screens/AdminAnnouncementsScreen.tsx`
5. **Focused and full verification**
   - Focused Jest files, `npm run typecheck`, full `npm run test`, TestFlight/SideStore config tests, release tests, and diagnostics.
6. **Packaging and release**
   - Use current release tooling to prepare/build/verify the Android artifact and update its public manifest/artifact contract.
   - Run configured iOS TestFlight validation and, when current Expo/Apple credentials permit, submit the new production build. Missing credentials remain an explicit blocker to TestFlight delivery, not to the source/Android release evidence.
   - Stage only task-owned files; commit, fetch/review divergence/outgoing commits, push `developement`, observe exact-SHA CI/Railway, verify health plus public APK/manifest/update policy, and separately report physical-device evidence.

## 9. Verification matrix and acceptance criteria

| Requirement | Automated evidence | Runtime/release evidence | Acceptance |
|---|---|---|---|
| Drawer logout opens a usable confirmation | Production-mode drawer test calls native `Alert` and reaches `onLogout` | TestFlight iPhone drawer confirmation is visible/tappable | Confirm/cancel work; no hidden nested modal |
| Logout is visibly immediate | Deferred remote promises test shows `isAuthenticated === false` and local clear started before resolution | Drawer and profile return to auth screen immediately under throttled/offline network | No wait for remote timeout |
| Server/device cleanup is preserved | Captured-token API tests; existing backend controller/service tests remain unchanged/green | Refresh with revoked token fails after connectivity returns; old device installation stops receiving user push | Best-effort cleanup retains security intent |
| Teacher composer is raised and keyboard-safe | iOS KAV/safe-inset renderer assertions | TestFlight title/rich text/actions remain visible with keyboard/home indicator | Create/edit/cancel/publish work in both teacher consumers |
| Admin composer is focused | Renderer shows `AdminScreen` composer and no feed filters while composing | TestFlight Compose/Edit opens at top, Close/Save returns to feed | No below-fold discovery requirement |
| Shared mobile integrity | `npm run typecheck`; full `npm run test`; iOS delivery tests | Android artifact verification; TestFlight build/config evidence | No mobile regression claimed beyond evidence |
| Released revision | exact pushed SHA CI/deployment terminal success | live health; served APK bytes/hash/manifest/update policy | Release evidence matches final SHA/artifacts |

Required commands are discovered from current scripts immediately before execution. At minimum:

```text
mobile: focused Jest -> npm run typecheck -> npm run test
mobile: npm run test:ios-testflight -> npm run test:ios-sidestore -> npm run test:release
release: current release:prepare/build/release:verify flow with explicit API environment
repository: git diff --check and exact-SHA CI/deployment inspection
```

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

1. Land source/tests and versioned shared-mobile artifacts in one scoped branch history.
2. Push to `origin/developement`; correlate CI and Railway to the exact SHA.
3. Verify backend live/ready, public APK and manifest byte/hash equality, and current/previous Android update decisions.
4. Verify TestFlight build submission/processing separately. A Git push or Android APK does not prove TestFlight delivery.
5. Record tester acceptance for role, installed build, drawer/profile logout, offline/slow network, teacher/admin composer, keyboard, and home indicator.

### Rollback

- Source rollback is one scoped revert; backend and schema require no rollback.
- If the mobile artifact is defective, restore the prior verified artifact/manifest through the existing release tooling and update policy; do not hand-edit hashes.
- If a TestFlight build is defective, remove it from the testing group or assign the prior valid build; do not change the SideStore bundle identity.

### Observability

- Local/CI: focused/full test results and typecheck.
- Release: final SHA, CI run, Railway deployment run, health endpoints, APK size/SHA-256/manifest/update decisions, EAS build/submission IDs when available.
- Device: tester-provided installed build and pass/fail evidence. No PII, credentials, tokens, or Apple/Expo secrets are recorded.

### Cleanup

- No data migration or stale-row cleanup.
- Do not remove prior APK/TestFlight artifacts until the new release is verified.
- Preserve the unrelated modified 2026-09-21 analysis file outside the commit.

### Unverified boundaries before implementation

- Exact source revision installed in the reported TestFlight build.
- Current Expo/Apple authentication and signing availability for a new TestFlight submission.
- Physical-iPhone geometry and native modal behavior after the code change.

These boundaries affect evidence labeling and TestFlight delivery, not the selected source architecture.
