# Student Mobile Parity Design

Date: 2026-04-17
Repo: `capstone-nest-react-lms`
Target: `test-mobile/`
Source of truth: `next-frontend/app/(dashboard)/dashboard/student/*` and matching `next-frontend/src/services/*`

## Goal

Update `test-mobile` so the student mobile app can do everything the current student web app can do, using the real live backend API and matching the web UI structure as closely as practical on a phone screen.

This is parity work, not a native redesign. The web student experience is the product baseline.

## In Scope

The mobile target covers the full current student route surface from `next-frontend/app/(dashboard)/dashboard/student`:

- dashboard home
- announcements
- assessment history
- assessments list
- assessment detail
- assessment take
- assessment results
- chatbot
- classes list
- class detail
- module detail
- courses
- JA
- lessons list
- lesson detail
- LXP
- performance
- profile
- transcript

## Out Of Scope

- Teacher and admin mobile parity
- Placeholder or mock data for missing contracts
- A separate mobile-specific information architecture
- Backend feature redesign unrelated to parity

## Product Constraints

- Mobile must use real backend data only.
- Mobile should preserve the web feature set and user expectations.
- Visual parity is preferred over a native reinterpretation.
- If a backend contract is missing or incompatible with mobile, surface it as a concrete blocker instead of faking a UI state.
- Existing `test-mobile` auth, secure storage, and student-only assumptions must remain intact.

## Current Gap Summary

`test-mobile` already has partial student coverage for login, classes, announcements, assessments, JA, LXP, profile, performance, and AI tutor. It does not yet represent the full web student route tree or the full service/type surface required for parity.

Known missing or incomplete parity areas include:

- student dashboard home parity
- courses
- assessment history
- transcript
- richer class detail parity
- module detail parity
- lesson detail parity
- web-aligned navigation depth for student flows
- any missing API service wrappers and request/response types required by the web features

## Architecture

### Source of Truth

The mobile implementation will follow the web student implementation directly:

- route inventory from `next-frontend/app/(dashboard)/dashboard/student/*`
- backend-facing capabilities from `next-frontend/src/services/*`
- mobile implementation in `test-mobile/src/navigation/*`, `src/screens/*`, `src/api/services/*`, and `src/types/*`

### Navigation Model

`test-mobile` will be reshaped into a student route hierarchy that mirrors the web feature tree instead of keeping the current smaller tab-only shell.

The student navigation will include:

- root authenticated student stack
- tab entry points for the highest-frequency student areas
- nested detail routes for class, module, lesson, assessment, results, history, transcript, course, and profile-related flows
- direct navigability to every parity screen from a reachable mobile path

The exact tab composition can differ slightly from web sidebars if required by mobile space, but the reachable screen set and flow semantics must stay aligned with the web app.

### Data Layer

Each screen will consume backend data through repo-native mobile service wrappers rather than ad hoc fetch logic.

Rules:

- expand `test-mobile/src/api/services/*` until every required student web capability has a mobile equivalent
- keep `test-mobile/src/types/*` aligned with backend and web contract shapes
- preserve React Query and existing mobile provider patterns
- keep mobile auth on secure storage and mobile auth endpoints
- do not bypass mobile service wrappers from screens

### UI Parity

UI should remain as close as possible to the web student pages:

- same content hierarchy
- same primary actions
- same terminology and status labels
- same visual sections and emphasis where practical

Adaptations allowed only where required by phone constraints:

- vertical stacking instead of side-by-side panels
- scroll sections instead of full-width desktop rails
- condensed controls where touch targets still remain usable

## Execution Plan

Work will be implemented in vertical slices so each slice can be verified against the live API before more complexity is added.

### Slice 1: Navigation shell and dashboard parity

- align student navigator with the web route inventory
- add dashboard home parity screen and wire primary entry actions
- confirm auth, boot, and student entry routing still work

### Slice 2: Classes, modules, lessons, and courses

- classes list parity
- class detail parity
- module detail parity
- lessons list parity
- lesson detail parity
- courses parity

### Slice 3: Assessments end-to-end

- assessments list parity
- assessment detail parity
- assessment take parity
- assessment results parity
- assessment history parity
- submission behavior, including any supported write flows required for parity

### Slice 4: Student support and growth surfaces

- announcements parity
- JA parity
- LXP parity
- chatbot parity
- performance parity

### Slice 5: Student identity and records

- profile parity
- transcript parity

### Slice 6: Full Android parity pass

- run through the complete student flow in Android using live API data
- fix navigation, rendering, contract, and action regressions found during ADB verification

## Verification Strategy

Verification is required per touched slice, not only at the end.

For each slice:

- run `npm run typecheck` in `test-mobile`
- run `npm run test` where existing coverage applies to touched logic
- boot Expo Android
- verify the touched student flow against live backend data

For broader parity checkpoints:

- compare the mobile screen inventory to the current web route inventory
- confirm each web student route has a reachable mobile counterpart
- confirm each primary web action has a mobile equivalent
- recheck auth, refresh, logout, and a representative data-backed flow after auth-adjacent changes

ADB/manual verification should explicitly cover:

- login
- dashboard entry
- class navigation
- lesson navigation
- assessment start and result flows
- AI/chatbot access
- profile
- transcript

## Risk Areas

- mobile route growth may expose gaps in current typed navigation
- some web services may not yet have mobile wrappers or exact type parity
- assessment write flows may reveal backend contract assumptions made only for web
- transcript or file-related flows may depend on formats that need mobile-safe handling
- parity pressure may tempt screen-level duplication unless common UI/data helpers are introduced carefully

## Decision Rules During Implementation

- prefer parity correctness over implementation speed
- do not fake missing backend data
- do not silently omit a web student feature
- if a flow cannot be implemented because of a backend or contract limitation, document the exact blocker and stop approximating
- keep unrelated subsystem edits out unless required for parity

## Success Criteria

This work is complete when all current student web capabilities have a corresponding mobile implementation in `test-mobile`, using real backend data, and the Android flow can complete the same core student tasks the web app can complete.

Minimum acceptance checks:

- every current student web route has a reachable mobile counterpart
- student can authenticate and stay authenticated on mobile
- student can browse classes, modules, lessons, courses, announcements, JA, LXP, performance, profile, transcript, and chatbot
- student can complete assessment-related flows available on the web
- mobile behavior is verified on Android against the live backend

## Open Assumptions

- the current student web route tree is the intended parity baseline
- the backend already exposes the required student capabilities used by the web app
- `test-mobile` remains student-scoped for this work
- small viewport adaptations are acceptable as long as capability and structure remain aligned with the web
