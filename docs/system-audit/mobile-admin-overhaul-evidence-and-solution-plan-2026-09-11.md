# Nexora Mobile Administrator Overhaul

**Evidence, confirmed problems, contract-correction plan, and implementation-ready UX design**

- **Date:** 2026-09-11
- **Status:** Direction A implemented and released
- **Accepted direction:** Direction A — Web-aligned mobile workspaces
- **Primary role:** Administrator
- **Primary mobile target:** `mobile/` (Expo/React Native)
- **Reference web target:** `next-frontend/` administrator routes
- **Backend authority:** `backend/`
- **Implementation performed from this document:** Complete Direction A mobile administrator overhaul, cross-client contract corrections, governed lifecycle integration, and Android release packaging

## 1. Target outcome

The administrator mobile application should become a durable operational tool rather than a collection of long, all-data scroll views.

The finished experience must:

1. Preserve the web administrator's procedures, permissions, terminology, backend side effects, and guarded action order.
2. Give mobile administrators all administrator capabilities that are currently reachable on the web, unless an explicit product decision records a justified platform exception.
3. Consume the same backend request and response contracts as the web without silently dropping fields.
4. Replace unbounded lists and multiplexed screens with searchable, server-paginated list, detail, form, review, and receipt workspaces.
5. Retain the current GABHS red-and-white identity, quiet surfaces, strong hierarchy, accessible controls, and logout placement at the bottom of the drawer.
6. Remain usable as school data, audit history, uploaded content, assessments, and academic records grow.

The governing principle is:

> Web and mobile may present the same operation differently, but they must not disagree about what can be done, what data is required, what the backend returns, what is preserved, or what sequence authorizes a consequential change.

## 2. Scope boundary

### Included

- Administrator navigation, home, notifications entry, and drawer organization.
- Users, user monitoring, user detail, user creation, profile updates, password reset, and lifecycle operations.
- Sections, classes, rosters, class details, schedules, enrolments, visibility, and lifecycle operations.
- Administrator assessment oversight and its contextual class flow.
- Calendar, roster import, class-record/transmutation administration, and user reports.
- Nexora Library, announcements, reports, evaluations, administrator AI assistant, audit trail, diagnostics, system settings, and profile.
- Mobile/web/backend request DTOs, response models, error envelopes, pagination, permissions, side effects, and action sequences used by these modules.
- Phone and tablet behavior for Android and iOS from the shared mobile source.
- Component, contract, navigation, accessibility, integration, and authenticated-device verification planning.

### Excluded

- Redesigning the web administrator flow.
- Changing academic policy, grading formulas, role ownership, or audit-retention rules.
- Making AI an authority for academic or administrative records.
- Shipping production code, database changes, an APK, or a release from this planning document.
- Treating current automated checks as proof of authenticated physical-device acceptance.

## 3. Evidence method and confidence labels

The audit used four evidence classes:

| Label | Meaning |
|---|---|
| **Confirmed** | Directly observed in current source, current tests, current route definitions, or official product/design documentation. |
| **Inferred risk** | A likely operational or usability consequence supported by current implementation structure, but not reproduced on an authenticated physical device. |
| **Proposed** | A design or contract solution that does not exist yet. |
| **Optional** | A later enhancement that is not required to reach safe web/mobile parity. |

The current repository was inspected at `developement` HEAD `c5170618`. Focused verification on 2026-09-11 produced:

| Check | Result | What it proves | What it does not prove |
|---|---:|---|---|
| `npm --prefix mobile run typecheck` | Pass | Current mobile TypeScript compiles. | Runtime API shape completeness or device UX. |
| Five focused mobile admin/navigation/API suites | 5 suites, 50 tests passed | Current primitives, route manifest, selected API adapters, and pagination helpers satisfy their present tests. | Full field parity, all actions, guarded lifecycle order, authenticated execution, or visual quality. |
| `npm --prefix backend test -- --runInBand src/common/contracts/client-route-contract.spec.ts` | 1 test passed | Every literal client URL/method found by the test maps to a Nest controller route. | DTO equality, response-field equality, semantic permission parity, or equivalent side effects. |

No authenticated administrator emulator or physical-device walkthrough was performed for this planning audit. Runtime findings are therefore not claimed where only source and automated evidence exist.

## 4. Frozen contract

The redesign must not silently change the following:

### Authority and permissions

- Backend remains the authority for authentication, role-based access, academic state, audit history, lifecycle safety, and durable operations.
- Administrator-only operations remain backend-protected; hiding a mobile control is not authorization.
- Web uses its existing cookie/access-token model; mobile continues to use bearer tokens and secure storage.
- Mobile and web never call `ai-service` directly.

### Academic procedures

- Server-provided academic policy periods are rendered as returned. The mobile app must not invent unconditional Q1-Q4 labels.
- Assessment authoring, release, attempts, grading, finalization, year transition, recovery, and learner completion remain governed by current backend policy.
- Existing preview, blockers, warnings, confirmations, password evidence, manifest hash, expiry, idempotency key, preserved-record list, and operation receipt remain authoritative where provided.
- A visual simplification must never bypass a review or confirmation step.

### Data and audit behavior

- Archival, suspension, restoration, transfer, completion, withdrawal, and purge retain their current meanings.
- Historical evidence must remain visible and auditable; the client must not hide invalid data by display-only clamping.
- Existing `success` / `message` / `data` envelope semantics remain unless an intentionally versioned backend change replaces them across both clients.
- Pagination totals, status counts, and server ordering remain authoritative.

### Established product direction

- GABHS red/white is the administrator accent system.
- The drawer remains the primary broad navigation mechanism because the role has too many domains for a truthful bottom bar.
- Profile is separated at the drawer footer and logout remains at the bottom.
- Reduced motion and platform safe areas remain respected.

## 5. Decision ledger

| Area | Decision | Reason |
|---|---|---|
| Backend-owned workflows | **Frozen** | Mobile must follow the same action graph as web. |
| Admin drawer | **Keep, reorganize** | It scales better than a crowded bottom bar, but its categories must mirror web. |
| Home | **Change** | Convert from metrics plus four shortcuts into an attention-oriented operational overview. |
| `AdminToolsScreen` | **Replace** | Eleven unrelated domains and shared form state in one 365-line component are not maintainable. |
| `AdminAcademicScreen` | **Split** | A 619-line multi-procedure scroll view obscures routine versus high-risk work. |
| Flat sections and rows | **Keep, refine** | Current low-elevation direction is appropriate, but rows need safer action ownership and virtualization. |
| Deep-blue mobile admin accent | **Change** | It conflicts with the web administrator's red/white tokens and established GABHS direction. |
| Cross-class Assessments drawer root | **Move to contextual shortcut** | Web administration reaches assessment work through classes; mobile must not create a second procedure. |
| Class Templates drawer root | **Move under Classes** | Web exposes templates contextually from Classes rather than as a primary category. |
| Academic drawer root | **Move under System Settings** | Web already groups academic-year, grading, transition, completion, and recovery by task. |
| All-pages client loading | **Remove** | It converts pagination into memory/battery/network growth and prevents long-term scale. |
| High-risk offline writes | **Disallow** | Preview and execution must use fresh server state and cannot be safely queued. |
| Mobile-only consolidated read views | **Allowed** | A shortcut may aggregate or summarize data if it opens the canonical web-equivalent action flow and does not invent mutations. |

## 6. External product evidence

Only official product or platform documentation was used for the primary design evidence below. Product patterns are not copied blindly; each is filtered through Nexora's requirement to preserve web procedures.

### 6.1 Administrator products

| Product | Officially documented pattern | Relevant lesson for Nexora | Boundary |
|---|---|---|---|
| [Microsoft 365 Admin mobile app](https://learn.microsoft.com/en-us/microsoft-365/admin/admin-overview/admin-mobile-app?view=o365-worldwide) | Home combines search, Message Center, service health, and quick links; the app manages users, groups, licences, support, health, and notifications. | Home should lead with operational attention, health, and recent work rather than a dense module grid. Global search and notification entry should be obvious. | Microsoft can leave some advanced features elsewhere; Nexora cannot use that as justification for unrecorded parity gaps. |
| [Shopify Admin](https://help.shopify.com/en/manual/shopify-admin) and [Shopify mobile app](https://help.shopify.com/en/manual/shopify-admin/shopify-app) | Mobile supports core store operations and analytics; permissions determine which areas are visible. | Keep role-aware navigation and focus each workspace on a concrete task. Hide forbidden areas, but always enforce permission on the server. | Shopify's desktop-only advanced settings pattern is not adopted where Nexora requires mobile capability parity. |
| [Square Dashboard app](https://squareup.com/help/us/en/article/5618-get-started-with-the-square-dashboard-app) | A customizable dashboard highlights insights and tasks; location filtering is contextual; main navigation is intentionally limited. | Nexora Home should show items requiring attention and a stable school/academic context. Broad module breadth belongs in the drawer, not a crowded bar. | Nexora will keep a fixed role-owned information architecture rather than user-configurable authorization surfaces. |
| [Square Dashboard](https://squareup.com/us/en/point-of-sale/features/dashboard) | Quick insights and tasks needing attention are treated as different from deep administration. | Separate overview signals from full workspaces. A metric becomes useful only when it links to the records explaining it. | No decorative metric cards without a decision or destination. |
| [WooCommerce mobile](https://woocommerce.com/documentation/woocommerce/mobile/mobile-ios/) | A small set of primary destinations is supplemented by a Menu; lists support search and filtering. | Use grouped secondary navigation and reusable server-backed list controls. | Nexora has more high-risk workflows, so review and receipt screens are additionally required. |
| [WooCommerce mobile notifications](https://woocommerce.com/document/woo-mobile-notifications/) | Notification types and thresholds can be configured to reduce noise. | Surface actionable admin notifications and let backend policy determine importance; avoid permanent global warning banners. | Notification preferences must not suppress critical security or academic lifecycle evidence. |
| [WordPress mobile editing](https://wordpress.com/support/edit-your-site-on-mobile/) | Four primary areas, a secondary site switcher, and resilience guidance for unstable connections. | Keep stable primary structure, make current school year/period context visible, and preserve safe non-sensitive drafts where feasible. | Passwords, LRN data, manifest credentials, and sensitive execution evidence must not be stored as casual local drafts. |

### 6.2 Platform and accessibility evidence

| Source | Evidence | Nexora application |
|---|---|---|
| [Android responsive navigation](https://developer.android.com/develop/ui/views/layout/build-responsive-navigation) | Compact layouts use a small bottom bar only for a few destinations; broader navigation uses drawers, while larger layouts can use rails or persistent drawers. | Keep the drawer on phones; use a navigation rail or persistent drawer on wider tablets. Do not place sixteen admin destinations in a bottom bar. |
| [Android adaptive app guidance](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps) | List-detail patterns can show one pane on compact screens and two panes on expanded screens. | Phone: list pushes detail. Tablet: list and selected detail can coexist without changing the route/action model. |
| [Android adaptive dos and don'ts](https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts) | Layouts should respond to available window size instead of device labels. | Use window-size classes, including split-screen, rather than `isTablet` assumptions. |
| [Android accessibility for views](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) | Android recommends touch targets of at least 48dp. | Raise administrator buttons, chips, icon buttons, and row action targets from the current 44dp floor to at least 48dp. |
| [WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | Target-size criteria establish minimum and enhanced pointer-area expectations. | Treat 48dp as the mobile implementation floor and preserve spacing between adjacent destructive and routine actions. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Reflow, visible focus, consistent navigation, error identification, and accessible names are required principles. | Support large text, predictable Back behavior, visible selected states, meaningful labels, and errors attached to the relevant field. |
| [Apple search guidance](https://developer.apple.com/design/human-interface-guidelines/searching) | Search should have a clear location and scope. | Use domain-local search by default; show the active scope and filters. A later global search must label its module and school context. |
| [Apple toolbar guidance](https://developer.apple.com/design/human-interface-guidelines/toolbars) | Toolbars should not be overcrowded. | One primary action in the header; secondary actions live in an overflow menu or detail action sheet. |
| [Apple alerts guidance](https://developer.apple.com/design/human-interface-guidelines/alerts) | Alerts are interruptive and should clearly communicate consequential decisions. | Use alerts for simple destructive confirmation only. Use a full review screen for lifecycle manifests, blockers, preserved evidence, and password confirmation. |
| [Apple loading guidance](https://developer.apple.com/design/human-interface-guidelines/loading) and [progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators) | Loading feedback should match whether duration is known and should preserve context. | Use skeleton rows for initial lists, pull-to-refresh for refresh, inline progress for uploads/imports, and a durable operation state for long-running work. |
| [Apple writing guidance](https://developer.apple.com/design/human-interface-guidelines/writing) | Interface copy should be direct, contextual, and recovery-oriented. | Replace technical labels such as “Start ISO timestamp” with school-language labels, examples, validation, and a date/time picker. |
| [Android offline-first data layer](https://developer.android.com/topic/architecture/data-layer/offline-first) | Read models can use local data as a source while synchronizing with the network. | Permit clearly timestamped cached read-only lists. Require a live refresh before high-risk preview or execution; never queue academic or purge actions. |

### 6.3 Administrative security evidence

| Source | Evidence | Nexora application |
|---|---|---|
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | Reauthentication is appropriate for high-risk actions and should be applied with clear context. | Keep current-password evidence for governed lifecycle operations and other security-sensitive changes. |
| [OWASP Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html) | Significant transaction data should be shown to the user; authorization must be server-enforced, sequential, time-limited, and tied to final execution. | Preserve preview → manifest review → confirmation/password → execute. Bind execution to the returned hash, expiry, confirmations, and idempotency key. |
| [OWASP Mobile Application Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mobile_Application_Security_Cheat_Sheet.html) | The client cannot be trusted; tokens need secure storage and sensitive operations need backend authorization. | Mobile controls are affordances only. Keep secure token storage and do not store passwords or execution credentials in form persistence. |

## 7. Current administrator information architecture

### 7.1 Web administrator navigation

The current web sidebar in `next-frontend/src/components/layout/Sidebar.tsx` defines:

1. **Overview:** Dashboard, Diagnostics.
2. **School Setup:** Users, Sections, Classes, Calendar, Roster Import, Class Record, User Reports.
3. **Content & Comms:** Nexora Library, Announcements.
4. **Insights & AI:** Reports, Evaluations, AI Chatbot, Audit Trail.
5. **Account:** System Settings, Profile.

Contextual web destinations include Class Templates from Classes and assessment work inside class detail.

### 7.2 Current mobile administrator navigation

The current mobile drawer in `mobile/src/navigation/role-drawer-model.ts` defines:

1. **Overview:** Home only.
2. **People & learning:** Users, Classes & sections, Roster import, Assessments, Announcements, Evaluations.
3. **School operations:** Academic, Calendar, Class templates, Library.
4. **Oversight:** Reports, Audit log, Diagnostics, System settings.
5. **Footer:** Profile.

### 7.3 Confirmed navigation differences

| Difference | Classification | Consequence |
|---|---|---|
| Mobile combines Classes and Sections; web separates them. | Confirmed | Filters, create state, lifecycle behavior, and detail ownership compete on one screen. |
| Mobile makes Assessments a primary root; web treats assessment administration as class-context work. | Confirmed | Mobile can become a second action flow instead of a shortcut to the canonical class flow. |
| Mobile makes Class Templates a primary root; web reaches templates from Classes. | Confirmed | The same domain has two different mental models. |
| Mobile makes Academic a primary root; web groups procedures under System Settings. | Confirmed | Routine settings, annual operations, recovery, and account security are mixed differently. |
| Mobile lacks primary destinations for Class Record, User Reports, and AI Chatbot. | Confirmed | Administrator capability is incomplete. |
| Diagnostics is not grouped with Home on mobile. | Confirmed | Operational status is separated from the overview model used by web. |
| Notifications has a stack route but no clear administrator header/drawer entry. | Confirmed | Actionable system messages are technically routable but not discoverable in normal admin navigation. |

## 8. What “1:1 contract parity” means

For this project, parity is not satisfied merely because both clients can call a route with the same URL.

A web/mobile administrator contract is 1:1 only when all of the following agree:

1. **Endpoint and method:** Both clients call the same authoritative backend operation or an explicitly documented equivalent.
2. **Request shape:** Field names, optionality, nullability, formats, validation, and sanitization agree.
3. **Response shape:** Both clients retain every documented field, including nested records, totals, status counts, warnings, and operation evidence.
4. **Envelope and errors:** Success, message, data, validation errors, blocking reasons, delivery warnings, and retryability are interpreted consistently.
5. **Permission:** Backend roles and client affordances agree; server enforcement remains decisive.
6. **Action order:** Preview, review, confirmation, reauthentication, execution, receipt, and refresh occur in the same semantic sequence.
7. **Side effects:** Creation, audit logging, notifications, archival, preservation, and invalidation have the same meaning.
8. **Freshness:** Both clients respect server pagination, sorting, academic version, manifest expiry, and stale-data rejection.

Presentation may differ. For example, a web table may become a mobile list and a desktop modal may become a full-screen mobile review route. The underlying contract and procedure may not differ.

## 9. Confirmed problem register

### Critical

#### ADM-MOB-001 — Mobile bypasses the governed lifecycle action graph

- **Type:** Contract and safety defect.
- **Evidence:** Web class/section flows call `next-frontend/src/services/admin-lifecycle-service.ts`, using preview and execute endpoints. Mobile `AdminClassesScreen.tsx` still calls `classesApi.toggleStatus()` and `sectionsApi.update({ isActive })` directly.
- **Impact:** Mobile does not present blockers, warnings, effects, preserved records, required confirmations, password evidence, hash expiry, reason code, idempotency, or operation receipt.
- **Required correction:** Implement the same lifecycle request and response types in mobile and route all administrator class/section/student/purge actions through the backend-governed workflow. Do not remove old backend routes until every legitimate non-admin consumer is understood.

#### ADM-MOB-002 — Student creation omits grade level and backend creation is non-atomic

- **Type:** Request-contract and onboarding defect.
- **Evidence:** Backend `CreateUserDto` accepts LRN for students but not `gradeLevel`. Web creates the user, then calls profile update with grade level. Mobile create-user UI does not collect or perform that second update.
- **Impact:** A mobile-created student can exist without the grade-level field required by the established web procedure.
- **Required correction:** Add an intentionally versioned `gradeLevel` field to the backend creation contract, validate it for student roles, create the student profile atomically in the user transaction, and migrate both web and mobile to the same one-call procedure. If atomic backend work is deferred, mobile must temporarily reproduce the web two-call flow with explicit rollback/error recovery; this is not the preferred durable design.

### High

#### ADM-MOB-003 — Administrator route coverage is incomplete

- **Missing normal mobile destinations:** Class Record administration, User Reports, and Admin AI Chatbot.
- **Incomplete settings destinations:** Overview, Academic Year, Assessments & Grading, Year Transition, Learner Completion, and Audit & Recovery are not separate mobile task workspaces.
- **Impact:** Core web administrator work is absent or buried inside unrelated mobile pages.

#### ADM-MOB-004 — Mobile user response types drop backend/web fields

- **Missing from `mobile/src/types/user.ts`:** `graduatedAt`, `contactNumber`, `department`, `specialization`, `employeeId`, `profile`, and `teacherProfile`.
- **Password-reset gap:** Mobile omits `emailDeliveryStatus` and `emailDeliveryError`, then always shows only the generated password.
- **Impact:** Detail screens cannot truthfully display the complete user record, and an administrator may miss that password reset succeeded but email delivery failed.

#### ADM-MOB-005 — User lifecycle and monitoring actions are incomplete

- **Web service capabilities absent from mobile admin service/UI:** monitoring report, export user, bulk lifecycle, and purge.
- **Impact:** Mobile cannot reach web-equivalent administrative oversight or completion paths.
- **Correction boundary:** Purge must use the governed lifecycle preview/execute flow, not a one-tap row action.

#### ADM-MOB-006 — Class contract and creation flow are incomplete

- `ClassItem` drops `gradingProfile` on mobile.
- Mobile hardcodes `30/50/20` weights and does not expose `academicWeightProfile`, `templateId`, card preset, or banner choices used by the web flow.
- Mobile lacks web lifecycle, bulk, hide, unhide, and purge operations.
- **Impact:** Mobile can create a valid but semantically different class and cannot represent all returned class configuration.

#### ADM-MOB-007 — Section contract and lifecycle flow are incomplete

- Mobile hardcodes capacity to `50`.
- Mobile lacks archive, restore, bulk lifecycle, hide/unhide, permanent-delete, and learner-completion/access-student operations exposed by web services.
- **Impact:** Mobile cannot reproduce the web section lifecycle or configuration choices.

#### ADM-MOB-008 — Reports are not a usable administrator workspace

- Mobile only renders System Usage through `JSON.stringify` and offers a CSV action.
- Mobile lacks Student Master List and typed models for the web report rows.
- Web exposes Class Record, Master List, Enrollment, Performance, Interventions, Assessments, and Usage views, with export behavior.
- **Impact:** Administrators must interpret raw wire data and cannot complete the web reporting flow.

#### ADM-MOB-009 — Evaluations expose only a subset of campaign and response behavior

- Mobile hardcodes `formType: "system"`, creates immediately active seven-day campaigns, and omits class selection and explicit start/end selection.
- Mobile does not load evaluation response rows or summary metrics and lacks module/date/audience filters.
- **Impact:** Mobile campaign creation and oversight are not semantically equivalent to web.

#### ADM-MOB-010 — Class-template administration stops at create/publish

- Mobile lacks template detail, compatibility, content editing, update/delete, import validation, import/export engine, module/lesson/assessment/announcement authoring, and assessment-image upload flows present in the web service and routes.
- **Impact:** “Class templates” in mobile is a partial status list, not the web workflow.

#### ADM-MOB-011 — Roster import omits pending-resolution work

- Mobile API already has preview, commit, pending, and resolve methods, but its screen exposes only section selection, preview summary, and commit.
- Pending rows are weakly typed compared with web.
- **Impact:** A normal post-import resolution state is not reachable from mobile.

#### ADM-MOB-012 — Data loading cannot scale

- Users, classes, sections, files, and audit are fetched across every page before rendering.
- Assessments and announcements create one query per class and aggregate client-side.
- Lists are mapped inside a whole-screen `ScrollView` instead of virtualized, paginated list components.
- **Impact:** Request count, memory, render cost, battery use, and refresh time grow with school data. Assessments and announcements have an N+1 request pattern.

### Medium

#### ADM-MOB-013 — Two monoliths own unrelated workflows

- `AdminToolsScreen.tsx`: 365 lines and eleven tool domains with shared `busy`, `showCreate`, search, filter, and form state.
- `AdminAcademicScreen.tsx`: 619 lines spanning period activation, transition, alignment, remediation, back subjects, and Grade 10 completion.
- **Inferred risk:** State leakage, accidental cross-domain resets, broad rerenders, difficult testing, and slower future changes.

#### ADM-MOB-014 — Row navigation and row actions have competing touch ownership

- `AdminDataRow` can be a parent `Pressable` while its `right` slot contains child `AdminButton` pressables.
- **Impact:** Accidental detail navigation and ambiguous screen-reader interaction are possible.
- **Correction:** A row is either one navigation target or a static container with separately labelled actions. Use an overflow action sheet when multiple actions exist.

#### ADM-MOB-015 — Touch targets are below the Android recommendation

- Current admin buttons, chips, header icons, clear-search control, and filter segments use a 44dp floor.
- Android recommends 48dp.
- **Correction:** Establish 48dp as the administrator component minimum and retest layouts with large text.

#### ADM-MOB-016 — Calendar input exposes transport formatting

- Mobile asks administrators for “Start ISO timestamp” and “End ISO timestamp.”
- **Impact:** A correct backend transport value becomes a manual user requirement, increasing validation errors.
- **Correction:** Use local date/time pickers, show timezone and readable summary, then serialize ISO only in the service adapter.

#### ADM-MOB-017 — Mobile admin visual identity diverges from web/GABHS

- `mobile/src/theme/admin.ts` uses deep blue `#24466F` as primary.
- Web admin tokens use red `#f70a10`, strong red `#d9070e`, soft red `#fff0f0`, white surfaces, and dark navy text.
- **Correction:** Align semantic mobile admin tokens to the existing web administrator red/white system. Keep status colors semantic and never use red status coloring as the only indicator.

#### ADM-MOB-018 — Home underuses its contract and lacks a true attention model

- The overview response includes admins, sections, active classes, enrolments, usage, analytics, and readiness; current Home shows four totals plus readiness.
- Notifications are not visibly reachable from the administrator header.
- **Correction:** Show current school context, actionable exceptions, recent operations, notification count, and linked evidence. Move secondary totals behind “View details.”

#### ADM-MOB-019 — Assessment and announcement inventories fan out by class

- The current cross-class views first load all classes, then execute one request per class.
- **Required backend decision:** Provide server-paginated administrator inventory endpoints or extend existing endpoints with admin-safe cross-class query/filter support, then update both web and mobile consumers where useful.

#### ADM-MOB-020 — Existing tests overstate parity if read without their boundary

- The route-contract test checks method/path existence only.
- Current mobile workspace tests assert source strings and primitive usage.
- Pagination tests explicitly prove that all pages are downloaded, which is correctness for the current adapter but the opposite of the target scalable list design.
- **Correction:** Add schema, action-graph, field-retention, permission, pagination, and authenticated-flow tests.

## 10. Module-by-module parity matrix

| Administrator domain | Web authority and flow | Current mobile state | Contract/capability gap | Target mobile state |
|---|---|---|---|---|
| Home | `/dashboard/admin`; overview, usage, analytics, readiness, destinations | Overview metrics, four rows, readiness | No notifications entry, operation receipts, complete overview use, or attention queue | Current context + attention items + recent operations + concise totals; every signal opens its records |
| Diagnostics | `/dashboard/admin/diagnostics`; liveness/readiness | Liveness/readiness inside `AdminToolsScreen` | Navigation grouping and dedicated states | Dedicated workspace under Overview with dependency detail and refresh evidence |
| Users | list → create/detail → update/reset/lifecycle/export/monitor | All-users load, create subset, inline actions | Missing fields, detail, monitoring, bulk/export/purge, reset-delivery state, grade level | Paginated list → detail; role-specific create; monitoring tab; governed lifecycle review |
| Sections | list → create/detail/edit/roster/access-students/lifecycle | Combined classes/sections list; basic create/edit; teacher detail reuse | Hardcoded capacity; missing actions and lifecycle | Dedicated paginated workspace; detail tabs; same preview/execute flow as web |
| Classes | list → create/templates/detail/edit/students/lifecycle | Combined list; hardcoded weights; direct toggle | Missing fields/options/bulk/hide/purge; unsafe action order | Dedicated list; guided create matching web fields; templates contextual; governed lifecycle |
| Assessments | Contextual within admin class detail | Cross-class root plus teacher flows | Extra primary route; type fields missing; N+1 inventory | Optional read-only shortcut; all create/edit/grade actions enter canonical class flow |
| Calendar | Readable form → create/update/delete | Method parity; raw ISO form | UX and validation mismatch | Date/time pickers, timezone summary, readable recurrence/type states; same service methods |
| Roster Import | section → file → preview categories → commit → pending resolution | Section → preview summary → commit | Pending/resolve omitted; weak types | Full review tabs for valid/pending/errors; commit receipt; pending-resolution queue |
| Class Record | Transmutation settings and contextual academic records | Teacher class-record operations; active table read only | No admin transmutation list/preview/apply/activate | Dedicated admin settings workspace with same guarded web procedures |
| User Reports | Monitoring/search/status/role activity view | Missing | Entire destination absent | Dedicated paginated monitoring report with detail links and export |
| Library | Full folder/file/upload/metadata/move/delete/download/retry workspace | File list, open, retry only | UI omits most existing service methods | Folder list/detail, upload queue, metadata form, move/delete review, indexing status |
| Announcements | Class-context create/update/delete/core release | Cross-class aggregate, create/update/delete | N+1; missing get-by-id/core release surface and nested class data | Server-paginated inventory; detail/editor enters canonical class context; explicit release state |
| Reports | Seven typed report views plus CSV/PDF behavior | Raw System Usage JSON plus CSV | Missing typed models, Master List, six views, PDF | Report chooser → filters → readable summary/list/detail → server-audited export |
| Evaluations | Campaign configuration + response list/summary/filter/status | Campaign list, hardcoded create, status toggle | Fields and response oversight omitted | Campaign list/detail/create matching web; response analytics tab; date/module/audience filters |
| Admin AI Chatbot | Health, conversations, session load/rename/delete, message, sources, charts, data views, actions | Missing | Entire service/screen absent | Mobile conversation list/detail with source links and action routes; AI remains assistive |
| Audit Trail | Server paging, actor/action/date filters, export | Fetch-all, client search, rows | No server date/actor filters, paging, detail, export | Virtualized paginated audit list; filters; metadata detail; export; immutable ordering |
| System Settings | Overview plus five task routes | One settings row into 619-line Academic screen + password form | IA differs; high-risk and routine tasks mixed | Six task workspaces mirroring web; password remains Profile/Account security, not academic settings |
| Profile | Profile edit, password/security, sign out | Near parity | Verify field/error parity; drawer footer behavior | Dedicated profile/security; logout fixed at drawer bottom |
| Class Templates | Contextual from Classes; deep authoring routes | Primary drawer list; create/publish only | Nearly all authoring absent | Contextual Classes destination with list/detail/editor stack matching web actions |
| Notifications | Central notification inbox | Generic stack route, no visible admin entry | Discoverability | Header bell with unread count; compact prompt; full inbox for details |

## 11. Accepted information architecture

The mobile drawer will mirror the web administrator categories and labels.

### Overview

- Home
- Diagnostics

### School Setup

- Users
- Sections
- Classes
- Calendar
- Roster Import
- Class Record
- User Reports

### Content & Comms

- Nexora Library
- Announcements

### Insights & AI

- Reports
- Evaluations
- AI Chatbot
- Audit Trail

### Account

- System Settings

### Drawer footer

- Profile
- Logout at the bottom

### Contextual destinations

- **Class Templates:** Classes → overflow/header action → Class Templates.
- **Assessment oversight:** Classes → class detail → Assessments. Home may link to a cross-class read-only inventory, but mutations route into the selected class's canonical stack.
- **Academic records:** Classes → class detail → Class Record for record-specific work.
- **Learner completion:** System Settings → Learner Completion, with section/student detail links.

## 12. Navigation contract

### 12.1 Phone route behavior

- Drawer selection resets only the selected domain root, not the entire authenticated role stack.
- List item opens detail with `push`.
- Detail edit opens a nested screen or full-screen modal depending on form complexity.
- Simple filters use a bottom sheet; consequential reviews use a full screen.
- Back closes the topmost overlay first, then returns to detail, then list, preserving list search, filters, page cursor, scroll position, and selected tab.
- Android hardware Back follows the same stack contract as the visible header Back.
- At an administrator drawer root, Back follows the established application/root behavior; it must not jump to an unrelated previous domain because of hidden-tab history.

### 12.2 Tablet route behavior

- At expanded widths, drawer may become persistent or a rail.
- List and detail use a two-pane layout when there is sufficient width.
- Selecting another row replaces the detail pane without discarding list state.
- Edit and high-risk review remain explicit routes/overlays so the same deep link and Back semantics work on phone.

### 12.3 Direct-entry and recovery behavior

- A valid deep link to a detail loads the record by ID and constructs the correct administrator breadcrumb/root fallback.
- A missing or unauthorized record shows a scoped not-found/permission state with a return-to-domain action.
- Legacy route names remain temporary aliases during migration so update/deep-link history does not strand users.
- After alias telemetry and tests prove migration, obsolete aliases may be removed in a separate change.

### 12.4 Form cancellation

- Back from a clean form returns immediately.
- Back from a dirty form prompts: Continue editing, Discard changes, or Stay.
- High-risk review credentials are always cleared on cancel, backgrounding, expiry, or manifest invalidation.
- Successful creation returns to the new record detail or originating list according to the equivalent web flow and refreshes only affected query families.

## 13. Core action graphs

### 13.1 Create student

`Users → New user → Role: Student → Identity → LRN + grade level → Review → Create → Success/detail`

- Same validation and sanitization as web.
- Preferred backend transaction creates user, role, and student profile including grade level atomically.
- Failure preserves non-sensitive form values and attaches backend errors to fields.
- Generated credentials and email delivery state are shown accurately and only as allowed by the existing security procedure.

### 13.2 Archive/complete/drop/transfer class

`Classes → Class detail → More actions → Choose resolution → Preview → Review manifest → Confirm requirements + password + reason → Execute → Operation receipt`

- Preview displays effects, preserved records, blockers, warnings, academic state, expiry, and confirmation text.
- Unsafe manifests cannot advance.
- Any input change invalidates the old manifest and requests a new preview.
- Execution uses the returned hash and a unique idempotency key.
- Receipt displays changed entities, preserved entities, replay status, and audit/operation identifiers.

### 13.3 Archive or resolve section learners

`Sections → Section detail → Lifecycle → Assign learner resolutions → Preview → Review → Authenticate/confirm → Execute → Receipt`

- Per-learner destination requirements are explicit.
- Bulk selection cannot hide individual blockers.
- Exiting before execute changes nothing.

### 13.4 Roster import

`Roster Import → Select section → Choose file → Upload/parse → Review Valid | Pending | Errors → Commit reviewed rows → Commit receipt → Resolve pending rows`

- Error rows never silently disappear.
- Commit is disabled until blocking errors are resolved or excluded through an allowed backend procedure.
- Pending rows remain reachable after leaving the import screen.

### 13.5 Academic period and year transition

`System Settings → Academic Year or Year Transition → Current state → Preview → Blockers/readiness → Required confirmations → Authenticate → Execute → Audit receipt`

- Server-provided policy labels and periods are rendered unchanged.
- Routine current-state reading is separate from annual transition and recovery.

### 13.6 Reports

`Reports → Choose report → Set server filters → View summary/list → Open row detail when available → Export → Share/save receipt`

- No raw JSON is shown as the main UI.
- Export uses backend-produced official data and surfaces server filename/errors.

## 14. Target screen specifications

### 14.1 Home

Order the screen by decisions, not by database tables:

1. Compact header: school context, notification bell/unread count, refresh.
2. Current academic state: school year, active period, version/freshness.
3. Needs attention: degraded dependency, pending roster rows, blocked lifecycle operation, failed email delivery, stale/invalid school configuration, or other backend-supported exceptions.
4. Recent operations: latest governed operation receipts and audit links.
5. School snapshot: concise Users, Sections, Active Classes, and Enrolments; each opens its filtered workspace.
6. Optional usage details behind progressive disclosure.

Home must not become a second navigation drawer or a grid of decorative cards.

### 14.2 Reusable list workspace

Every large domain uses:

- Header with title, one primary action, and optional overflow.
- Search with clear scope.
- Filter summary and filter sheet.
- Server-paginated `FlatList`/equivalent virtualization.
- Stable row identity and cursor/page state.
- One row navigation target; actions live in an accessible overflow sheet.
- Initial skeleton, refresh indicator, loading-more footer, true-empty state, filtered-empty state, and retry state.
- Result count from the server, not `array.length` when pagination is active.

### 14.3 Detail workspace

- Identity/status header.
- Task tabs or anchored sections only when more than one distinct task exists.
- Summary first, technical metadata under disclosure.
- Sticky or bottom-safe primary action only when the screen has a clear next step.
- Overflow menu separates routine edit from destructive/lifecycle work.
- Audit/history link where the backend exposes evidence.

### 14.4 System Settings

Mirror the current web task decomposition:

1. **Overview:** current state and task chooser.
2. **Academic Year:** review/change active period using preview and authorization.
3. **Assessments & Grading:** policy and readiness; no unrelated lifecycle actions.
4. **Year Transition:** readiness, impact, teacher reminders, transition execution.
5. **Learner Completion:** Grade 10 completion, outcomes, back subjects, clearances, and linked learner evidence.
6. **Audit & Recovery:** state alignment, corrections, recovery manifests, and history.

Each screen gets a short question-mark helper or concise contextual explanation for consequential concepts. Help content must explain purpose, prerequisites, effect, and recovery—not restate the field label.

## 15. Visual and component-system delta

### 15.1 Semantic tokens

Use named administrator tokens rather than direct colors in screens:

| Token | Target source/direction |
|---|---|
| `admin.bg` | Quiet warm/light page background. |
| `admin.surface` | White. |
| `admin.surfaceMuted` | Soft neutral for grouped secondary content. |
| `admin.border` / `borderStrong` | Existing low-contrast web admin outlines. |
| `admin.text` | Existing dark navy/near-black administrator text. |
| `admin.subtext` / `muted` | Accessible cool gray hierarchy. |
| `admin.primary` | Web admin red `#f70a10`. |
| `admin.primaryPressed` | Web strong red `#d9070e`. |
| `admin.primarySoft` | Web soft red `#fff0f0`. |
| success/warning/error/info | Semantic colors, each paired with icon/text. |

Red is the brand/action accent. It must not make all primary actions look destructive. Destructive actions use explicit wording, an alert icon, and contextual confirmation; routine primary actions use the brand red with affirmative labels.

### 15.2 Layout

- Base horizontal gutter: 16dp compact, 20-24dp medium/expanded.
- Section spacing: 16-24dp according to hierarchy, not a card around every group.
- Flat divided surfaces remain the default.
- Elevation is reserved for overlays, menus, and sticky action surfaces.
- Avoid horizontal scrolling for essential filter choices. Move large filter sets into a sheet.
- Keep visible actions per row to one affordance; use overflow for more.

### 15.3 Typography

- Screen title: 20-24sp, strong but not oversized.
- Section title: 15-17sp.
- Body/row title: at least 14sp where possible.
- Metadata: at least 12sp with sufficient contrast.
- Do not cap dynamic type so tightly that administrator content becomes inaccessible. Test at the largest supported accessibility size and reflow instead of truncating required evidence.

### 15.4 Controls

- Minimum interactive target: 48x48dp.
- Inputs use visible labels; placeholders are examples only.
- Date, time, role, status, school year, period, class, section, and teacher use controlled pickers/selectors rather than free-form transport values.
- Destructive and routine controls are spatially separated.
- Status always combines text/icon with color.
- Password fields support show/hide, prevent accidental persistence, and clear on background/cancel.

### 15.5 Component ownership

Replace the single primitive file's broad responsibility with focused components:

- `AdminScreenShell`
- `AdminWorkspaceHeader`
- `AdminPaginatedList`
- `AdminSearchField`
- `AdminFilterSheet`
- `AdminListRow`
- `AdminRowActionSheet`
- `AdminStatusLabel`
- `AdminEmptyState`
- `AdminErrorState`
- `AdminSkeletonList`
- `AdminContextHelp`
- `AdminReviewManifest`
- `AdminOperationReceipt`
- `AdminFormSection`
- `AdminDateTimeField`

The exact filenames may adapt to repository conventions, but each component must have one semantic job and dedicated tests.

## 16. Responsive sketches

### Compact phone

```text
┌──────────────────────────────┐
│ ☰  Users                 🔔  │
│ Search users…                 │
│ [Role] [Status] [Grade]       │
├──────────────────────────────┤
│ Juan Dela Cruz          ⋮     │
│ Student · Grade 8 · Active    │
├──────────────────────────────┤
│ Ana Santos              ⋮     │
│ Teacher · Science · Active    │
├──────────────────────────────┤
│ Loading more…                 │
└──────────────────────────────┘
```

### Expanded tablet

```text
┌────────────┬──────────────────┬─────────────────────────┐
│ Navigation │ Users            │ Juan Dela Cruz          │
│            │ Search + filters │ Student · Grade 8       │
│ Overview   │                  │                         │
│ School     │ Juan Dela Cruz   │ Identity and profile    │
│ Setup      │ Ana Santos       │ Access and status       │
│ Content    │ ...              │ Activity and history    │
│ Insights   │                  │                         │
│ Account    │                  │ Edit              ⋮     │
└────────────┴──────────────────┴─────────────────────────┘
```

The same route IDs and backend operations drive both layouts.

## 17. State matrix

| State | Required behavior |
|---|---|
| Initial loading | Preserve header and filters; show skeleton rows, not an empty message. |
| Background refresh | Keep current records visible with a compact refresh indicator and last-updated context. |
| Loading next page | Show an inline footer; prevent duplicate requests. |
| True empty | Explain what the domain is and show one allowed first action. |
| Filtered empty | State that filters caused zero results and offer Clear filters. |
| Recoverable error | Keep safe prior data, show scoped error and Retry. |
| Validation error | Attach message to the field; focus/announce the first invalid field; preserve other values. |
| Permission denied | Explain access boundary and return to the nearest allowed administrator root. Do not imply missing data. |
| Offline cached read | Display last-updated timestamp and an offline label. Disable operations that require live state. |
| Offline write | Do not queue lifecycle, academic, password, purge, role, or roster commit actions. Explain that a connection is required. |
| Stale manifest | Block execution, clear credentials, and request a new preview. |
| Long-running operation | Show durable status keyed by operation ID and support safe leave/return. |
| Partial success | Display succeeded and failed records separately with reasons and retry eligibility. |
| Email delivery failure | State that reset/create succeeded but email delivery failed; provide the backend-approved recovery action. |
| Long content | Wrap required evidence; allow disclosure for technical metadata; never truncate blockers/confirmations. |
| Large text | Reflow controls vertically; no clipped action labels or hidden confirmations. |
| Keyboard visible | Keep focused field and primary action reachable; respect keyboard and safe-area insets. |
| Reduced motion | Use no essential motion; remove nonessential transitions while preserving state feedback. |

## 18. Contract-correction architecture

### 18.1 Backend remains canonical

Do not solve drift by copying the current web interfaces into mobile. Some web interfaces can also drift. The backend's versioned DTO/response schema is the source of truth.

### 18.2 Generate or share transport contracts

The backend already includes Nest Swagger support. The durable approach is:

1. Add complete request and response annotations/DTOs for administrator endpoints, including nested envelopes and error shapes.
2. Generate a stable OpenAPI artifact in CI.
3. Generate or validate TypeScript transport types for both `next-frontend` and `mobile` from the same artifact.
4. Keep platform-specific adapters only for transport concerns such as file URIs, blobs, downloads, dates, and secure tokens.
5. Prevent handwritten screen models from redefining transport response shapes.

If code generation is not adopted immediately, introduce a shared contract package as an interim measure. It must be backend-owned and consumed by both clients; two copied files are not a shared contract.

### 18.3 Preserve domain models separately

Generated transport types should not force UI code to render raw envelopes. Each platform may map a canonical response into a view model, provided that:

- Mapping is explicit and tested.
- No backend field is accidentally discarded.
- Display-only transformations do not alter authority.
- Unknown enum values have a safe visible fallback rather than being coerced to a valid state.
- Dates remain ISO at the transport boundary and become local display values only in presentation helpers.

### 18.4 Contract parity manifest

Create a machine-readable administrator parity manifest during implementation with:

- Web route.
- Mobile route.
- Backend endpoints and methods.
- Request and response schema names.
- Required roles.
- Action graph ID.
- Known platform adapter.
- Test file proving parity.

CI should fail when a required administrator web route or action has no mobile mapping, except for an explicitly documented and approved exception.

### 18.5 Error parity

Both clients must preserve:

- HTTP status.
- Backend error code.
- User message.
- Field errors.
- Blocking reasons.
- Warnings.
- Retryability.
- Operation/audit IDs.
- Partial-success details.
- Email delivery status.

A generic “Unable to save” may be a fallback, never the only representation when structured backend evidence exists.

## 19. Required backend/API corrections

### Required for correctness

1. **Atomic student creation:** Add validated student grade level to the user creation command and create the profile atomically. Update web and mobile together.
2. **Complete response DTOs:** Define/document user, class, section, assessment, reports, evaluation, lifecycle, audit, and template response shapes for shared generation/validation.
3. **Governed mobile lifecycle:** No new lifecycle backend semantics are required; mobile must consume current preview/execute endpoints. Add any missing response annotations and mobile-safe operation retrieval.
4. **Cross-class administrator inventories:** Provide paginated/filterable assessment and announcement inventory endpoints, or an equivalent backend query contract, to eliminate one-request-per-class aggregation.

### Required for scale or complete web capability

5. Confirm server pagination/filter/sort contracts for users, sections, classes, library, audit, reports, campaigns, and pending roster imports.
6. Ensure user monitoring, exports, evaluation responses/summary, class-template authoring, transmutation administration, and admin chat endpoints have complete schemas and Admin role tests.
7. Return stable action capability/blocking metadata where mobile currently guesses whether a control should be enabled.

### Compatibility strategy

- Additive response fields are tolerated by old clients but must be added to generated/shared client types before new UI depends on them.
- Request changes that alter validation or side effects require coordinated web/mobile release work.
- Keep legacy direct lifecycle endpoints until all consumers are traced; block or deprecate unsafe administrator use only after mobile migration is verified.
- Database migrations, if any, must be additive and independently reversible.

## 20. Performance and data-loading contract

### Lists

- Default server page size: 25-50 records, chosen per row weight.
- Use stable server sort and cursor/page parameters.
- Search is server-backed and debounced; filters reset pagination.
- Never download every page merely to display the first screen.
- Use virtualized rendering with stable keys and bounded retained pages.
- Refresh invalidates only the affected domain and summary counters.

### Fan-out removal

- Cross-class assessment and announcement screens must issue a constant number of page requests, not one request per class.
- Home should consume one overview/attention contract rather than refetch every module.
- Opening a detail may fetch its own richer record; list payloads remain compact.

### Images and files

- Load thumbnails only when visible.
- Uploads expose per-file progress, failure, retry, and cancellation.
- Downloads use backend filenames and platform share/open adapters.
- Large file content is never held as a rendered raw string.

## 21. Implementation slices

The order below separates contract/safety work from visual refactoring so cosmetic progress cannot mask unsafe behavior.

### Slice 0 — Freeze the parity inventory

| Field | Plan |
|---|---|
| Owner | Web admin route inventory, mobile route manifest, backend controller inventory, new parity manifest/test |
| Change | Encode every row in Section 10 as a required mapping with an explicit status. |
| Preserved | Existing routes and permissions. |
| Navigation | No visible change. |
| States | Missing mapping fails CI with the domain/action named. |
| Proof | Contract-manifest test and reviewed exception list with zero silent omissions. |

### Slice 1 — Canonical contracts and atomic student creation

| Field | Plan |
|---|---|
| Owner | `backend/src/modules/users/DTO/create-user.dto.ts`, user service/controller response DTOs, web/mobile user services/types, Swagger/OpenAPI generation, contract tests |
| Change | Add grade level atomically; align full user and password-reset response models; establish shared/generated contracts. |
| Preserved | Role rules, verification email behavior, password generation, audit logging. |
| Navigation | Existing create routes remain. |
| States | Field validation, duplicate LRN/email, transaction rollback, email delivery failure. |
| Proof | Backend unit/integration tests plus the same fixture compiled/parsed by web and mobile. |

### Slice 2 — Governed lifecycle parity before visual redesign

| Field | Plan |
|---|---|
| Owner | New mobile lifecycle types/service; class/section/user action entry; review and receipt components; query invalidation tests |
| Change | Replace administrator direct mutations with preview/review/authenticated execute/receipt. |
| Preserved | Backend lifecycle semantics and manifest fields. |
| Navigation | Action sheet → resolution screen → review → receipt; cancel pops without mutation. |
| States | Blocked, warning, expired, wrong password, conflict, replay, partial failure, offline. |
| Proof | Request-shape tests, action-order tests, authenticated backend E2E, mobile integration test. |

### Slice 3 — Administrator shell and navigation parity

| Field | Plan |
|---|---|
| Owner | `mobile/src/navigation/role-drawer-model.ts`, `admin-route-manifest.ts`, `AppNavigator.tsx`, role drawer/header, admin theme |
| Change | Mirror web categories; add missing roots; move contextual destinations; add notification entry; adopt red/white tokens. |
| Preserved | Admin role priority, secure session behavior, profile footer, bottom logout. |
| Navigation | Explicit root, push/pop, legacy alias, deep-link, hardware Back, and state-retention rules. |
| States | Unauthorized/missing deep link, unread/no notifications, compact/expanded. |
| Proof | Manifest parity test, back-stack tests, screenshot/visual review at required viewports. |

### Slice 4 — List and detail infrastructure

| Field | Plan |
|---|---|
| Owner | Administrator list/search/filter/row/action/skeleton/error components and server query hooks |
| Change | Replace map-in-ScrollView and fetch-all patterns with paginated virtualized workspaces. |
| Preserved | Server totals, ordering, filters, and existing record routes. |
| Navigation | List state survives detail and modal round trips. |
| States | Initial load, refresh, next page, true/filtered empty, retry, cached offline. |
| Proof | Component tests, request-count assertions, large-fixture performance review, accessibility tests. |

### Slice 5 — School Setup workspaces

| Field | Plan |
|---|---|
| Owner | Dedicated Users, User Detail/Create/Monitoring, Sections, Section Detail, Classes, Class Detail/Create, Calendar, Roster, Class Record, User Reports screens |
| Change | Split combined screens and add all web-equivalent fields/actions. |
| Preserved | Web procedures, existing detail components where role-safe, academic capability gates. |
| Navigation | Contextual Templates and Assessments enter the canonical class stack. |
| States | All row/form/lifecycle/import/report states. |
| Proof | Per-domain contract tests and administrator flow suites. |

### Slice 6 — Content, reports, evaluations, AI, and audit

| Field | Plan |
|---|---|
| Owner | Dedicated Library, Announcements, Reports, Evaluations, Admin AI Chat, Audit screens and services |
| Change | Replace `AdminToolsScreen`; implement complete fields, typed results, response summaries, conversation history, exports, and paging. |
| Preserved | AI assistive-only boundary; backend filenames, evidence, and permissions. |
| Navigation | Source/action links from AI open mapped administrator destinations without executing mutations. |
| States | AI offline, indexing failure, upload retry, no evaluation responses, export failure, truncated data. |
| Proof | Service fixtures, component flows, AI action-route allowlist tests, authenticated smoke. |

### Slice 7 — System Settings decomposition

| Field | Plan |
|---|---|
| Owner | Six mobile settings screens, academic state/grading services, contextual help, recovery review components |
| Change | Replace the academic monolith with web-mirrored task workspaces. |
| Preserved | Exact policy periods, preview/execute procedures, audit evidence, existing service methods. |
| Navigation | Overview → task → review/receipt; return preserves current state and selected record. |
| States | No state, initialization failure, blockers, readiness, stale version, partial recovery, empty completion cohorts. |
| Proof | Academic service contract comparison, policy-driven period tests, navigation and authenticated recovery smoke. |

### Slice 8 — Adaptive, accessibility, and hardening pass

| Field | Plan |
|---|---|
| Owner | Window-size hooks, list-detail layouts, focus/accessibility helpers, keyboard/safe-area behavior |
| Change | Tablet two-pane layouts, 48dp targets, large-text reflow, screen-reader order, reduced motion. |
| Preserved | Same route IDs and action graphs. |
| Navigation | Pane selection remains deep-linkable and Back-compatible. |
| States | Split-screen, rotation, large text, keyboard, screen reader, reduced motion. |
| Proof | Accessibility assertions, TalkBack/VoiceOver checklist, phone/tablet visual matrix. |

### Slice 9 — Full parity acceptance and release boundary

| Field | Plan |
|---|---|
| Owner | Backend, web, mobile contract suites; role smoke; emulator/physical device evidence; release documentation |
| Change | Close every matrix row and remove approved temporary aliases/fallbacks only when proven safe. |
| Preserved | Web regression behavior and backend authority. |
| Navigation | End-to-end verification of every drawer and contextual route. |
| States | Success, denial, blocked, stale, offline, partial, and recovery flows. |
| Proof | Exact test outputs, authenticated admin run, artifact identity, and release evidence if later authorized. |

## 22. Verification matrix

| Layer | Required proof |
|---|---|
| Backend DTO/service | Unit tests for validation, atomicity, permissions, lifecycle sequencing, manifest expiry/hash/idempotency, and response fields. |
| Backend integration | Real PostgreSQL tests for student creation rollback, lifecycle preservation, roster commit/resolution, report filters, and audit receipts. |
| OpenAPI/shared contract | Generated artifact diff reviewed; both clients compile against the same schemas; no undocumented admin responses. |
| Route parity | Every web admin route/action mapped to mobile or an approved contextual route; missing mappings fail CI. |
| Mobile services | Request method/path/body/query and full response fixture tests for every admin domain. |
| Mobile components | Loading, paging, empty, filtered empty, validation, permission, offline, partial success, and error recovery. |
| Navigation | Drawer roots, contextual routes, deep links, legacy aliases, modal close, dirty-form Back, Android hardware Back, and state retention. |
| Accessibility | 48dp target audit, labels/roles/states, focus order, contrast, large text, TalkBack, VoiceOver, reduced motion. |
| Responsive | Representative compact phone, large phone, portrait tablet, landscape tablet, and split-screen widths. |
| Performance | Constant request count per list page; no per-class fan-out; virtualized large fixtures; bounded retained pages. |
| Security | Secure token storage retained; credentials never persisted; high-risk actions require live server preview and server authorization. |
| Cross-platform | Android and iOS execute the same contracts; platform file/date/share adapters are tested separately. |
| Authenticated runtime | Seeded administrator completes every critical action graph against a controlled backend and verifies resulting audit/operation records. |
| Regression | Web admin focused/full tests remain green; backend route and semantic contract tests pass; teacher/student mobile flows remain unaffected. |

## 23. Observable acceptance criteria

The overhaul is complete only when all of the following are true:

1. Every web administrator category and task is reachable from mobile through a documented equivalent path.
2. No mobile administrator action uses a semantically weaker sequence than web.
3. Class, section, student, and purge lifecycle operations show the backend manifest before execution and produce a receipt afterward.
4. Creating a student from web or mobile produces the same complete backend record, including grade level, in one authoritative transaction.
5. Web and mobile compile against the same administrator transport schemas or pass a shared schema validation gate.
6. Mobile retains and can display all documented user, class, section, assessment, report, evaluation, template, lifecycle, and error fields.
7. There is no production administrator domain implemented as a conditional branch inside `AdminToolsScreen`.
8. Routine academic settings, year transition, learner completion, and recovery are separate task workspaces.
9. Users, sections, classes, audit, reports, files, campaigns, announcements, and assessments use server-backed pagination/filtering where their data can grow.
10. Opening the first page of cross-class assessments or announcements performs a bounded, constant number of requests.
11. No primary report view renders raw JSON.
12. No administrator is asked to type an ISO timestamp.
13. Every interactive admin control has at least a 48dp target and a meaningful accessible name/state.
14. Row navigation cannot fire when a row action is selected.
15. Search/filter/page/scroll state survives list → detail → Back.
16. Offline cached data is clearly marked; high-risk writes cannot be queued or executed from stale state.
17. Notification inbox is reachable from the administrator header and does not rely on noisy global banners.
18. Red/white administrator tokens match the current web/GABHS identity, with semantic status colors and adequate contrast.
19. Phone and tablet layouts use the same route/action contract, with two-pane presentation only when width allows.
20. Focused automated tests, full relevant suites, authenticated administrator runtime evidence, and platform-specific device checks are recorded separately and truthfully.

## 24. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A visual rewrite masks contract regressions | Complete canonical contracts and lifecycle parity before broad visual migration. |
| Generated API types are incomplete because Swagger responses are under-annotated | Make response DTO completion a backend prerequisite and fail generation/validation in CI. |
| Huge all-at-once migration destabilizes admin | Ship domain slices behind route aliases and retain old roots as temporary fallbacks until acceptance. |
| Mobile parity becomes a copy of desktop density | Review action graphs and fields for parity, but use mobile list/detail, sheets, progressive disclosure, and adaptive layouts. |
| Removing direct lifecycle calls breaks another role | Trace all references and migrate only administrator flows first; deprecate backend routes separately. |
| Local caching leaks sensitive admin data | Cache only approved read models; encrypt through platform facilities; never persist passwords, tokens outside secure storage, LRN-heavy drafts, or execution credentials. |
| Tablet work creates separate behavior | Reuse the same routes, query hooks, and action components; change only composition. |
| New aggregate endpoints diverge from web | Update web/mobile services to the same endpoint when appropriate and add shared response fixtures. |
| Tests pass without real UX proof | Keep source/test/emulator/physical-device evidence as separate acceptance layers. |

## 25. Implementation ownership map

Likely current owners that must be split or extended:

### Mobile navigation and design system

- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/navigation/admin-route-manifest.ts`
- `mobile/src/navigation/role-drawer-model.ts`
- `mobile/src/navigation/types.ts`
- `mobile/src/components/navigation/RoleNavigationDrawer.tsx`
- `mobile/src/components/admin/AdminMobilePrimitives.tsx`
- `mobile/src/theme/admin.ts`

### Current mobile screens to replace or decompose

- `mobile/src/screens/AdminHomeScreen.tsx`
- `mobile/src/screens/AdminToolsScreen.tsx`
- `mobile/src/screens/AdminAcademicScreen.tsx`
- `mobile/src/screens/AdminClassesScreen.tsx`
- `mobile/src/screens/AdminAssessmentsScreen.tsx`
- `mobile/src/screens/AdminAnnouncementsScreen.tsx`
- `mobile/src/screens/AdminProfileScreen.tsx`

### Mobile service/type owners

- `mobile/src/api/services/admin.ts`
- `mobile/src/api/services/classes.ts`
- `mobile/src/api/services/sections.ts`
- `mobile/src/api/services/assessments.ts`
- `mobile/src/api/services/announcements.ts`
- `mobile/src/api/services/evaluations.ts`
- `mobile/src/api/services/reports.ts`
- `mobile/src/api/services/roster-import.ts`
- `mobile/src/api/services/file-upload.ts`
- `mobile/src/api/services/school-events.ts`
- `mobile/src/api/services/academic-state.ts`
- `mobile/src/api/services/academic-grading.ts`
- `mobile/src/api/services/class-record.ts`
- `mobile/src/types/admin.ts`
- `mobile/src/types/user.ts`
- `mobile/src/types/class.ts`
- `mobile/src/types/teacher.ts`
- `mobile/src/types/assessment.ts`
- `mobile/src/types/report.ts`

### Web reference owners

- `next-frontend/src/components/layout/Sidebar.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/**`
- `next-frontend/src/services/admin-lifecycle-service.ts`
- `next-frontend/src/services/user-service.ts`
- `next-frontend/src/services/class-service.ts`
- `next-frontend/src/services/section-service.ts`
- `next-frontend/src/services/report-service.ts`
- `next-frontend/src/services/class-template-service.ts`
- `next-frontend/src/services/roster-import-service.ts`
- `next-frontend/src/services/admin-chatbot-service.ts`
- `next-frontend/src/services/academic-state-service.ts`
- `next-frontend/src/services/academic-grading-service.ts`
- `next-frontend/src/types/admin-lifecycle.ts`

### Backend contract owners

- `backend/src/modules/users/**`
- `backend/src/modules/admin/**`
- `backend/src/modules/classes/**`
- `backend/src/modules/sections/**`
- `backend/src/modules/assessments/**`
- `backend/src/modules/announcements/**`
- `backend/src/modules/reports/**`
- `backend/src/modules/roster-import/**`
- `backend/src/modules/class-templates/**`
- `backend/src/modules/academic-state/**`
- `backend/src/modules/academic-grading/**`
- `backend/src/modules/class-record/**`
- `backend/src/modules/lxp/**`
- `backend/src/modules/ai-mentor/**`
- `backend/src/common/contracts/client-route-contract.spec.ts`

## 26. Final handoff

Direction A is now fully specified:

- Mirror the web administrator's category model and action graphs.
- Keep the mobile drawer but reduce primary clutter through contextual destinations.
- Make Home an attention and evidence surface.
- Split monolithic screens into task-owned workspaces.
- Establish backend-generated/shared contracts before relying on parity claims.
- Fix the critical lifecycle and student-grade contracts first.
- Move all growing collections to server pagination and virtualized lists.
- Use the current web GABHS red/white token system and accessible 48dp controls.
- Verify source, contracts, authenticated runtime, devices, and release artifacts as separate evidence layers.

No open product decision blocks implementation planning. Any later proposal to change a web procedure, backend academic rule, lifecycle meaning, permission, or data-retention rule is a new cross-platform contract change and must be reviewed separately.

## 27. Implementation and verification record

This section records what was actually implemented from the accepted plan. The earlier evidence remains the design baseline; this record supersedes the original planning-only status without rewriting the historical findings.

### 27.1 Delivered administrator experience

- Replaced the mixed administrator drawer with the accepted five-group information architecture while retaining legacy route aliases, profile access, notifications, and bottom-anchored logout.
- Rebuilt Home as an operational overview of backend-authoritative academic state, readiness exceptions, recent immutable audit events, and concise totals instead of decorative cards.
- Added dedicated mobile workspaces for Users, User Reports, Sections, Classes, Calendar, Roster Import, Class Record, Assessments, Announcements, Templates, Nexora Library, Reports, Evaluations, AI Chatbot, Audit Trail, Diagnostics, and the decomposed System Settings tasks.
- Added virtualized server pagination, bounded inventory endpoints, search and filter state, refresh/empty/error/loading states, cached-data provenance, and stale-state protection for consequential writes.
- Added adaptive phone/tablet composition, native date/time input, 48dp minimum controls, explicit accessible labels/states, separated row navigation and row actions, and state restoration on list → detail → Back.

### 27.2 Contract and workflow corrections

- Student creation now sends and persists `gradeLevel` atomically through the backend user contract; web and mobile no longer rely on a second profile request or omit the field.
- The mobile user editor now covers the same profile, status, reset, lifecycle, purge, and bulk-review fields/actions as web.
- Administrator class, section, student, and purge operations now use the same backend-governed preview → evidence review → current-password confirmation → idempotent execute → receipt sequence as web. Direct mobile lifecycle toggles were removed from administrator flows.
- Mobile content, library, evaluation, report, class-template, class-record, assessment, announcement, academic-readiness, and error-envelope types were expanded to match the web consumer and backend response fields.
- Assessment and announcement administration now use bounded paginated inventory endpoints instead of client-side all-class aggregation.
- A shared contract fixture and gate now validate 18 administrator contracts across backend, web, and mobile (54 layer checks). A separate exported-interface audit found no same-name field omissions in mobile relative to web.

### 27.3 Automated and authenticated runtime evidence

| Evidence layer | Result | Boundary |
|---|---|---|
| Shared administrator contract gate | 18 contracts / 54 layer checks passed | Contract fixture and source-layer agreement, not production traffic by itself. |
| Backend full suite | 137 suites / 1,407 tests passed | Backend source behavior; lint passed with 2,298 warnings under the configured 2,300 ceiling and the production build passed. |
| Web full suite | 181 suites / 794 tests passed | Web source behavior; lint, typecheck, and the 71-page production build passed. |
| Mobile full suite | 116 suites / 642 tests passed | Shared React Native source behavior; typecheck and the administrator contract gate passed. |
| Authenticated local backend sweep | Health/live, readiness, login, identity, overview, paginated School Setup/Content/Insights/Audit endpoints, evaluations, and academic-state/readiness returned successful expected envelopes. | Local production-mode backend against the repository database/Redis, not the hosted deployment. |
| Governed lifecycle acceptance | Test-owned empty section completed preview, reviewed execution, receipt/audit lookup, purge preview, purge execution, and confirming 404 cleanup. | Local gate explicitly enabled; the temporary record was removed. |

### 27.4 Android artifact and emulator evidence

- Android was incremented monotonically from `0.1.31` / build `32` to `0.1.32` / build `33`; iOS build metadata was intentionally left unchanged.
- The production artifact is ARM64, package `com.nexora.lms.mobile`, embeds the production backend `/api` URL and `android.permission.REQUEST_INSTALL_PACKAGES`, and passes `apksigner`, 16 KB `zipalign`, and ZIP integrity checks.
- Published artifact manifest before deployment: version code `33`, minimum supported version code `33`, native/runtime version `0.1.32`, 41,267,135 bytes, SHA-256 `19153c4f79dc9e0be746aa0eec91aa8bbb5f29feb98e69581f83df632def13d0`, signing-certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Android 15 emulator smoke used a same-source x86_64 release because the available AVD cannot install the ARM64 publication artifact. It confirmed build `33`, native startup, authenticated production login, notification permission handling, the corrected inset/full-width overview rows, the grouped drawer, bottom logout, and the server-paginated Users workspace with no fatal native or JavaScript error in the inspected log window.
- Physical Android installation/update acceptance remains a separate hardware boundary. iOS was not built or device-tested on this Linux host; shared-source TypeScript and tests do not substitute for native iOS acceptance.

### 27.5 Dependency-audit boundary

The final mobile `npm audit --omit=dev` snapshot reports 65 advisories (2 low, 42 moderate, 20 high, 1 critical). The added NetInfo and Expo Print native modules compile and link successfully, but this repository-wide Expo/Metro/Tiptap dependency debt is not represented as resolved by this UI release. Most high/critical paths require transitive updates or an Expo major migration; the direct Tiptap advisory has a newer same-major candidate and should be handled as a separately tested security upgrade rather than folded into the administrator UX change without editor regression coverage.

### 27.6 Release promotion evidence

- **Immutable revisions:** the administrator overhaul was committed as `a4d82524cd1504eb5d555124f78c31c8fee95ae1`; the narrowly scoped deployment repair was committed as `3b13521f404c8e04c360a7deb034212d23ba9dda`. Both were pushed to `developement`.
- **GitHub Actions:** CI run [34626286509](https://github.com/Jethro663/capstone-nest-backend/actions/runs/34626286509) completed successfully for exact head `3b13521f404c8e04c360a7deb034212d23ba9dda`. Backend unit/lint (including the explicit 18-contract/54-layer administrator gate), backend e2e, PostgreSQL 16 and 18 migration/runtime rehearsals, frontend build/security checks, mobile release/type/test checks, AI service tests, and advisory quality reports all completed successfully.
- **Deployment failure found and corrected:** the first backend deployment, `5a943ac2-ec04-4a5f-a7a7-0c58f257e7b5`, failed because `backend/package.json` coupled its image-local build to `../scripts/check-admin-client-contracts.cjs`, which is outside the backend Docker context. The repair leaves the cross-client gate as an explicit CI responsibility and keeps the image build backend-owned. The ownership regression check failed before the change, then passed together with the gate, backend build, and a real local backend Docker build.
- **Railway production:** backend deployment `4cdda821-3776-46eb-82de-584b62654d59` and frontend deployment `40f9c423-3e9b-4cbe-8654-6bce5c388f32` both reached exact terminal status `SUCCESS`. Hosted `/api/health/live` and `/api/health/ready` returned HTTP 200; readiness confirmed database, Redis, and AI-service dependencies available.
- **Live Android artifact:** the hosted JSON manifest matched the committed manifest exactly. Downloading the public APK produced 41,267,135 bytes and SHA-256 `19153c4f79dc9e0be746aa0eec91aa8bbb5f29feb98e69581f83df632def13d0`, exactly matching the committed build `33` manifest before policy registration.
- **Hosted update policy:** the exact manifest was registered through the secret-backed production endpoint with HTTP 200. Android `0.1.31` / build `32` receives `updateType: apk_forced`, `isForceUpdate: true`, build `33`, minimum build `33`, the exact public URL, size, and SHA-256. Android `0.1.32` / build `33` receives `updateType: none` and `isForceUpdate: false` while retaining the same authoritative metadata.
- **Authenticated production reads:** a seeded administrator using Android build `33` headers received successful responses for identity, administrator overview, paginated users/sections/classes, student readiness, templates, assessment and announcement inventories, library and storage, evaluation campaigns/responses, academic state/readiness, audit, and student-master-list reports. No destructive production lifecycle exercise was run; the complete preview/execute/receipt/purge acceptance remained confined to the controlled local runtime.
- **Remaining native boundary:** the same-source Android 15 x86_64 emulator acceptance is complete, but a physical ARM64 Android install/update flow and native iOS build/device acceptance remain hardware-specific checks and are not represented as completed by this release.
