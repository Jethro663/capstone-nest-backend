# Nexora Mobile Guided Workbench Redesign

Date: 2026-09-16

Status: Design review

Authority: Analysis, interactive prototype, and implementation handoff preparation only

Production code: Unchanged

## Target outcome

Make the student and teacher mobile workspaces feel like one coherent GABHS product:

- lively enough to feel ready for school work;
- restrained enough for repeated daily use;
- organized around the next decision or action;
- consistent across phone widths and increased text sizes;
- free of decorative statistic-card walls;
- explicit about navigation, status, and recovery.

The chosen direction is Guided Workbench. It combines the strong focus and brand presence of the existing Today at GABHS and Start here surfaces with flatter operational lists, compact segmented navigation, contextual bottom sheets, and source-aware Back behavior.

## Artifacts

- Interactive prototype: /home/jethro/.codex/visualizations/2026/09/16/01a0aa76-c7a6-7352-9c28-abc06a0e5b02/nexora-mobile-guided-workbench.html
- This design specification: docs/superpowers/specs/2026-09-16-nexora-mobile-guided-workbench-redesign.md

The prototype contains representative mock data only. It makes no API calls and performs no real mutation.

## Current-state findings

### Confirmed in source

1. Student Home already has a strong Today at GABHS welcome surface and a focused Start here priority surface. Your day, Small steps, and From school are visually weaker follow-on sections owned by mobile/src/screens/student-home/StudentHomeView.tsx.
2. The student class card is owned by mobile/src/screens/student-classes/StudentClassCard.tsx. Its actions use nested surface Views around Pressables and equal-flex secondary wrappers. The declared Pressable alignment is centered, so the reported top-left rendering is not explained by the visible alignment declarations alone.
3. Student tabs are inside RoleDrawerProvider with backBehavior set to history. JA renders RoleHeaderNavigationButton in mobile/src/screens/JaScreen.tsx.
4. The shared drawer footer shows the right-side Log out action only when the role is admin or student. Teacher therefore receives only Profile in the footer.
5. Teacher Assessment Detail is one long scroll containing TeacherStats, Assessment controls, Overview, Statistics and question analytics, and Submissions.
6. Teacher Section Detail uses TeacherStats followed by chip-based Roster and Schedule switching.
7. Teacher Lessons, Library, Reports, Interventions, Performance, Evaluations, and Announcements reuse TeacherStats, TeacherPanel, and many chip rows.
8. Teacher root destinations are owned by TeacherDrawerNavigator. Detail screens are owned by the surrounding TeacherNavigator stack.

### Reported by the user

1. The class-card actions render differently on another phone, with icons and arrows displaced.
2. JA sometimes exposes neither a useful Back control nor drawer access.
3. Teacher workspaces are difficult to scan because large statistics and controls produce long pages.
4. Teacher Home and the weaker Student Home sections feel visually flat.

### Inferred and requiring device confirmation

1. The class-card defect is likely a compound layout problem involving nested wrappers, available-width measurement, font scaling, and device-specific text layout rather than a single top-left alignment declaration.
2. The JA source/runtime contradiction may depend on its entry path, installed APK version, provider context, or header clipping. The redesign must test every entry path on a physical phone.
3. The current assessment submission response may not distinguish overdue Missing from assigned but Not turned in in every case. The UI must not invent that distinction.

## Decision ledger

| Ledger | Decision |
|---|---|
| Keep | GABHS red, navy, warm white, real school terminology, existing role ownership, existing routes, backend authority, current academic workflows |
| Change | Weak hierarchy, stat-card walls, chip overload, long mixed-purpose pages, class-action geometry, missing teacher logout, ambiguous JA header navigation |
| Frozen | APIs, DTOs, permissions, assessment lifecycle rules, grading and release authority, status meanings, query invalidation, secure storage, role precedence |
| Unknown | Whether the current submission contract always exposes a distinct Missing status; which physical-device/font-scale combination triggers the reported class-card failure |

## Alternatives considered

### Guided Workbench — chosen

Each screen answers one primary question, presents one primary next action, and progressively discloses controls. Root workspaces use the drawer; feature details use Back plus persistent menu access when required.

Benefits:

- strongest fit for the existing Start here visual language;
- removes scrolling cost without hiding frequent actions;
- supports student and teacher surfaces with a shared rhythm;
- preserves existing procedures and contracts.

Tradeoff:

- requires deliberate shared-primitives work before individual screen migration.

### Course-first shell

Every teacher tool would be anchored to a selected class and remain inside that class context.

Benefit: excellent continuity inside one class.

Tradeoff: materially changes current global teacher navigation and is too invasive for this redesign.

### Minimal utility lists

Use mostly flat lists, dropdowns, and text with nearly no branded focus surfaces.

Benefit: highly reliable and compact.

Tradeoff: does not satisfy the requested lively, teacher-ready quality and would erase the best part of the current student Home.

## Design language

### Palette

Use existing mobile tokens:

| Purpose | Token/value |
|---|---|
| Page | #FBFAF8 |
| Surface | #FFFFFF |
| Text | #0F172A |
| Muted text | #64748B |
| Divider | #E7E3DF |
| GABHS action red | #C96B68 |
| Accessible red text/action | #98484A |
| Navy focus surface | #10213B to #0F172A family |
| Supporting blue | #416A8A |
| Success | existing teacher/student green token |

Color communicates emphasis but never carries status alone. Every status also has text and, where useful, an icon.

### Type and spacing

- Compact headers: 17–20px strong title, optional 8–10px role or context label.
- Screen sections: 16px title with 9px functional label.
- Operational rows: 11–14px primary text and 9–11px supporting text.
- Base horizontal gutter: 16px, reducing to 13px only on the narrowest supported width.
- Minimum touch target: 44px; primary actions target 48–52px.

### Shape and effects

- Important focus surfaces may use 16–18px radii.
- Routine rows use separators before containers.
- Filters and tabs use restrained 9–12px radii, not pill styling everywhere.
- No glass effects, ornamental gradients, hover transforms, fake metrics, or decorative trend widgets.
- Motion is limited to drawer/sheet state communication and respects reduced motion.

## Shared interaction templates

### Root workspace

- Compact header with visible Menu.
- One context or priority surface when it starts a real action.
- Direct sections or lists below it.
- Drawer navigation preserves the current role boundary.

### Feature detail

- Back returns to the actual source.
- A direct entry without history falls back to the safest role-owned list.
- A trailing Menu remains available on JA and other places where losing the drawer would strand the user.
- Overlays close before the route pops.

### Operational workspace

- Context selector.
- Compact segmented switcher for two to four major modes.
- Search and one Filter action.
- Flat rows with status, useful metadata, and clear actionability.
- Secondary or destructive controls live in a bottom sheet.

### Insight workspace

- Context selector.
- Tabs describe questions or datasets, not decoration.
- At most one compact inline summary strip when the numbers directly orient a decision.
- Detailed evidence stays in rows, bars, or drill-down screens.

## Screen specifications

### Student Home

Primary question: What should I do now?

- Keep Today at GABHS and Start here.
- Redesign Your day as a clean timeline with time, subject, room/teacher, and a visible rail.
- Redesign Small steps as Keep momentum: two compact action rows using the same visual rhythm as the priority surface.
- Redesign From school as a bulletin surface with one actual update and a route to the calendar/announcement owner.
- Avoid adding streaks, fake progress, or motivational metrics.

### Student Classes

Primary question: Where should I continue?

- Keep the navy class identity and existing subject/grade/section/teacher hierarchy.
- Make the primary Continue learning action full width.
- Place Tasks and Schedule in an equal two-column action grid.
- Under increased text or insufficient usable width, switch secondary actions to one column.
- Each Pressable owns its border/background/touch target; remove decorative wrapper ownership.
- The arrow stays in a dedicated trailing column and cannot collapse into the label.
- Icons receive a stable, non-shrinking slot.

Acceptance:

- At 320, 360, 393, and 430px, all three actions remain inside the card.
- Icon and label centers remain aligned.
- Every target is at least 44px high.
- Long translations or increased text do not overlap, clip, or push an icon outside its control.

### JA Hub

Primary question: What am I discussing with JA?

- The conversation remains the main page rather than a nested dashboard widget.
- Drawer-root entry: Menu is the leading control.
- Entry from Home, Lesson, or another source: Back is leading and Menu remains trailing.
- Back closes a transient surface, then returns to the true source.
- A direct entry falls back to Student Home after the conversation root.
- History and Learner’s Path remain secondary routes/sheets.

### Teacher Home

Primary question: What needs my attention before the next class?

- Use a compact date and greeting.
- Show one next-class focus surface with time, class, room, and Open class.
- Use a direct teaching-agenda timeline.
- Show one actionable priority, two class shortcuts, and one recent update.
- Use only existing destinations and real backend data.
- Do not add ambient animations or new teacher metrics.

### Teacher Assessment Detail

Primary question: What do I need to review or manage?

- Remove top TeacherStats.
- Place assessment identity and authoritative status in a compact context header.
- Use Overview, Submissions, and Analytics tabs.
- Move lifecycle controls into a Manage assessment bottom sheet.
- Keep Preview as a compact, non-destructive action.

Submissions:

- Provide All, Turned in, Missing, Not turned in, and Returned filters only when supported by authoritative status data.
- Provide search plus sort by Recent, Name, or Status.
- Rows show learner, status, timestamp/context, and score.
- Turned-in/returned rows open the attempt.
- Missing/not-turned-in rows have no false affordance to open a nonexistent attempt.

Analytics:

- Use one inline completion/average/pass-rate summary.
- Rank or list question rows with percent correct, response count, and points.
- Preserve current analytics endpoints.

Manage sheet:

- Edit details/questions.
- Publish or move to draft according to existing academic capabilities.
- Review/release grades according to current eligibility.
- Open teacher attachment.
- Delete through the current permission and confirmation path.

### Teacher Section Detail

Primary question: Who is in this section, or when does it meet?

- Remove TeacherStats.
- Use a compact section context strip.
- Replace chips with a Roster/Schedule segmented switcher.
- Search changes its hint and matching fields by active tab.
- Keep Add students as the one primary roster action.
- Preserve eligibility, removal rules, and profile navigation.

### Teacher Lesson Management

Primary question: Which lesson needs a lifecycle action?

- Remove TeacherStats.
- Use a class selector plus All/Published/Drafts switcher.
- Use search and New lesson.
- Tapping selection enters explicit selection mode.
- A sticky selection bar opens the Bulk lifecycle bottom sheet.
- Publish, return to draft, reorder, and delete keep their current backend contracts and confirmations.

### Nexora Library

Primary question: Am I managing source files or reusable class content?

- Remove TeacherStats and the separate Library actions panel.
- Use Files/Modules segmented navigation.
- Keep search, class selector, folder filter, and scope indicators.
- Use one contextual Upload or New module action.
- File rows expose name, type, size, date, scope, and indexing state.
- Module rows expose owning class, section count, lesson count, and lifecycle status.
- Delete and retry-index behavior remains unchanged.

### Academic Class Record

Primary question: Which learner and grading period am I reviewing?

- Use a class selector, grading-period switcher, and learner search.
- Preserve dynamic policy periods and backend calculation authority.
- Use a horizontally scrollable grade matrix with sticky learner identity.
- Do not replace evidence-bearing columns with summary cards.
- Retain archived-account labeling and all academic-history rows.

### Teacher Announcements

Primary question: Am I reading communication or composing it?

- Remove TeacherStats.
- Use Feed/Compose modes.
- Feed: class selector, search, filters, pinned/scheduled/posted state, and ownership actions.
- Compose: audience, title, message, pin/schedule settings, attachments, and Review/Publish.
- Preserve core-template immutability, authorship rules, scheduling, and mutation contracts.

### Teacher Reports

- Remove top stat cards.
- Use Report types/Results modes.
- Keep class filter, search, and endpoint-backed rows.
- Results use an inline summary only when it orients the selected report.
- No fake charts or trend claims.

### Teacher Interventions

- Remove top stat cards and the persistent Filters panel.
- Use Priority/Active/History modes.
- Search and filters open without blocking the active case.
- Cases show learner, class, severity, current standing, evidence, and next valid action.
- Learner Path details remain a drill-down, not another long panel on the same page.

### Teacher Performance

- Remove repeated TeacherStats blocks.
- Use Overview/At risk/Compare modes.
- Keep threshold and class context visible.
- Overview may use one compact three-value strip plus real category bars.
- At-risk and comparison evidence use learner rows and drill-down details.

### Teacher Evaluations

- Replace Forms and Class Analytics chips with To answer/Feedback modes.
- Remove both top stat-card groups.
- Forms show assignment, target, due date, question count, and completion state.
- Feedback shows coverage and anonymous comments without exposing learner identity.
- Preserve evaluation-type, class, and grading-period filters.

### Teacher drawer

- Keep existing group labels and route ownership.
- Give teacher the same footer geometry as student/admin: Profile fills the remaining width and Log out occupies the right-side action.
- Logout keeps the existing confirmation and authentication behavior.

## Navigation contract

| Surface | Entry | Forward exits | Back | State retained | Direct-entry fallback |
|---|---|---|---|---|---|
| Student Home | Student role root | Class, assessment, JA, calendar | Platform root behavior | Scroll on transient child return where supported | Student Home |
| Student Classes | Drawer, Home | Class detail, tasks, schedule | Actual source | Search and active filter | Student Home |
| JA root | Drawer | Conversation, history, Learner’s Path | Student history | Active class and thread | Student Home |
| JA conversation | Home, lesson, JA root | Context/lesson details | Actual source; Menu still available | Draft and thread | JA root |
| Teacher Home | Teacher role root | Class, assessment, intervention, announcement | Platform root behavior | Scroll where supported | Teacher Home |
| Assessment Detail | Assessment list, class, Home, direct link | Attempt, editor, preview, management sheet | Actual source; sheet first | Active tab, submission filter, search/sort | Assessments |
| Section Detail | Sections, class context, direct link | Learner profile, add students | Actual source | Roster/Schedule tab and search | Sections |
| Teacher drawer workspaces | Drawer | Their existing detail routes | Drawer history | Active tab/filter unless stale | Teacher Home |
| Management sheet | Assessment or lesson workspace | Existing actions | Close sheet only | Underlying route state | Underlying route |

Header Back, Android hardware Back, and swipe-back must resolve the same feature stack. A root drawer switch may use the current tab-history behavior, but a feature detail must not guess a dashboard destination.

## State matrix

| State | Required behavior |
|---|---|
| Loading | Preserve header/context; show restrained skeletons; do not flash zero statistics |
| Empty | Explain what is absent and offer one valid next action when the role can act |
| Error | Preserve route/tab/filter; show plain cause and Retry |
| Disabled | Keep the action visible only when understanding eligibility matters; explain the blocker |
| Permission denied | Show a role-safe return destination; do not expose hidden data |
| Offline | Show an offline banner; keep cached content readable; disable mutations |
| Long content | Wrap without covering icons/actions; preserve row height growth |
| Keyboard | Keep active inputs and primary actions above the keyboard |
| Safe area | Respect top and bottom insets in headers, drawers, sheets, and sticky actions |
| Reduced motion | Remove nonessential transitions while preserving visible state changes |

## Contract and procedure freeze

This redesign does not authorize:

- backend, DTO, schema, or endpoint changes;
- new academic statuses;
- changes to assessment publish/draft/release/delete eligibility;
- changes to grading, class-record, or evaluation calculations;
- changed permissions or role precedence;
- bypasses of destructive confirmations;
- new durable data or analytics;
- mobile calls directly to the AI service;
- release, APK, push, or deployment work.

## Likely implementation ownership

Shared:

- mobile/src/components/teacher/TeacherMobilePrimitives.tsx
- mobile/src/components/student/StudentWorkspacePrimitives.tsx
- mobile/src/components/navigation/RoleNavigationDrawer.tsx
- mobile/src/navigation/AppNavigator.tsx
- mobile/src/navigation/role-drawer-model.ts
- mobile/src/theme/teacher.ts
- mobile/src/theme/studentDark.ts

Student:

- mobile/src/screens/student-home/StudentHomeView.tsx
- mobile/src/screens/student-classes/StudentClassCard.tsx
- mobile/src/screens/student-classes/StudentClassesView.tsx
- mobile/src/screens/JaScreen.tsx

Teacher:

- mobile/src/screens/TeacherHomeScreen.tsx
- mobile/src/screens/TeacherAssessmentDetailScreen.tsx
- mobile/src/screens/TeacherSectionDetailScreen.tsx
- mobile/src/screens/TeacherLessonsScreen.tsx
- mobile/src/screens/TeacherLibraryScreen.tsx
- mobile/src/screens/TeacherClassRecordScreen.tsx
- mobile/src/screens/TeacherAnnouncementsScreen.tsx
- mobile/src/screens/TeacherReportsScreen.tsx
- mobile/src/screens/TeacherInterventionsScreen.tsx
- mobile/src/screens/TeacherPerformanceScreen.tsx
- mobile/src/screens/TeacherEvaluationsScreen.tsx

Tests likely affected:

- mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx
- mobile/src/navigation/__tests__/role-drawer-integration.test.ts
- mobile/src/screens/__tests__/screen-render.test.tsx
- mobile/src/screens/__tests__/teacher-mobile-render.test.tsx
- focused student class-card and teacher assessment layout tests

## Dependency order for a later implementation plan

1. Stabilize shared header/drawer navigation and class-action geometry.
2. Add shared segmented control, context header, filter sheet, bottom action sheet, and operational list primitives.
3. Migrate Student Home, Classes, JA, and Teacher Home.
4. Migrate Assessment, Section, and Lessons.
5. Migrate Library, Class Record, and Announcements.
6. Migrate Reports, Interventions, Performance, and Evaluations.
7. Run cross-role navigation, responsive, accessibility, physical-device, and regression acceptance.

This order is a handoff outline, not implementation authorization.

## Verification matrix

| Area | Evidence required |
|---|---|
| Class actions | Component geometry at 320/360/393/430px and text scale 1.0/1.3/1.5; physical Android devices with different widths |
| Navigation | Root Menu, nested Back, persistent JA Menu, overlay-first Back, direct-entry fallback, drawer history |
| Teacher logout | Teacher footer contains Profile and right-side Log out; confirmation still calls the existing logout path |
| Assessment | Tab retention, filter/sort, missing versus not-turned-in contract, attempt navigation, management sheet permissions |
| Section/Lessons | Search by active mode, selection state, bulk action eligibility, Back retention |
| Library/Record | File/module states, sticky learner identity, horizontal scrolling, long names |
| Insights | Endpoint-backed values only; no fake summary; empty/error/offline cases |
| Accessibility | 44px targets, focus order, labels, dynamic text, contrast, reduced motion, screen reader status text |
| Regression | Student, teacher, and admin role resolution; auth/session; existing mutations; query invalidation |

## Prototype verification completed

- Inline script syntax check passed.
- Student Home rendered in the browser.
- Class actions rendered inside their card at 320, 360, 393, and 430px.
- At every measured width, secondary action icons and labels shared the same vertical center.
- Large-text mode changed secondary actions to one column.
- JA reached from Student Home showed Back and Menu simultaneously.
- System Back closed the open drawer before returning JA to Student Home.
- Assessment status filtering isolated the expected Missing row.
- System Back closed the assessment management sheet while preserving Submissions and Missing.
- Missing and Not turned in rows expose no false attempt-opening affordance; submitted and returned rows select the correct learner.
- Every named teacher workspace rendered with the correct route header: Home, Assessment, Section, Lessons, Library, Class Record, Announcements, Reports, Interventions, Performance, and Evaluations.
- Section mode search, lesson selection and bulk lifecycle, library modes, announcement compose, report results, intervention history, performance comparison, and evaluation feedback all rendered their expected focused state.
- Loading, empty, error, offline, permission-limited, and normal states rendered without changing the frozen data contract.
- The browser console reported no warnings or errors during the completed interaction audit.

## Open implementation decisions

1. Verify the exact backend/mobile value that distinguishes Missing from Not turned in. If the response does not distinguish them, expose one honest category instead of inferring overdue state on the client.
2. Reproduce the class-card bug on the affected phone or an equivalent width/font-scale/device-density combination before closing the production defect.
3. Confirm whether announcement Compose remains an in-screen mode or opens the existing editor route. Either choice must preserve the current mutation, validation, and cancellation behavior.

## External pattern references

- Canvas Teacher centers frequent mobile work on grading, communicating, and updating and supports filtering/sorting submissions:
  https://community.instructure.com/en/kb/articles/388744-canvas-teacher-mobile-features
- Google Classroom uses class cards and class/task-oriented navigation while acknowledging that mobile differs from desktop:
  https://support.google.com/edu/classroom/answer/9582854?co=GENIE.Platform%3DAndroid&hl=en

These references informed interaction hierarchy only. Nexora retains its GABHS identity, terminology, procedures, and backend authority.
