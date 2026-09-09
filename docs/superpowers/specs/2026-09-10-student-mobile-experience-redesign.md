# Student Mobile Experience Redesign

**Status:** Approved by inherited direction and delegated execution authority

**Role:** Student only

**Platform:** Expo / React Native mobile
**Design direction:** 50/50 A2 guided agenda + A1 compact course workspace, using the approved P2 GABHS palette

## Outcome

Turn the student mobile app into a calm, recognizably school-branded LMS: the drawer is the stable primary shell, Home answers “what should I do next?”, Classes opens a coherent course workspace, and detail screens preserve their actual navigation history. This is a presentation and navigation-hardening change. Existing APIs, permissions, submissions, grading, lesson completion, discussion, profile editing, and JA procedures remain unchanged.

## Evidence and confidence

- **Confirmed:** `StudentTabs` already mounts a role drawer and hides the old bottom tab bar.
- **Confirmed:** student root destinations are Dashboard, Classes, Assessments, JA, Announcements, and Profile.
- **Confirmed:** Classes is implemented by `LessonsScreen`; it expands each class into four channel rows instead of opening the class directly.
- **Confirmed:** Dashboard renders a large multi-panel surface with schedule, pending work, lessons, calendar, upcoming items, profile/performance summary, and tool cards.
- **Confirmed:** Courses still uses a gradient header, three stat cards, an overview card, large course cards, and several pills.
- **Confirmed:** Assessments uses expandable rows, a top tab strip, search/history/avatar controls, and action rows inside the expansion.
- **Confirmed:** Announcements starts with three count pills, horizontal class pills, and a second pinned/all pill control.
- **Confirmed:** Class Detail has seven workspaces split between visible tabs and an overflow sheet; Module and Lesson use repeated bordered panels and large metadata headers.
- **Confirmed:** student detail route params do not currently carry source metadata, while teacher detail routes now do.
- **Confirmed:** no attached Android device is available in the release environment; source, test, APK, CI, deployment, and live-policy proof are possible, but physical install acceptance is not.
- **Inferred:** the repeated dark-named panels and mixed legacy `GradientHeader` surface are the main source of visual discontinuity because the current theme values are light even though screen composition still follows the earlier dark dashboard structure.

## Decision ledger

### Keep

- Existing role drawer mechanism and GABHS identity.
- Existing route names, backend calls, React Query ownership, mutation behavior, and permission checks.
- Pending / Past Due / Completed / All assessment semantics and Pending default.
- Pull-to-refresh and explicit loading, empty, partial-error, disabled, and offline/error feedback.
- Class workspaces: Modules, Assessments, Announcements, Discussion, Classmates, Grades, and Calendar.
- Lesson completion, assessment attempt/history/results, module file open/download, profile editing/avatar, and JA workflows.
- User-selected teacher direction: equal parts compact utility and guided hierarchy.

### Change

- Apply one warm-white P2 visual system across student root and learning-detail surfaces.
- Make Home an agenda rather than a mini analytics dashboard.
- Replace stat/card/pill walls with flat grouped lists, dividers, compact rows, and selective soft backgrounds.
- Make class rows open the class directly; expose secondary class channels through the class workspace selector.
- Replace visible-tab-plus-overflow navigation in Class Detail with one accessible workspace selector.
- Replace assessment accordions with direct work rows; keep detail/history actions reachable without expanding cards.
- Reduce the student drawer to high-frequency destinations grouped by purpose, with Profile anchored at the bottom.
- Add source-aware detail navigation so Back returns to the actual list, class workspace, module, calendar, JA, or assessment page that opened it.

### Frozen

- Authentication, session restoration, logout, and role gates.
- API endpoints, payloads, response envelopes, polling intervals, cache keys, and invalidation behavior.
- Official completion, attempt, due-date, score, grade, class visibility, and publication rules.
- Assessment-taking lock/back behavior and submission confirmation.
- JA generation, review, replay, practice, tutor, and LXP procedures.
- Android-only APK update gate and iOS build-number isolation.

### Unknown handled by bounded assumption

- No new class imagery contract is available in the mobile class payload. The redesign uses current subject identity/accent data and does not invent a new API or upload procedure.
- No user review will occur during the delegated overnight run. The already accepted A2/A1 50/50 hierarchy and P2 palette are treated as approval for the student translation; no new product procedure is introduced.

## Considered directions

### A. Course-first compact catalog

Classes dominate Home; course rows expose modules, tasks, and progress immediately. It is fast for students who always think by subject, but deadlines can remain hidden across multiple classes.

### B. Guided agenda with course context

Home leads with the next actionable item and today’s schedule, then Continue Learning and Due Soon. Class identity remains visible in every row. This reduces deadline hunting but can feel overly task-centric if courses are pushed too far down.

### C. Activity-stream hub

Announcements, grades, tasks, and lessons become one chronological feed. This resembles activity-stream LMS products and is strong for change awareness, but it mixes unlike actions and makes deliberate course browsing harder.

### Chosen composition

Use B for the top half of Home and A for the lower half and all course workspaces. Announcements remain their own chronological surface; JA remains a conversation-first support workspace. This matches the approved 50/50 direction without averaging the information hierarchy into another busy dashboard.

## External pattern findings

The design borrows interaction principles, not product styling:

- Canvas groups cross-course work by date and lets each item open directly while retaining course identity and status.
- Google Classroom makes upcoming work visible across classes, supports task-state filtering, and allows topics to collapse for scanning.
- Moodle exposes a task timeline with quick-access links and a separate calendar.
- Blackboard uses a cross-course activity view for due/overdue work, announcements, and newly graded activity.

Nexora keeps its own drawer, school palette, JA surface, and academic rules. The shared lesson is to prioritize actionable rows and course context rather than decorative totals.

## Information architecture

### Primary drawer

**Learning:** Home, My Classes, Assessments, Calendar

**Support:** JA

**Updates:** Announcements

**Anchored footer:** Profile

Performance, Transcript, Evaluations, assessment history, and detailed class workspaces remain contextual destinations, not equal-weight primary navigation.

### Home order

1. Compact shell header: menu, `Home`, notification control.
2. Date and greeting line.
3. `Next for you`: one assessment or lesson action, with one restrained P2-red edge.
4. `Today`: schedule rows, or a clear no-classes message.
5. `Continue learning`: up to two lesson/class rows.
6. `Due soon`: up to three assessment rows, with explicit due state.
7. `Latest update`: one announcement row.
8. Quiet profile-completion notice only when incomplete.

Remove the embedded monthly calendar, decorative performance statistic, avatar hero, and generic Student Tools card group from Home. Calendar, Profile, Performance, and JA remain one drawer/contextual action away.

### My Classes

- Compact header and optional disclosed search field.
- Two meaningful filters only: Current and Completed. No fake Hidden state.
- Flat class rows with current subject badge/accent, section, teacher, next schedule, and a thin progress line.
- Tapping the row opens Class Detail / Modules.
- A trailing workspace control may open the same class at Assessments, Announcements, Discussion, or Calendar; it is secondary and never expands a card wall in place.

### Assessments

- Keep Pending, Past Due, Completed, and All; render as a compact segmented control that horizontally scrolls only when text scaling requires it.
- Add one class selector row below the status control.
- Group direct rows by urgency/date. Each row contains subject, title, due state, attempt/score state, and one clear action label.
- Tap opens Assessment Detail. History remains a header action and result/history actions remain inside detail.

### Announcements

- One class selector and one pinned toggle; no count summary pills.
- Pinned items appear first with a pin mark, then a chronological divider list.
- Tapping opens the existing rich-text detail sheet. Back closes the sheet before leaving the page.

### Profile

- Compact identity header with avatar edit affordance.
- Quiet completeness notice only when required fields are missing.
- Group fields into Personal, Contact, and Emergency Contact sections with progressive disclosure.
- Transcript and Evaluations are plain navigation rows.
- Security is a compact final section; Sign Out stays at the bottom of the page.

### Class workspace

- Context strip: Back, subject/section, teacher/schedule, restrained subject mark.
- One `Class workspace` selector controls Modules, Assessments, Announcements, Discussion, Classmates, Grades, and Calendar.
- Each workspace uses flat sections and dividers, not nested metric cards.
- Modules is the default and shows collapsible sections; only one module expands at once.
- Secondary workspaces retain every existing query, mutation, and empty/error state.

### Module

- Breadcrumb-like context: Class → Module.
- Compact overview and thin progress treatment.
- Sections are collapsible; content is a single bordered list with row dividers.
- Lesson and assessment rows open directly. File rows keep Open and Download actions.

### Lesson

- Reading-first title/context header.
- Overview is plain text, followed by content blocks separated by generous spacing and dividers.
- Existing local `I understand` controls remain as compact check rows.
- `Mark Complete` remains the only sticky primary action; completed state stays visible and disabled.

### JA

- Preserve the current conversation-first behavior.
- Align header, class selector, notices, and tool sheet with P2 tokens.
- Keep learning tools in progressive disclosure; do not turn them into Home cards.

## Navigation and stack contract

| Destination | Entry sources | Forward exits | Back behavior | Retained state | Direct-entry fallback |
|---|---|---|---|---|---|
| Class Detail | My Classes, Home, Calendar, Courses compatibility route | Module, assessment, calendar | Pop actual source | active workspace for current mounted route | My Classes |
| Module Detail | Class Modules | Lesson, assessment, file actions | Pop to Class Modules | expanded section | Class Detail / Modules |
| Lesson Detail | Module, Class Modules, Home, JA | completion | Pop actual source | local understood blocks while mounted | Class Detail when class id exists; My Classes otherwise |
| Assessment Detail | Assessments, Home, Class Assessments, Calendar, History | Take, results, history | Pop actual source | current data/attempt state | Assessments |
| Assessment Take | Assessment Detail, History resume | Results/submission | existing locked attempt semantics | server attempt state | Assessment Detail |
| Results | Assessment Detail, History, Take completion | Detail, history | pop actual source when safe | result state | Assessment Detail when assessment id exists; Assessments otherwise |
| Calendar | Drawer, Home, Class Calendar | assessment/class detail | pop actual source | selected month/date while mounted | Home |
| Announcement sheet | Announcements | none | close sheet first | current filters/scroll | n/a |

Header Back, Android hardware Back, and native stack gesture resolve the same stack. An open drawer, selector, action sheet, or announcement sheet closes before the underlying route changes.

## State matrix

| State | Treatment |
|---|---|
| Loading | Stable header plus compact skeleton/list placeholder; do not replace navigation with a blank screen |
| Empty | One plain bordered empty section with a specific next expectation |
| Partial error | Inline notice near the affected list; keep successful data visible |
| Full error | Header/context remains; retry action uses existing refetch |
| Disabled | Reduced emphasis plus semantic disabled state; no hidden required action |
| Offline/network failure | Existing normalized app error in the affected section; no fabricated cached-success state |
| Long text | Two-line list titles; full content only in detail; dynamic text may wrap without clipping controls |
| Keyboard | Search/profile forms remain visible above the keyboard; sticky actions account for safe-area inset |
| Reduced motion | No required entrance animation; meaning remains in text, icon, border, and state labels |

## Design tokens

- Canvas `#FBFAF8`
- Surface `#FFFFFF`
- Accent `#C96B68`
- Accent dark `#98484A`
- Accent tint `#FFF5F2`
- Border `#E7E3DF`
- Text `#0F172A`
- Muted `#64748B`
- Semantic blue `#416A8A`, green `#2F7D58`, amber `#A16824`, purple `#6F5A94`
- Radius: 10–14 px for content surfaces; 12 px for controls; no universal pills
- Minimum touch target: 44 px
- Motion: opacity/color/border only, 120–180 ms; no routine entrance cascade

## Component boundaries

- `StudentWorkspacePrimitives`: compact root/detail headers, context strip, workspace selector, flat section/list row, segmented control, inline notice, action sheet, and sticky bottom action.
- `student-detail-back`: source-aware fallback resolver separate from visual components.
- Screen-owned data adapters remain in their current files for this pass; repeated server behavior is not moved while visuals change.
- Large existing screens may extract pure presentation sections when necessary, but query/mutation ownership stays stable.

## Verification contract

- Component tests for shared primitives, accessibility labels/states, workspace selector, overlay-first close, and minimum interaction semantics.
- Navigation tests for drawer destinations, actual-history Back, and every direct-entry fallback.
- Render-flow tests for Home hierarchy, class direct-open behavior, assessment direct rows, profile logout placement, class workspace selection, module list, and lesson sticky completion.
- Existing submission, results, history, completion, file action, profile mutation, discussion, JA, and query-error tests must remain green.
- Full mobile typecheck, Jest suite, rich-text bundle parity, release tests, APK verifier, ARM64 APK inspection, exact-SHA CI, Railway deployment, live manifest/APK byte equality, updater registration, and old/new policy readback.
- Physical-device install acceptance is reported separately and never inferred from APK/CI evidence.

## Self-review

- No TBD/TODO placeholders.
- The drawer remains primary while details remain native stack routes.
- No new API, permission, mutation, or academic procedure is introduced.
- Home removals have explicit destinations elsewhere.
- All multi-screen Back paths have actual-history and direct-entry behavior.
- The scope is student-only and can ship as one coherent mobile release after the teacher release.
