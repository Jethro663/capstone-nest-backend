# Themed Table Filter Controls

## Outcome

Replace the fourteen native table-filter dropdowns introduced by the September 28 table-control hotfix with one accessible, role-aware filter select. The control must look intentional in the Nexora student, teacher, and admin themes while preserving every existing search, filter, table, and route behavior.

## Authority and scope

This is an approved production implementation for the web frontend. It includes only table-filter dropdowns added by commit `853594ab8306f55024150f6b7274aa0be70f5fc5`.

Included surfaces:

- Student class Classmates and Grades tabs.
- Teacher class learner table, section roster, performance comparison/concept/change tables, and assessment overview.
- Admin section roster/edit tables, roster-import preview/history, and back-subject records.

Excluded:

- Mobile screens and Android packaging.
- Form selects that create, transfer, schedule, or mutate records.
- Existing non-table selectors such as class selection, extraction settings, destination sections, lesson sources, school year, and grading period.

## Current findings

Confirmed:

- The fourteen in-scope controls are native HTML `select` elements.
- Some use role color classes, but the open menu, arrow, spacing, and interaction remain browser-native and visually inconsistent.
- `src/components/ui/select.tsx` already wraps Radix Select and supports student and teacher trigger variants.
- The filters already have stable values, labels, state owners, result counts, search pairings, and filtered-empty messages.

Inferred:

- A single role-aware wrapper will prevent the three role surfaces from drifting again.

Unverified until implementation review:

- The exact width each filter needs at narrow and wide viewports; the wrapper must therefore accept route-local sizing classes.

## Decision ledger

### Keep

- Current filter state, option values, labels, result calculation, result counts, and empty messages.
- Current search inputs and their placement beside the filters.
- Existing route, tab, loading, error, and permission behavior.
- Nexora red, navy, white, teacher, and admin design tokens.

### Change

- Replace each in-scope native select with a shared `TableFilterSelect` built on the existing Radix select primitives.
- Give the trigger a filter icon, selected label, themed border/background/focus treatment, and custom chevron.
- Theme the opened option panel and selected/check states for student, teacher, and admin roles.
- Retain route-local width and grid behavior through `className` rather than baking page layout into the component.

### Frozen

- Backend contracts, API requests, permissions, data mutations, and academic procedures.
- Search/filter semantics and option values.
- Navigation, Back behavior, route state, and tabs.
- Mobile implementation and release artifacts.

### Unknown

- Authenticated production screenshots are unavailable unless a valid browser session exists. Component, local browser, CI, deployment, and live-bundle evidence remain valid independent proof classes.

## Considered directions

1. **Shared role-aware component — selected.** One visual and accessibility contract, minimal drift, and small page-level call sites.
2. **Direct Radix conversion per page.** Avoids a wrapper but repeats trigger, icon, option, and theme wiring fourteen times.
3. **Native-select CSS only.** Smallest diff, but the opened menu remains operating-system dependent and does not resolve the reported unfinished appearance.

## Component contract

`TableFilterSelect` owns presentation only.

- Inputs: accessible label, current string value, value-change callback, option list, role variant, optional class name, and optional disabled state.
- Options: stable `value`, visible `label`, and optional disabled state.
- Variants: `student`, `teacher`, and `admin`.
- Output: a Radix trigger and portal-backed option panel; no data fetching, filtering, routing, or domain state.
- Accessibility: named trigger, keyboard navigation, visible focus, selected/check indication, disabled semantics, and sufficient contrast.

## Visual contract

- Compact control height aligned with the adjacent search field.
- Filter icon at the leading edge and chevron at the trailing edge.
- Rounded surface, restrained border, and role-specific focus ring using existing tokens.
- Student: white/elevated surface, navy text, red active/focus accent.
- Teacher: teacher surface/text tokens and teacher red accent.
- Admin: white surface, navy text, subtle blue-gray border, restrained admin red focus accent.
- Dropdown content uses the same role surface and text hierarchy; selected options receive a quiet tinted background rather than decorative gradients.
- Full width on narrow layouts and route-defined compact width where space allows.

## State matrix

| State | Required behavior |
|---|---|
| Default | Current filter label is visible with filter icon and chevron. |
| Open | Options appear above other content without shifting the table. |
| Keyboard focus | Role-colored focus ring is clearly visible. |
| Selected | Current option has a check indicator and themed highlight. |
| Disabled | Trigger is non-interactive and visibly muted. |
| Long label | Text truncates without hiding the chevron. |
| Narrow viewport | Trigger fills available width without horizontal overflow. |
| Loading/error/empty | Existing page-owned states remain unchanged. |

## Implementation slices

1. Add a failing component test that defines role variants, accessible labeling, option selection, disabled behavior, and custom trigger structure.
2. Implement the shared filter component using `src/components/ui/select.tsx`, extending its role support only where required.
3. Add a source-coverage regression that identifies every in-scope table filter and rejects native table-filter selects.
4. Convert the fourteen approved call sites without changing state values or filter functions.
5. Verify focused tests, complete frontend tests, lint/type checks, production build, responsive browser behavior, final diff, exact-SHA CI, Railway deployment, and live frontend bundle.

## Acceptance checks

- No in-scope table filter remains a native HTML select.
- Each trigger visibly belongs to its student, teacher, or admin theme.
- Every existing option still filters the same records.
- Search and filter controls remain paired and responsive.
- Keyboard selection and visible focus work.
- No backend, mobile, route, permission, or academic-procedure contract changes.
- The final pushed SHA passes the required frontend and repository CI/deployment gates.
