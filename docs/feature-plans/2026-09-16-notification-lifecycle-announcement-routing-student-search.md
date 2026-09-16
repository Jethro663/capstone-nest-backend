# Implementation Plan: User-Owned Notifications, Class Announcement Deep Links, and Teacher Roster Search

Date: 2026-09-16
Authorization: implement, test, package affected mobile deliverables, commit, push `developement`, and verify CI/deployment
Source analysis: `docs/feature-analysis/2026-09-16-notification-lifecycle-announcement-routing-student-search-analysis.md`

## 1. Decision summary and feature brief

Deliver three coordinated outcomes without changing unrelated academic, enrollment, announcement-authoring, role, or AI behavior:

1. A signed-in admin, teacher, or student can delete one notification or clear all visible notifications from only their own account on web and mobile.
2. A class-announcement notification opens the correct class Announcements tab and targets the referenced post. The same post also remains visible in the aggregate Announcements page.
3. The web and mobile teacher class Students views support case-insensitive search by name, email, or LRN.

Recommended architecture:

- soft-delete recipient notifications with a new `dismissed_at` column, separate from system-owned `hidden_at`;
- repair the realtime notification envelope so `id`, `referenceId`, and `metadata.classId` preserve distinct meanings;
- use existing class-detail routes as the canonical class-announcement destination;
- use local roster filtering because both target screens already load the complete active class enrollment set.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend notification schema, migration, visibility predicate, recipient-owned dismissal endpoints, announcement fan-out envelope, and focused tests.
- Web notification types/service/provider/page/dropdown behavior, announcement routing/targeting, teacher class Students search, and focused tests.
- Mobile notification types/service/inbox/quick-panel/provider/routing, class-announcement targeting/freshness, teacher class Students search, and focused tests.
- Android version synchronization, APK build/validation/embedding, release manifest, commit/push, CI, Railway deployment, live health, and served APK verification because mobile source changes.
- Existing analysis report plus this implementation plan.

### Out of scope

- Admin deletion of notifications belonging to other users.
- Physical database erasure or a notification retention scheduler.
- Deleting or modifying source announcements when a notification is deleted.
- Changing announcement authorship, publishing, visibility, class access, enrollment, grading, learner removal, or academic evidence rules.
- Redesigning unrelated dashboards, reports, assessment lists, student profiles, admin lifecycle, AI features, or notification quiet-surface styling.
- Adding a new global announcement-detail route or multi-select notification management mode.
- iOS packaging or claims of physical-device acceptance unless evidence becomes available.

### Assumptions

- “Delete” means permanently absent from the current recipient’s visible inbox; no restore UI is required.
- “Clear notifications” affects all currently visible rows for the current recipient, including read and unread rows, but not system-hidden rows.
- The existing GABHS red/white/navy styling and current page/row primitives remain the visual authority.
- Existing old clients must continue to function while the additive backend contract rolls out.

## 3. Current-state evidence ledger

| Finding | Confidence | Evidence | Impact |
|---|---|---|---|
| No backend or client delete API exists | Confirmed | `NotificationsController`; web/mobile notification services | New additive contract required |
| Notification rows are recipient-owned | Confirmed | `notifications.userId`; current mark-read ownership check | Delete can be securely current-user scoped |
| `hiddenAt` is already system lifecycle state and producer upserts can clear it | Confirmed | `notifications.service.ts:83-98,148-197` | Use separate `dismissedAt` |
| Announcement rows store announcement and class context | Confirmed | fan-out inputs set `referenceId` and `metadata.classId` | No new announcement relation is needed |
| Realtime fan-out emits the announcement ID as notification ID and omits metadata | Confirmed | `announcement-fan-out.processor.ts:111-120` | Read/delete and navigation can target the wrong contract identity |
| Mobile announcement routing always uses the general tab | Confirmed | `resolveMobileNotificationAction` | Replace with class-context route when metadata exists |
| Web class route selects Announcements but does not target the post | Confirmed | student class page uses `announcementId` only for tab selection | Add target/highlight behavior |
| Aggregate and class mobile screens use the same per-class announcement query keys | Confirmed | `AnnouncementsScreen`, `ClassDetailScreen`, hooks | Invalidation/focus refresh can reconcile both |
| Target teacher rosters load all active enrollments with name/email/LRN | Confirmed | `ClassesService/getEnrollments`; web/mobile consumers | Local search is sufficient |
| Runtime cause of the reported stale aggregate page was not reproduced | Unverified | no authenticated runtime/device evidence | Cover all confirmed stale/filter/context paths with regression tests |

## 4. End-to-end impact and consumer map

```text
announcement worker
  -> NotificationsService.createBulkDeduped
     -> notifications row {id, userId, referenceId, metadata.classId}
     -> NotificationsGateway notification.new
        -> web NotificationProvider -> page/bell -> web destination resolver
        -> mobile LiveNotificationProvider -> inbox/quick/native -> mobile resolver

current user delete
  -> DELETE /notifications/:id or DELETE /notifications
     -> dismissedAt update constrained by authenticated userId
     -> shared visibility predicate
        -> list totals + unread count + read-all
        -> web provider/page/bell state
        -> mobile inbox/count/quick-panel state

class enrollment endpoint
  -> web teacher class studentRows -> local roster query -> existing row actions
  -> mobile useTeacherEnrollments -> local roster query -> existing row actions
```

Direct public consumers discovered:

- Backend: notifications controller/service/gateway, announcement fan-out processor, admin lifecycle notification hiding.
- Web: notification service/provider, notification page, bell dropdown, teacher dashboard subscriber, routing helpers, student class page, student aggregate announcements, teacher class page.
- Mobile: notifications API/provider/context, inbox, quick panel, home unread badges, native-notification tap, routing helper, student class page, aggregate announcements, teacher class page.
- Operations: Drizzle migration journal/snapshot, CI migration bootstrap on PostgreSQL 16/18, Android release manifest and backend app-version registration.

## 5. Conflicts, invariants, risks, and options

### Invariants

- JWT and role guards remain authoritative. Delete endpoints infer the recipient from `@CurrentUser()`.
- Notification deletion never mutates the announcement, assessment, intervention, class, or enrollment that caused it.
- `hiddenAt` remains available for system lifecycle cleanup; `dismissedAt` records recipient intent.
- Existing response envelopes and pagination fields remain unchanged except for additive delete responses.
- Mobile and web never call `ai-service` directly.
- Roster search never alters the source rows or action identifiers.

### Highest-impact risks

1. **Wrong realtime identity:** shipping delete UI before fixing socket row IDs can send an announcement ID to a notification delete/read endpoint. Fix the producer contract first.
2. **Split visibility rules:** adding `dismissedAt` to list but not unread/read-all would produce ghost counts. All operations must call the same predicate.
3. **State drift after deletion:** provider state, paginated page state, mobile React Query caches, quick panel, and unread badges can disagree. Each mutation needs one authoritative reconciliation path.
4. **Old-client compatibility:** enriched socket metadata must be additive; fallback destinations remain valid when metadata is missing.
5. **APK provenance:** any post-build source change invalidates the APK and manifest; build only after final mobile verification inputs stabilize.

### Design options

- Hard delete: rejected because it removes dedupe/history and permits event resurrection.
- Reuse `hiddenAt`: rejected because it conflates system lifecycle and user intent.
- Separate `dismissedAt`: selected for semantic isolation and backward compatibility.

## 6. Recommended architecture, data flow, security, and error behavior

### Backend dismissal contract

- Schema: nullable timestamptz `dismissed_at`; add/replace a visibility-order index that supports `(user_id, hidden_at, dismissed_at, created_at)`.
- Predicate: visible when `user_id = current user`, `hidden_at IS NULL`, and `dismissed_at IS NULL`, plus optional read filter.
- `dismissOne(notificationId, userId)`: update only matching visible/current-user row, set `dismissedAt`, return `{ dismissedCount: 0|1 }`; repeated requests are successful and do not expose another user’s row.
- `dismissAll(userId)`: update all current-user visible rows, return count.
- Routes: `DELETE /notifications/:id` and `DELETE /notifications` with existing role guards.

### Realtime announcement contract

- `createBulkDeduped` returns the inserted persisted rows required by emitters, including row `id`, `referenceId`, and metadata.
- Fan-out emits `{ id: row.id, type, title, body, referenceId: announcementId, metadata: { classId }, createdAt }`.
- Web/mobile realtime payload types and normalizers preserve metadata.

### Client state and error behavior

- Web provider owns delete mutation and the canonical header/bell snapshot. Page-local pagination removes a row only after success and refetches when needed to fill/normalize the page.
- Mobile inbox uses React Query invalidation/refetch for list/count. Quick panel either exposes one visible Delete control per row or sends users to See all; it must reload after a mutation.
- Failures keep data visible, end the pending state, and show a concise retryable error. Bulk deletion requires confirmation.
- Announcement navigation uses class context when present, otherwise the current safe aggregate fallback.
- On mobile `announcement_posted`, invalidate the matching `queryKeys.announcements(classId)` before/while navigating. A targeted aggregate fallback resets filters that would hide the item.

## 7. Contract, schema, migration, and compatibility changes

### Backend files

- `backend/src/drizzle/schema/announcements-notifications.schema.ts`
- new `backend/drizzle/0032_*.sql`, matching snapshot, and `backend/drizzle/meta/_journal.json`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/notifications.gateway.ts` only if its payload typing requires adjustment
- `backend/src/modules/notifications/processors/announcement-fan-out.processor.ts`

### Client contract files

- `next-frontend/src/types/notification.ts`
- `next-frontend/src/services/notification-service.ts`
- `next-frontend/src/providers/NotificationProvider.tsx`
- `mobile/src/types/notification.ts`
- `mobile/src/api/services/notifications.ts`
- `mobile/src/providers/LiveNotificationProvider.tsx`
- `mobile/src/utils/mobile-notification-routing.ts`
- `mobile/src/navigation/types.ts`

Compatibility rules:

- No existing field is removed or renamed.
- Old clients ignore socket metadata and keep aggregate fallbacks.
- New clients tolerate missing metadata from old/in-flight events.
- Migration is nullable and requires no destructive backfill.
- Existing `hiddenAt` rows remain hidden; existing visible rows remain visible until users dismiss them.

## 8. Ordered implementation phases and exact ownership

### Phase A — TDD backend visibility and dismissal

1. Add failing service/controller tests for delete-one, delete-all, ownership isolation, idempotency, visible totals/unread counts, and non-resurrection.
2. Add schema/migration and update the shared visibility predicate.
3. Implement service/controller methods minimally until focused tests pass.
4. Generate/check Drizzle journal/snapshot through the repository’s current migration tooling and run migration integrity checks.

Primary tests: `notifications.service.spec.ts`, `notifications.controller.spec.ts`, migration bootstrap.

### Phase B — TDD realtime identity/context

1. Add failing fan-out/provider normalization tests asserting persisted row ID, announcement reference ID, and class metadata.
2. Change `createBulkDeduped` return typing and fan-out emit payload.
3. Preserve metadata in web/mobile realtime adapters.

Primary tests: `announcement-fan-out.processor.spec.ts`, `notifications.service.spec.ts`, `NotificationProvider.test.tsx`, mobile provider tests.

### Phase C — TDD web notification and announcement UX

1. Add failing service/provider/page tests for delete-one/delete-all and unread reconciliation.
2. Add explicit accessible deletion controls and confirmation using existing web primitives.
3. Add routing/page tests proving class announcement context and target highlighting.
4. Add failing teacher class roster search tests, then add the name/email/LRN filter and no-match state.

Owners: notification service/provider/page/bell as required; notification routing; student class page; teacher class page and existing workspace CSS only.

### Phase D — TDD mobile notification, navigation, and roster UX

1. Add failing API/inbox tests for delete methods and cache reconciliation.
2. Add visible Delete and confirmed Clear notifications to the inbox using existing teacher/student theme primitives.
3. Add failing routing tests for `ClassDetail` class/announcement params, missing-context fallback, and metadata normalization.
4. Extend class-detail params and target behavior; invalidate announcement queries on receipt/focus.
5. Add failing teacher roster search tests, then implement local name/email/LRN filtering and no-match state.

Owners: mobile notification service/types/provider/inbox/quick panel if needed, routing/navigation types, `ClassDetailScreen`, `AnnouncementsScreen`, `TeacherClassDetailScreen`, and focused tests.

### Phase E — Review, complete verification, and package Android

1. Review final diff against every in-scope requirement and remove accidental changes.
2. Run focused tests, then backend lint/test/build, frontend lint/typecheck/test/build, mobile release tests/typecheck/full tests.
3. Bump version through current authority from 0.1.41/code 42 to the next version/code unless concurrent authoritative changes require a different next value.
4. Build release APK with the production backend `/api` explicitly injected, verify package/version/ABI/signature/archive/API URL, compute hash/size, embed it, update manifest, and run `release:verify`.
5. Rerun affected frontend/mobile gates after embedding/version changes.

### Phase F — Ship and observe

1. Fetch origin; verify no unexpected outgoing commits/divergence; stage only plan-owned files and release artifacts.
2. Commit to `developement`, push, confirm exact remote SHA.
3. Observe exact-SHA GitHub CI, then the downstream Railway deployment. Diagnose and fix in-scope failures; each fix requires a new verification cycle.
4. Verify public frontend/backend health, protected notification route behavior, served APK byte/hash equality, manifest, and `/api/app-version/check` behavior for prior/current version codes.

## 9. Verification matrix and acceptance criteria

| Requirement | Automated proof | Runtime/artifact proof | Acceptance criterion |
|---|---|---|---|
| Delete one own notification | backend service/controller tests; web/mobile client tests | authenticated smoke when available | Row disappears only for current user; source remains |
| Delete all own visible notifications | ownership/count/pagination tests | confirmed dialog interaction | Visible inbox is empty; other user rows unchanged |
| Counts stay coherent | visibility/read-all/provider/query tests | bell/home badge observation | No ghost unread count after delete |
| Realtime identity/context | fan-out/gateway/provider tests | socket-backed smoke when available | row ID is deletable/readable; reference/class route correctly |
| Mobile class-announcement deep link | routing/navigation/class-screen tests | emulator/device if available | opens correct class Announcements tab and target |
| Web class-announcement deep link | routing/class-page tests | Playwright authenticated flow if available | target post is visible/highlighted |
| Aggregate announcement freshness | provider/query invalidation tests | navigate between class and aggregate | same new post appears without manual pull-to-refresh |
| Web teacher roster search | page/helper tests | browser at desktop and narrow viewport | name/email/LRN each find same student; row actions intact |
| Mobile teacher roster search | screen/helper tests | emulator/device if available | same matching and no-match behavior; keyboard does not trap actions |
| Schema compatibility | migration integrity + PG16/PG18 CI | deployed health | existing rows remain valid and service boots |
| Android delivery | release tests/typecheck/tests/build/verify | APK archive/package/version/signature/hash/API URL/served equality | downloadable APK matches final source and manifest |

Required local gates before commit:

- backend focused notification tests, `npm run lint`, `npm run test -- --ci`, `npm run build`;
- frontend focused tests, `npm run lint`, `npm run typecheck`, `npm run test -- --ci`, `npm run build`;
- mobile focused tests, `npm run test:release`, `npm run typecheck`, `npm run test`, `npm run release:verify` after packaging;
- root `git diff --check` and final scoped-diff review.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

Rollout order is migration/backend first, then clients through the same tested commit. Additive metadata and routes preserve old-client fallback behavior. Observe backend notification endpoint errors, deployment health, CI migration jobs, and client error reporting; no new analytics or monitoring system is added.

Rollback order:

1. Disable/remove client delete controls and class-context routing if a client regression occurs.
2. Revert server endpoints/predicate while leaving the nullable column in place.
3. Do not physically drop `dismissed_at` until all released clients no longer depend on it.
4. Restore the prior downloadable APK/manifest only if their exact bytes and metadata are available and the backend updater record is reconciled.

Cleanup after stabilization may add a separate retention policy for old dismissed rows, but physical purging is explicitly outside this release.

Unverified until implementation/runtime evidence:

- the exact live-device cause of the teacher’s reported aggregate announcement miss;
- Android/iOS hardware Back and notification-tap behavior on a physical device;
- authenticated production interaction for delete/deep-link flows;
- production signing, because the current local Android artifact may remain debug-signed/internal-testing-only.

The plan is internally complete with no open decision that blocks implementation. Any newly discovered contract contradiction must pause only the affected phase and be reconciled against the analysis report rather than expanding scope.
