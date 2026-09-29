# iOS TestFlight Logout and Announcement Composer Hotfix Analysis

Date: 2026-09-29
Scope: current `mobile/` source, shared mobile logout flow, teacher and admin announcement-composer variants
Authorization boundary: analysis/report only; no product code, configuration, schema, data, Git history, or external system was changed

## 1. Executive verdict

The TestFlight logout symptom has two independent mobile-side failure paths.

1. **Drawer logout confirmation — high-confidence inferred root cause.** `RoleNavigationDrawer` is already a React Native `Modal`, but its logout button calls the branded `AppAlert`, which presents a second React Native `Modal` without first dismissing the drawer (`mobile/src/components/navigation/RoleNavigationDrawer.tsx:133-153,205-211`; `mobile/src/components/ui/AppAlert.tsx:19-31,64-103`). This production-only modal stacking is not represented by the drawer unit test because `AppAlert` deliberately delegates to mocked native `Alert` when `NODE_ENV === "test"`. On iOS this can make the confirmation unavailable, so the actual logout callback is never reached.
2. **Confirmed responsiveness defect after confirmation/direct profile logout.** `AuthProvider.logout` waits for push-device revocation and then backend refresh-token revocation before its `finally` block clears local credentials and rendered session state (`mobile/src/providers/AuthProvider.tsx:156-168`). Both HTTP clients have 30-second timeouts, so sequential remote work can delay the local logout transition by roughly 60 seconds plus storage work (`mobile/src/api/client.ts:66-69,102-106`; `mobile/src/services/notifications/push-registration.runtime.ts:60-66`; `mobile/src/api/services/auth.ts:41-47`). That can look like “does not logout” even when eventual cleanup succeeds.

The announcement complaint is role-ambiguous, but both writable variants contain a placement weakness:

- **Teacher:** the shared editor used by both the teacher announcement page and class detail is explicitly bottom-anchored with `justifyContent: "flex-end"`, has a fixed 24-point bottom padding, and has no `KeyboardAvoidingView` or safe-area inset (`mobile/src/components/teacher/TeacherAnnouncementEditorModal.tsx:73-86`).
- **Admin:** tapping Compose inserts the full editor below the list title and filter bar inside `FlatList.ListHeaderComponent`; it does not switch views, open a modal, or scroll the composer into view (`mobile/src/screens/AdminAnnouncementsScreen.tsx:164-205`; `mobile/src/components/admin/AdminPaginatedList.tsx:96-134`). On a short iPhone viewport, the composer can begin below the visible fold.

**Owner and coupling:** mobile owns the hotfix. Coupling is moderate because logout crosses secure storage, notifications, the backend revocation endpoint, maintenance-session revocation, audit, and navigator gating. Announcement mutations and DTOs do not need to change.

**Recommendation:** ship a bounded mobile-only hotfix: avoid nested drawer confirmation modals; make the local auth transition immediate while preserving best-effort server/device revocation; and move the affected composer into an iOS-safe, keyboard-aware visible position. Do not change the backend logout or announcement contracts.

## 2. Feature anatomy

### Logout flow

- Entry points: the shared role drawer is wired for student, teacher, and admin; profile screens and the incomplete-profile screen call the same `useAuth().logout` directly (`mobile/src/navigation/AppNavigator.tsx:662-722,868-876`; `mobile/src/screens/ProfileScreen.tsx:1336-1359`; `TeacherProfileScreen.tsx:331-354`; `AdminProfileScreen.tsx:81-83`; `CompleteProfileScreen.tsx:66-68`).
- Remote side effects: revoke the current push installation, post the refresh token to `POST /api/auth/mobile/logout`, revoke actor maintenance access, mark the refresh token revoked, and write a best-effort audit row (`backend/src/modules/auth/auth.controller.ts:266-280`; `auth.service.ts:243-265`; `token.service.ts:295-304`).
- Local state: clear in-memory tokens, SecureStore, AsyncStorage, the session snapshot, prior-user offline workspace data, and editor recovery; `AppNavigator` leaves authenticated navigation only after the provider session becomes null (`mobile/src/api/client.ts:228-232`; `mobile/src/api/storage.ts:7-21,68-74`; `mobile/src/providers/AuthProvider.tsx:52-78,156-168,195-220`).
- Tests prove callback wiring and eventual cleanup, but not iOS modal presentation or logout responsiveness while remote promises remain pending.

### Announcement composer variants

- `TeacherAnnouncementEditorModal` is shared by `TeacherAnnouncementsScreen` and `TeacherClassDetailScreen`; changing it affects both create/edit entry points.
- `AdminAnnouncementsScreen` has an independent inline editor and independent date-picker state. Its placement is controlled by header ordering, not the teacher modal.
- Both variants preserve the same class-scoped announcement create/update APIs. No backend, schema, notification-routing, or announcement-content change is required.

## 3. Cascade map

| Edge | Provider | Interface / state | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| L1 | `AppNavigator` | `onLogout={logout}` | Shared role drawer | Exposes one logout authority to all roles | Direct / high | Confirmed | `AppNavigator.tsx:662-722,868-876` | Preserve |
| L2 | Role drawer | Drawer `Modal` -> `AppAlert.alert` | Branded alert `Modal` | Stacks one native modal over another before drawer dismissal | Direct / high | Inferred | `RoleNavigationDrawer.tsx:133-153,205-211`; `AppAlert.tsx:64-103` | Isolate confirmation host |
| L3 | Profile screens | direct `void logout()` | `AuthProvider.logout` | Bypasses the drawer-confirmation problem but still waits on remote cleanup | Direct / medium | Confirmed | profile screen references above | Keep as regression entry points |
| L4 | `AuthProvider` | awaited push revocation | notifications API | Delays local transition; failure is swallowed only after request settles | Transitive / medium | Confirmed | `AuthProvider.tsx:156-163`; `push-registration.runtime.ts:60-66` | Run independently of visible logout |
| L5 | `authApi.logout` | refresh token body | `/auth/mobile/logout` | Revokes server refresh session | Security / high | Confirmed | `auth.ts:41-47`; `auth.controller.ts:266-280` | Preserve, best effort after intent |
| L6 | Backend auth service | actor/token/audit services | maintenance, token store, audit | Revokes maintenance access, token, and records logout | Security / high | Confirmed | `auth.service.ts:243-265`; `token.service.ts:295-304` | Preserve unchanged |
| L7 | `AuthProvider` finally block | token/session/offline/editor cleanup | navigator and local stores | Auth UI changes only after preceding awaits finish | Direct / high | Confirmed | `AuthProvider.tsx:156-168` | Make local transition immediate |
| L8 | secure storage adapter | SecureStore + AsyncStorage | future bootstrap | Prevents relogin from stale stored credentials | Persisted / high | Confirmed | `storage.ts:7-21,68-74`; `AuthProvider.tsx:102-134` | Preserve |
| L9 | teacher announcement routes | modal props/state | shared editor | Two teacher surfaces inherit the same geometry | Direct / medium | Confirmed | `TeacherAnnouncementsScreen.tsx:206-220`; `TeacherClassDetailScreen.tsx:748` | Fix shared owner once |
| C1 | teacher editor modal | bottom-aligned container | iPhone viewport/home indicator | Composer and footer sit low and ignore bottom safe area | Direct / high | Confirmed geometry; device effect inferred | `TeacherAnnouncementEditorModal.tsx:73-86,287-325` | Use keyboard/safe-area-aware dialog or sheet |
| C2 | teacher editor content | title input + rich editor | iOS keyboard | No outer keyboard avoidance; lower actions can be obscured | Direct / high | Confirmed geometry; device effect inferred | same file; focused search found no KAV/insets | Add iOS keyboard contract |
| C3 | admin announcement header | title -> filters -> conditional composer | `FlatList` viewport | Composer is inserted after controls with no reveal/scroll | Direct / medium | Confirmed | `AdminAnnouncementsScreen.tsx:164-205`; `AdminPaginatedList.tsx:96-134` | Move/switch/reveal composer |
| T1 | Jest renderer suites | mocked Modal/Android platform/event callbacks | CI confidence | Validates logic but cannot reproduce native iOS layering or layout | Operational / high | Confirmed | three focused suites, 20 tests passed on 2026-09-29 | Add targeted structural tests plus device acceptance |

## 4. Isolation and ordered hotfix cuts

### Cut A — make drawer confirmation presentable

1. Replace only the drawer’s branded-modal confirmation seam with a native iOS-safe confirmation, or render confirmation inside the existing drawer modal. For the smallest hotfix, a drawer-local native `Alert` avoids a second React Native modal without changing the shared `AppAlert` used across the app.
2. Keep the current confirmation copy and destructive/cancel semantics.
3. Add a regression that proves the drawer confirmation path reaches `onLogout`; retain a physical iPhone check because renderer tests cannot prove modal presentation.
4. Rollback: restore the drawer import/confirmation call only. No stored data or server compatibility action is required.

### Cut B — make logout local-first without weakening revocation

1. On confirmed intent, capture/start the remote cleanup inputs, set rendered session state to logged out immediately, and clear local credentials/snapshots without waiting for network completion.
2. Continue push-installation and backend refresh-token revocation as bounded best-effort work; do not remove `/auth/mobile/logout`, maintenance revocation, token revocation, or audit.
3. Add a deferred-promise test: while both remote operations are unresolved, `isAuthenticated` must already be false and local credential clearing must have started. Add rejection coverage to prove local cleanup still completes.
4. Validate login -> protected screen -> drawer logout and profile logout for student, teacher, and admin. Confirm a revoked refresh token cannot refresh afterward.
5. Rollback: restore remote-first ordering; backend state remains compatible because the endpoint contract is unchanged.

### Cut C — raise and protect the composer

1. Reproduce on the affected role first. If teacher, update the shared editor owner rather than both call sites: use the existing keyboard-aware centered-dialog pattern or an equivalent safe-area-aware sheet, keep actions visible, and account for `insets.bottom`.
2. If admin, show the composer before filters or switch the list into a focused compose view/modal when Compose is tapped; do not require the user to discover it below the fold.
3. Preserve class selection, rich text, pinning, scheduling, attachments, create/update payloads, and query refresh behavior.
4. Add structural tests for iOS keyboard avoidance/safe-bottom behavior and admin composer ordering/reveal. On a TestFlight iPhone, verify title focus, rich-text editing, keyboard show/hide, rotate/background-return, Cancel, and Publish.
5. Rollback: revert only the presentation wrapper/order; no announcement data cleanup is needed.

## 5. Improvements

Required decoupling:

- Separate visible local logout state from slow remote cleanup.
- Prevent modal-over-modal confirmation in the drawer.
- Give announcement authoring a shared iOS-safe viewport contract rather than fixed bottom padding.

Optional evidence-backed enhancements:

1. Clear or user-scope React Query data on logout; the normal logout path currently has no `queryClient.clear()` while the system-reset path does.
2. Add a short pending/disabled state only for the confirmation action, while the app transitions immediately to signed-out navigation.
3. Add one production-branch alert test that mounts the drawer and alert provider together; keep physical iOS acceptance as the final authority.

## 6. Uncertainty and coverage boundary

- The exact TestFlight build number and source SHA installed on the reporting phone were not provided, so source-to-binary identity is unverified.
- No physical iPhone/TestFlight runtime was available in this analysis. The nested-modal and keyboard/home-indicator effects are strong inferences from current React Native structure, not device-captured proof.
- The user did not identify student/teacher/admin or the exact announcement screen. Both teacher and admin composer owners were inspected; implementation should confirm the affected variant before changing presentation.
- Live backend latency and push-registration state were not measured. The remote-first delay is confirmed from ordering and configured timeouts, but its observed duration on the reporting device is unverified.
- A focused final search covered all current mobile logout entry points, the mobile logout endpoint chain, and both writable announcement-composer variants. **No additional dependency was found within the inspected scope.**
