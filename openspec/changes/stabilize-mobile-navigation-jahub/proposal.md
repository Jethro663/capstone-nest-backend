## Why

Teacher and administrator mobile navigation currently renders six equal-width destinations, which displaces the teacher focal button and causes labels to crowd or clip on narrow Android devices. Student JAHUB Ask is also embedded as a fixed-height card inside a page scroller, making the conversation harder to follow than a screen-owned chat flow.

## What Changes

- Standardize student, teacher, and administrator bottom navigation on five explicit role-owned destinations.
- Keep only the student JA destination elevated and centered; teacher and administrator destinations remain flat.
- Keep Announcements reachable for teachers through Teacher More and add an administrator Home quick launch backed by a stack route.
- Make the bottom-bar surface cover the device safe area and enforce usable touch targets, single-line labels, and accessibility labels.
- Replace the JAHUB Ask card with a full-screen, preset-only conversation workspace while preserving Replay, Learner's Path, activity history, citations, guardrails, APIs, and route parameters.
- Add deterministic thread-resume, new-chat, lesson-selection, and stale-context states without adding free-text input, streaming, dependencies, or backend changes.

## Capabilities

### New Capabilities

- `mobile-navigation-stability`: Role-explicit five-destination navigation, centered student JA treatment, safe-area coverage, and truthful secondary access to Announcements.
- `mobile-jahub-conversation`: A screen-owned, preset-only JAHUB Ask conversation with deterministic thread and lesson context behavior.

### Modified Capabilities

- None. The active mobile parity change is clarified in place so domain reachability does not require every domain to remain a permanent tab.

## Impact

- Affected code is limited to `mobile/src/navigation`, `mobile/src/components/ui`, `mobile/src/components/ja`, `mobile/src/screens`, and their Jest tests.
- `BottomTabBar` gains an explicit role prop and the root stack gains an `AdminAnnouncements` route.
- Existing backend endpoints, request/response envelopes, storage, dependencies, and database state are unchanged.
