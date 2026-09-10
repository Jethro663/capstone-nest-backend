# Mobile Admin Operations Ledger Design

## Outcome

The mobile administrator experience becomes a calm operations console built for quick scanning and controlled action. The role drawer is the only primary-navigation surface. Top-level admin workspaces no longer hide behind the Home screen or an eleven-chip tool switcher.

## Current-state findings

- Confirmed: `RoleTabs` resolves the admin role to `AdminNavigator`, whose `MainTabs` screen contains a hidden bottom-tab navigator wrapped by `RoleDrawerProvider role="admin"`.
- Confirmed: the drawer exposes only Home, Classes, Assessments, Academic, and Profile.
- Confirmed: Announcements and eleven administration modules are separate stack destinations reached from Home, so the drawer is not yet the complete primary navigator.
- Confirmed: admin screens reuse teacher primitives, including floating `TeacherPanel` and horizontal KPI-card components. Large screens such as Academic and Tools accumulate many rounded containers and chips.
- Confirmed: admin APIs, mutations, confirmation alerts, query keys, refresh behavior, role resolution, and feature-detail stacks already exist and do not require backend changes.

## Decision ledger

### Keep

- Existing admin routes, RBAC, API calls, validation, query invalidation, confirmation dialogs, and download/export behavior.
- The native feature stack for class, section, assessment, lesson, roster, and academic details.
- Pull-to-refresh and existing loading, empty, error, disabled, and destructive-confirmation states.
- The school identity and the drawer shared by student, teacher, and admin roles.

### Change

- Promote every top-level admin workspace into grouped drawer navigation.
- Replace the chip-based Administration Tools switcher with one drawer destination per domain.
- Replace floating cards with flat sections, dividers, compact metrics, and list rows.
- Standardize search, segment filters, result counts, clear behavior, and active/archived language.
- Make forms progressive: the list stays primary while create/edit controls expand only when requested.
- Give the admin role a restrained ink/blue operational palette distinct from the teacher coral treatment.

### Frozen

- Backend and mobile API contracts.
- Role precedence, authorization, audit history, official academic state, and mutation semantics.
- Route parameters and source-aware native-stack Back behavior for detail screens.
- Android-only APK update behavior and the independent iOS build number.
- Exact academic period labels returned by backend policy.

### Resolved assumptions

- “Easy hovering” on mobile means easy skimming and inspection: aligned rows, persistent context, clear pressed states, generous touch targets, progressive disclosure, and predictable detail navigation. No literal mouse-hover interaction is introduced.
- The user’s instruction to brainstorm, then finish and ship while they are away authorizes selection of the recommended direction without an additional approval pause.

## Directions considered

1. **Operations ledger — selected.** A complete grouped drawer, flat data surfaces, compact metrics, and consistent filters. Best balance of breadth, scan speed, and touch safety.
2. **Home-centric command hub.** A short drawer with module launchers on Home. It looks simpler but preserves the current hidden second navigation layer and duplicates routes.
3. **Compressed desktop console.** Dense tables and permanent controls. It shows more values at once but produces horizontal pressure and small touch targets on phones.

## Navigation contract

The root authentication and role boundary remains unchanged. `AdminNavigator` owns a hidden tab navigator for all primary admin workspaces and a native stack for feature details and backward-compatible direct entries.

| Drawer group | Destinations |
|---|---|
| Overview | Home |
| People and learning | Users, Classes and sections, Roster import, Assessments, Announcements, Evaluations |
| School operations | Academic, Calendar, Class templates, Library |
| Oversight | Reports, Audit log, Diagnostics, System settings |
| Account footer | Profile |

Opening a drawer destination switches the hidden tab with history retained. Opening a class, section, assessment, or other feature detail pushes the existing native stack. Back from a detail pops to the actual source tab. Back at a drawer root follows the platform root behavior. Legacy `AdminTools`, `AdminAcademic`, and `AdminAnnouncements` stack routes remain registered as direct-entry fallbacks.

## Visual and interaction system

- Background: quiet cool gray; content surfaces: white; primary action and selection: deep administrative blue; text: ink and slate; destructive states: restrained red.
- Headers contain the drawer trigger, one short title, and at most one high-priority action. Pull-to-refresh remains available without a duplicate refresh button.
- Metrics are a compact divided strip, not individual cards.
- Sections are full-width white sheets separated by borders and vertical rhythm, without shadows or ornamental radii.
- Data rows use a title, one or two metadata lines, optional status marker, and one clear destination. Secondary actions are compact and visually subordinate.
- `AdminFilterBar` owns search, clear, segmented status filters, and visible-result count. Filters use the same order: search, scope, status, results.
- Create and edit forms open progressively in the same workspace and retain server validation, disabled states, cancellation, and destructive confirmation.
- Minimum interactive height is 44 px. Text supports font scaling, labels do not rely on color alone, and empty/error messages include an explicit recovery action when one exists.

## State matrix

| State | Treatment |
|---|---|
| Loading | Stable header and filters with a concise loading row; no fake metrics |
| Empty | Explain whether the dataset is truly empty or filtered; filtered empties offer Clear filters |
| Error | Inline error notice with the backend-derived message and pull-to-refresh recovery |
| Disabled | Reduced opacity plus unchanged accessible label; mutation remains unavailable |
| Permission denied | Existing backend rejection is surfaced; no optimistic success copy |
| Offline/network failure | Existing query error and retry behavior remains visible |
| Long content | Rows truncate secondary metadata; detail screens retain full content |
| Keyboard/safe area | Scroll container and safe-area header remain; forms stay reachable above the keyboard |

## Implementation boundaries

- Create admin-owned theme and primitive modules instead of modifying teacher or student primitives.
- Refactor all seven admin screens to admin primitives.
- Split navigation identity from tool rendering with a typed admin route manifest; reuse the existing `AdminToolsScreen` implementation for dedicated tool tabs.
- Add search/status filtering to Classes, Assessments, Announcements, and applicable tool inventories without changing fetched datasets or server query contracts.
- Add source and render-contract tests before production changes, then run the complete mobile release gates and package the next Android release through the existing release scripts.

## Acceptance checks

- Every listed admin workspace appears exactly once in the grouped drawer and opens as a drawer-root tab.
- The Admin Tools chip switcher and Home module-button cloud are gone.
- No admin screen imports `TeacherPanel`, `TeacherStats`, `TeacherRow`, `TeacherChip`, `TeacherSearch`, or `TeacherScreen`.
- Main inventory screens expose the shared filter bar and filtered-empty recovery.
- Existing mutations, confirmation alerts, detail route parameters, refresh callbacks, account controls, and academic safeguards remain.
- Focused navigation/component tests, TypeScript, the full mobile Jest suite, release verification, production bundle checks, APK validation, exact-SHA CI, deployment, and live-download verification succeed for the final revision.
