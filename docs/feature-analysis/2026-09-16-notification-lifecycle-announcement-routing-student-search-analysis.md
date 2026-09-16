# Feature Isolation Analysis: Notification Lifecycle, Announcement Routing, and Student Search

Date: 2026-09-16
Mode: analysis and solution planning only; no implementation, schema, data, configuration, or git-history changes
Scope assumption: “delete notifications” means a signed-in user can delete one or all notifications from only their own inbox on web and mobile. It does not mean an administrator can erase notifications for every recipient, and it does not delete the announcement or other source record. “All student lists” is treated as a consistency rule for operational roster/masterlist views, with the requested teacher class rosters delivered first.

## 1. Executive verdict

The three symptoms are related through shared cross-platform contracts, but they should be delivered as three ordered seams rather than one large UI patch:

1. establish a recipient-owned notification dismissal contract in the backend, then connect both clients;
2. repair announcement notification identity, context, navigation, and cache freshness;
3. add a common name/email/LRN search behavior to the requested teacher rosters, followed by a bounded consistency pass over other operational student lists.

**Confirmed:** the backend exposes list, unread count, mark-one-read, and mark-all-read operations, but no delete/dismiss operation (`NotificationsController`, `backend/src/modules/notifications/notifications.controller.ts:25-97`). Web and mobile services mirror that omission (`next-frontend/src/services/notification-service.ts:26-55`; `mobile/src/api/services/notifications.ts:22-52`).

**Confirmed:** notification rows are already recipient-specific through `notifications.userId`. The backend also has a system-owned `hiddenAt` lifecycle field, and every visible list/count/read-all query excludes hidden rows (`backend/src/drizzle/schema/announcements-notifications.schema.ts:87-121`; `backend/src/modules/notifications/notifications.service.ts:44-53,148-197,199-275`). This makes recipient-only soft deletion feasible, but user deletion should not silently reuse the system lifecycle field because producers can currently clear `hiddenAt` during an upsert (`notifications.service.ts:83-98`).

**Confirmed:** a persisted class-announcement notification has the right domain context—`referenceId = announcementId` and `metadata.classId = classId`—but the realtime fan-out emits the announcement ID as the notification ID and omits metadata (`backend/src/modules/notifications/processors/announcement-fan-out.processor.ts:97-120`). That breaks the identity/context contract needed by mark-read, delete, and exact navigation.

**Confirmed:** mobile routes every student `announcement_posted` event to the general Announcements tab and ignores both announcement and class context (`mobile/src/utils/mobile-notification-routing.ts:84-209`). Web is closer: a stored student notification with `metadata.classId` routes to the class workspace, but the class page only uses the announcement ID to choose the Announcements tab; it does not target or highlight the post (`next-frontend/src/lib/notification-routing.ts:54-139`; `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx:1263-1282`). Web’s realtime adapter also drops metadata (`next-frontend/src/providers/NotificationProvider.tsx:794-813`).

**Confirmed:** class announcements are already intended to appear in the general student Announcements page on both platforms. Both clients enumerate the student’s classes and call the same per-class announcement endpoint used by the class experience (`next-frontend/app/(dashboard)/dashboard/student/announcements/page.tsx:52-115`; `mobile/src/screens/AnnouncementsScreen.tsx:41-84`; `mobile/src/screens/ClassDetailScreen.tsx:573-632`). Therefore the correct product behavior is “present in the aggregate page, but deep-link to its class context.”

**Inferred:** the teacher’s observed “missing from Announcements but present inside the class” is most likely a client freshness/targeting problem, not a second announcement data model. Mobile retains its selected class/pinned filter, has no focus refetch, uses a 30-second default stale window, and receives no class metadata on live events (`AnnouncementsScreen.tsx:41-117`; `mobile/src/api/queryClient.ts:2-12`; `LiveNotificationProvider.tsx:114-154,816-824`). Runtime reproduction was not performed, so the exact combination remains unverified.

**Confirmed:** the requested teacher class rosters already contain the necessary fields and load the complete enrolled set. Web derives `fullName`, `email`, and `lrn` and maps the full `studentRows`; mobile renders the complete `rosterQuery.data` and formats LRN/email (`next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx:1819-1837,4296-4412`; `mobile/src/screens/TeacherClassDetailScreen.tsx:610-651`). The backend enrollment query returns every active enrollment with student email and profile LRN (`backend/src/modules/classes/classes.service.ts:2356-2389`). No backend search change is required for these two bounded class rosters.

**Recommendation:** use a separate recipient `dismissedAt` tombstone, preserve `hiddenAt` for system lifecycle hiding, make the realtime envelope carry the persisted notification row ID plus metadata, deep-link to the class announcement on both clients, invalidate/refetch announcement data, and add local normalized roster filters. Coupling is moderate-to-high because notification state spans database rows, REST, sockets, providers, unread counters, native notifications, and two UI stacks. The roster portion is low-risk and locally isolated.

### Frontend redesign decision ledger

| Ledger | Decision | Confidence |
|---|---|---|
| Keep | The existing quiet-notification awareness surface: one compact prompt opens the detailed notification center; dismissing the prompt is not inbox deletion. | Confirmed |
| Keep | The existing web notification page, mobile notification inbox/quick panel, student class workspace, aggregate Announcements page, and teacher class Students tab. | Confirmed |
| Keep | Current GABHS red/white/navy identity, existing page/table/row primitives, current role shells, and source-aware Back behavior. | Confirmed |
| Change | Add explicit Delete on an inbox item and confirmed Clear notifications for the signed-in account. | Accepted from request |
| Change | Make a class-announcement notification open its class Announcements tab and visibly target that post. | Recommended from evidence |
| Change | Refresh/invalidate announcement data so the aggregate feed and class workspace agree after a live post. | Recommended from evidence |
| Change | Add the same name/email/LRN search language above web and mobile teacher class rosters. | Accepted from request |
| Frozen | Announcement creation, visibility, authorship, enrollment, grading, and removal procedures; backend remains the authority. | Confirmed invariant |
| Frozen | User A can never read, mark, or delete user B's notification. Notification deletion never deletes the announcement/source record. | Confirmed security boundary |
| Frozen | Existing notification filters and mark-read behavior remain available. Class-roster search is non-mutating. | Confirmed scope |
| Unknown resolved by scope assumption | “Delete notifications” includes delete one and delete all own visible notifications; no admin global purge and no restore UI. | Inferred; reversible plan boundary |
| Unknown resolved by evidence | Class announcements belong in both the aggregate feed and class workspace; the class workspace is the preferred notification destination. | Confirmed current data flow; proposed navigation |

### Directions considered

**Direction A — Context-first repair (recommended).** Keep the existing surfaces, add low-emphasis row deletion plus a confirmed bulk clear action, route class announcements into the class workspace, and place one compact roster search above the current list/table. This improves information hierarchy and action placement without introducing a new management mode or changing procedures. It is the smallest direction that fixes every reported failure and preserves platform familiarity.

**Direction B — Notification management mode.** Add selection checkboxes, bulk actions, and a dedicated announcement-detail route from the global inbox. This makes large-scale cleanup easier, but adds persistent selection state, more controls, and a new route hierarchy for a school inbox that currently emphasizes quiet awareness. It is not justified by the request.

**Direction C — Mobile gesture-first cleanup.** Use swipe-to-delete on mobile and row menus on web while leaving announcements on the general feed. This is fast for experienced users but hides a consequential action, weakens accessibility/discoverability, and leaves the faulty class context unresolved. Rejected.

Chosen traits from Direction A:

- information density: one search field or one delete affordance added only where needed;
- hierarchy: browsing stays aggregate, notification deep links become class-specific;
- action placement: destructive bulk action stays in the inbox header and requires confirmation;
- platform behavior: web uses explicit buttons/menu controls; mobile may support swipe later, but always retains a visible accessible action.

### Route and stack contract

| Surface | Entry sources | Forward exits | Back behavior | State retained | Guard/fallback |
|---|---|---|---|---|---|
| Web `/dashboard/notifications` | bell, quiet prompt, direct URL | role-specific destination; delete confirmation | browser/history to actual source | filter and page while mounted | authenticated role shell |
| Mobile `Notifications` | home/bell/quick panel, native notification fallback | resolved detail route; delete confirmation | pop to actual source; role home only for direct entry with no history | filter while mounted; query cache | authenticated root stack |
| Web student class `?announcement=:id` | notification inbox/deep link | existing class tabs and post interactions | browser Back returns to notification source | requested Announcements tab and target ID | if class access fails, existing protected/error behavior; general announcements is the product fallback |
| Mobile `ClassDetail({classId, initialTab:"announcements", announcementId})` | inbox, quick panel, native notification | existing class tabs | header/hardware Back pop to the actual source | class, selected tab, target ID while route is active | missing/inaccessible context routes to `MainTabs/Announcements` |
| Web/mobile aggregate Announcements | primary navigation or fallback | announcement detail/current modal | Back follows role shell/history | ordinary user-selected filters; a targeted fallback temporarily reveals its item | only enrolled-class data |
| Web teacher class `?view=students` | Classes, direct URL | learner overview, add/remove learner | browser Back/history | search query while page/class is unchanged | teacher class-access rules unchanged |
| Mobile `TeacherClassDetail({initialTab:"students"})` | teacher Classes | remove learner and existing detail actions | header/hardware Back pop | search query while the class route is active | teacher class-access rules unchanged |

Back closes a delete confirmation before leaving its page. Canceling a delete changes no server or local state. A direct mobile notification with unusable class context falls back to the aggregate Announcements destination instead of resetting the whole app stack.

### Frontend state matrix

| State | Notification deletion | Announcement destination | Roster search |
|---|---|---|---|
| Default | Per-row Delete; header Clear notifications | Open target class/post | Full roster and empty query |
| Loading | Disable destructive action for the affected row/bulk request | Existing loading state while class/post loads | Existing roster loading state; search may be disabled until rows exist |
| Empty | No bulk action when zero visible rows | Aggregate/class empty copy remains truthful | “No students enrolled” when roster itself is empty |
| No match | Not applicable | Target fallback explains unavailable content through existing error surface | “No students match name, email, or LRN” plus clear-search action |
| Error/offline | Keep row(s), show retryable error | Stay on safe source/fallback; never loop navigation | Filtering still works on loaded rows; initial-load error remains unchanged |
| Disabled | Bulk clear disabled while request is pending | Prevent duplicate navigation while resolving | Input disabled only when no loaded data or class changes |
| Permission denied | Backend ownership check; no existence leak across users | Existing role/class access guard | Existing teacher class guard |
| Long content/small viewport | Row action remains reachable without horizontal overflow | Target uses existing responsive class layout | Search is full-width on mobile and does not cover sticky actions/keyboard |

## 2. Feature anatomy

### 2.1 Notification lifecycle and deletion semantics

Current flow:

`producer/worker -> one notifications row per recipient -> REST hydration + unread count -> socket awareness -> web/mobile inbox -> mark read`

The quiet alert’s Dismiss action is presentation-only; it intentionally does not remove or mark the underlying inbox row. User-owned deletion belongs in the notification center/inbox and must be a durable backend state change.

Three approaches were considered:

- **Hard-delete the row:** smallest query surface, but it destroys delivery evidence and removes the `(userId, type, referenceId)` deduplication tombstone. The same producer event can later create a fresh row and resurrect what the user believed was deleted. Not recommended.
- **Reuse `hiddenAt`:** avoids a migration and existing queries already honor it, but conflates system lifecycle retirement with user intent. Existing upsert behavior may also clear it. Acceptable only as a short-lived stopgap.
- **Add `dismissedAt` (recommended):** keeps system hiding and user deletion independent, preserves deduplication and debugging evidence, and allows every inbox/count query to use one explicit visibility predicate: `hiddenAt IS NULL AND dismissedAt IS NULL`.

The public contract should be additive and current-user-scoped:

- `DELETE /api/notifications/:id` soft-deletes one notification only when `userId` matches the authenticated user. Make it idempotent.
- `DELETE /api/notifications` soft-deletes all currently visible notifications for the authenticated user and returns `{ dismissedCount }`.
- Neither endpoint accepts a target user ID. No admin-wide purge or source-announcement deletion is part of this feature.

Web should expose `deleteNotification` and `deleteAllNotifications` through `NotificationProvider` so the notification page, bell dropdown, provider list, and unread count remain coherent. Mobile should update/refetch both `mobile-notifications/inbox` and `mobile-notifications/unread-count`; the quick panel must reload after a delete. A failed request keeps the row visible and shows an actionable error.

### 2.2 Announcement notification destination

The canonical domain envelope must distinguish:

- `id`: persisted notification row ID, used for read/delete/deduplication;
- `referenceId`: announcement ID, used to target content;
- `metadata.classId`: class workspace context;
- `type`: `announcement_posted`.

The current persisted row meets the last three requirements, but the socket envelope does not. `createBulkDeduped` currently maps inserted rows back to inputs and discards the persisted row ID (`backend/src/modules/notifications/notifications.service.ts:104-145`); the fan-out then emits `id: announcementId`. Repairing that producer boundary is a prerequisite for reliable navigation and deletion of newly received rows.

Recommended behavior:

- Student web: `/dashboard/student/classes/:classId?announcement=:announcementId`, then visibly target the matching post.
- Student mobile: `ClassDetail({ classId, initialTab: "announcements", announcementId })`, then refetch/invalidate the class announcement query and focus the matching post.
- Teacher notifications, if this event type is later sent to teachers: open `TeacherClassDetail({ classId, initialTab: "announcements", announcementId })`; fall back to the teacher Announcements feed only when context is absent or inaccessible.
- General Announcements pages remain cross-class aggregate views and must also show the post after refresh. They are fallback/browsing destinations, not the preferred deep link for a class-scoped event.

The mobile notification type currently has no `metadata` field (`mobile/src/types/notification.ts:1-20`). Both the stored API normalizer and realtime payload types must preserve it. When `announcement_posted` arrives, the mobile provider should invalidate `queryKeys.announcements(classId)` so an already-mounted aggregate tab cannot keep showing stale data. Navigation should reset or override filters when targeting a specific post so a remembered class/pinned filter cannot hide it.

### 2.3 Student roster search

For the requested teacher class views, search is a presentation filter over already-loaded rows. Normalize once using trimmed, case-insensitive text across:

`full name + email + LRN`

Keep the original row IDs and action targets; filtering must never alter enrollment, grade, removal, or selection state. Show `N of M students` while a query is active and a specific “No students match name, email, or LRN” empty state. Clear the query when the class changes.

There is already a strong web precedent: `StudentMasterlistTable` searches by name/email/LRN and is used by class/section add-student flows (`next-frontend/src/components/shared/StudentMasterlistTable.tsx:20-27,109-115`; consumers under `dashboard/*/classes|sections/*/students/add`). The admin access-students page also implements those three fields (`next-frontend/app/(dashboard)/dashboard/admin/access-students/page.tsx:53-60,142-147`). The new teacher roster controls should match this language and behavior.

“Every page with a student list” should not become an indiscriminate refactor of reports, exports, assessment submissions, and small incidental lists. The bounded consistency follow-up should cover operational roster/masterlist surfaces where a user locates a learner. Confirmed adjacent gaps include the web admin class roster, the mobile teacher section roster, and the mobile class-record learner selector; the web class-record grid already searches name/LRN but not email (`next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.tsx:2419-2432`; `mobile/src/screens/TeacherSectionDetailScreen.tsx:234-248`; `mobile/src/components/academic/AcademicWorkbook.tsx:269-278`; `next-frontend/src/components/teacher/class-record/TeacherClassRecordGradeGrid.tsx:119-127`). These should be inventoried and aligned after the two requested pages, based on whether each data contract actually supplies all three fields.

## 3. Cascade map

This table is the relationship source of truth.

| Edge | Provider | Interface/state | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| N1 | Notification producers | `createBulk` / `createBulkDeduped` | `notifications` table | Creates one durable row per recipient and deduplicates referenced events | Direct, high | Confirmed | `notifications.service.ts:66-145`; schema unique index at `announcements-notifications.schema.ts:116-120` | Preserve row-per-recipient and dedupe |
| N2 | Notification table | `hiddenAt`, `isRead`, visibility predicate | inbox, count, read-all | Defines what a user can see and what counts as unread | Direct, high | Confirmed | `notifications.service.ts:44-53,199-275` | Add independent `dismissedAt` to the predicate |
| N3 | Notifications controller | `GET`, `PATCH read`, `PATCH read-all` | web/mobile service clients | No current delete capability | Direct, medium | Confirmed | `notifications.controller.ts:25-97`; both client services | Add current-user delete-one/delete-all contracts |
| N4 | Announcement fan-out | Socket `notification.new` | web/mobile live providers | Emits reference as row ID and omits `metadata.classId` | Async, high | Confirmed | `announcement-fan-out.processor.ts:111-120`; gateway accepts metadata at `notifications.gateway.ts:156-165` | Emit persisted row ID, reference ID, and metadata |
| N5 | Web provider | in-memory notifications/unread count | notification page, bell, teacher dashboard, subscribers | Read mutations update shared state; deletion would otherwise leave stale counts/surfaces | Transitive, high | Confirmed | `NotificationProvider.tsx:217-305`; consumer search | Add provider-owned delete mutations and state reconciliation |
| N6 | Mobile notification clients | inbox queries, quick panel, native tap | mobile notification surfaces | Separate caches/panel state must agree after delete | Transitive, high | Confirmed | `NotificationsInboxScreen.tsx:117-179`; `MobileNotificationQuickPanel.tsx:53-95`; `LiveNotificationProvider.tsx:585-593` | Invalidate/refetch all relevant state after success |
| A1 | Persisted announcement notification | `referenceId` + `metadata.classId` | web destination resolver | Stored web rows route to the correct class | Direct, medium | Confirmed | `announcement-fan-out.processor.ts:97-105`; `notification-routing.ts:98-110` | Keep and test class-aware route |
| A2 | Mobile destination resolver | `announcement_posted` action | student navigation | Always opens general Announcements and cannot target a post | Direct, high | Confirmed | `mobile-notification-routing.ts:156-166`; current test expects generic teacher routing only | Route class-scoped events to class detail |
| A3 | Web/mobile class detail | announcement query/list | selected class workspace | Both display class announcements, but exact target support is absent | Direct, medium | Confirmed | web class page `1268-1282`; mobile class page `623-632,1675-1755` | Add `announcementId` focus/open behavior |
| A4 | Mobile aggregate Announcements | per-class React Query entries + retained filters | general student feed | The aggregate can be stale or filter out a newly posted item | Stateful, high | Confirmed risk; observed cause unverified | `AnnouncementsScreen.tsx:41-117`; `queryClient.ts:2-12` | Invalidate on event, refetch on focus/target, override hiding filters |
| S1 | `GET /classes/:id/enrollments` | full active enrollment rows with email/LRN | web teacher class roster | Current page maps all rows without search | Direct, low | Confirmed | `ClassesService/getEnrollments`; teacher class page `1819-1837,4296-4412` | Add local normalized filtering |
| S2 | Same enrollment endpoint | `useTeacherEnrollments` | mobile teacher class roster | Current screen maps all rows without search | Direct, low | Confirmed | `mobile/src/api/hooks.ts:205-212`; `TeacherClassDetailScreen.tsx:610-651` | Add local normalized filtering |
| S3 | Shared masterlist/search conventions | name/email/LRN query | add-student and admin access lists | Establishes wording and matching behavior | Transitive, low | Confirmed | `StudentMasterlistTable.tsx:109-115`; admin access-students page `53-60,142-147` | Reuse behavior, not necessarily the same UI component |

No additional dependency was found within the inspected scope after focused searches across notification producers/controllers/services/schema, web/mobile notification consumers, announcement destination consumers, and operational roster surfaces.

## 4. Isolation and ordered implementation plan

### Phase 1 — Make recipient deletion authoritative

Prerequisites: agree that delete-one and delete-all mean permanent removal from that recipient’s visible inbox, with no restore UI in this scope.

1. Add nullable `dismissedAt` to `notifications` with an index supporting user visibility/order queries. Update the shared visibility predicate to require both `hiddenAt` and `dismissedAt` to be null.
2. Add service methods that update rows using both notification ID and authenticated user ID. Delete-all must affect only visible rows for that user. Do not accept a user ID from the request body/query.
3. Add idempotent controller endpoints and tests for ownership, missing/already-dismissed rows, unread counts, pagination totals, and delete-all isolation between two users.
4. Ensure producer upserts never clear `dismissedAt`. Preserve the unique row so a duplicate event does not recreate a deleted notification.

Validation: backend unit/controller/e2e tests prove user A cannot dismiss user B’s row; deleted unread rows immediately reduce unread totals; pagination never returns dismissed/system-hidden rows; producers do not resurrect a dismissed referenced row.

Rollback: remove/disable the new endpoints and client controls first. Leaving the nullable column and predicate-compatible migration in place is safe; a follow-up migration can remove it only after clients no longer call the endpoints.

### Phase 2 — Connect web and mobile deletion without split state

1. Add service methods and typed responses on both clients.
2. Web: make `NotificationProvider` the state owner for delete-one/delete-all. After server success, remove rows from provider/page state and decrement unread count only for deleted unread rows. Refresh paginated totals when the full page owns more rows than the provider snapshot.
3. Mobile: add explicit per-row Delete and confirmed “Clear notifications” actions in `NotificationsInboxScreen`; invalidate/refetch inbox and unread queries. Add delete support to the quick panel or deliberately keep deletion in “See all” to avoid duplicate controls.
4. Use visible, accessible buttons/menus; do not make swipe the only deletion path. Bulk delete needs a confirmation stating that only this account’s notifications are removed.

Validation: web and mobile contract tests, provider/query state tests, keyboard/screen-reader accessible actions, failed-request recovery, pagination after removing the last row on a page, and account-switch checks.

Rollback: hide the client controls while retaining additive backend endpoints. No other user’s row or source content is affected.

### Phase 3 — Repair the announcement event and deep link

1. Change the producer return/event boundary so socket payload `id` is the inserted notification row ID, `referenceId` is the announcement ID, and `metadata.classId` is present. Update gateway/fan-out tests.
2. Preserve `metadata` in web and mobile realtime types/normalizers. Add it to `MobileNotification`.
3. Mobile: route a student class announcement to `ClassDetail` with `{ classId, initialTab: "announcements", announcementId }`. Extend route types and make the class screen refetch/focus the referenced post. Use the general Announcements tab only as the safe fallback.
4. Web: keep the existing class-aware destination, but make the class page target/highlight the referenced post instead of only selecting the tab. Confirm live events retain class metadata.
5. Invalidate/refetch the per-class announcement query on mobile live receipt. The aggregate Announcements view should refetch on focus and reveal a specifically targeted item regardless of its prior class/pinned filter.

Compatibility: old clients ignore the added metadata and keep using current fallbacks. Deploy the backend envelope fix before relying on new mobile/web routing. Stored rows already contain the class context.

Validation: unit fixtures for stored and realtime envelopes on both platforms; notification row ID is accepted by mark-read/delete; exact class/post opens from inbox and native notification; missing/inaccessible class falls back safely; new announcement appears in aggregate and class views without manual pull-to-refresh.

Rollback: client routing can revert to general Announcements while the enriched event remains backward-compatible. Do not revert the corrected row identity once delete actions depend on it.

### Phase 4 — Add roster search and then perform the consistency pass

1. Web teacher class Students tab: add a search input above the table and derive `filteredStudentRows` from name/email/LRN. Keep total enrollment count separate from result count.
2. Mobile teacher class Students tab: add a `TextInput` above the flat roster and apply the same normalized fields. Clear on class change and provide a no-match state.
3. Add focused tests for case-insensitive name, email, exact/partial LRN, whitespace, no-match, clear, and preservation of row actions.
4. Inventory only operational learner-location surfaces. Align confirmed adjacent gaps when their data supplies the fields; document exceptions instead of inventing unavailable email/LRN data or changing unrelated report/export flows.

Validation: both requested pages find the same learner by each of the three fields; removal/profile actions still use the original student/enrollment ID; search does not cause new backend traffic; large but realistic class rosters remain responsive.

Rollback: remove the local filter controls; no API, schema, or enrollment state is involved.

## 5. Required seams and optional improvements

Required decoupling:

- Treat notification row identity, source reference, and navigation metadata as three distinct fields across database, REST, sockets, web, and mobile.
- Centralize the backend visibility predicate so read, count, delete, pagination, and future retention cannot disagree.
- Keep aggregate announcement browsing separate from class-scoped deep-link behavior.
- Use one documented roster matching rule across platforms even when native UI components differ.

Optional, evidence-backed improvements (not required for the first delivery):

1. Add a small shared notification-routing fixture set exercised independently by web and mobile so type/reference/class expectations cannot drift again.
2. Show “N of M students” and a clear-search action on operational rosters.
3. Add an announcement-focus affordance (brief highlight or opened detail) so users can tell the deep link succeeded.
4. Add notification retention/cleanup policy later for old dismissed rows; do not mix physical retention with the user-facing delete release.
5. Extend the same search contract to the web admin class roster, mobile section roster, and mobile class-record learner picker after confirming their data shapes.

## 6. Uncertainty and coverage boundary

- The reported mobile scenario was not reproduced against a running authenticated app. The generic route, missing realtime metadata, retained filters, and absent focus invalidation are confirmed; which one caused that exact teacher test is unverified.
- The current announcement fan-out targets enrolled students. The report assumes the teacher created the announcement and observed the student-side notification, because no evidence showed teachers receiving their own `announcement_posted` rows.
- The inspection covered current notification schema/service/controller, announcement fan-out, web/mobile providers/services/inboxes/routing, aggregate and class announcement consumers, the requested teacher rosters, and directly adjacent operational roster patterns. It was not a claim that every report, assessment result, export, or historical academic list has been exhaustively classified.
- Delete-one plus delete-all-own is an explicit scope assumption from the wording. If only delete-one is desired, the bulk endpoint/UI can be omitted without changing the rest of the design.
- No production data, socket traffic, authenticated browser session, or physical mobile device was inspected. Those remain implementation-phase acceptance evidence.
