---
name: role-frontend-auditor
description: Role-scoped frontend integration auditing for this LMS repo using Serena for route/action discovery and Playwright for browser execution. Use when the user asks to complete testing for admin, teacher, or student; to check every button or action for a role; or to run a frontend integration audit, UI flow audit, or role regression sweep in `next-frontend`.
---

# Role Frontend Auditor

Audit the `next-frontend` app for one role at a time. Discover reachable role pages and likely owning source files with Serena, log in with seeded credentials from `backend/seed-database.js`, exercise safe UI actions with Playwright, then emit a Markdown audit report and a decision-complete fix plan.

## Quick Start

Use this skill when the user asks for any of these patterns:

- `complete testing for admin`
- `complete testing for teacher`
- `complete testing for student`
- `check every button for the admin role`
- `run a role regression sweep for teacher`
- `audit the student frontend integration`

Treat the target role as required. Supported roles are `admin`, `teacher`, and `student`.

## Workflow

### 1. Lock the role and scope

- Parse the role from the prompt.
- Default to safe transactional coverage.
- Do not expand into destructive actions unless the user explicitly asks.
- Keep the audit repo-specific:
  - frontend root: `next-frontend`
  - credential seed: `backend/seed-database.js`
  - role route roots: `/dashboard/admin`, `/dashboard/teacher`, `/dashboard/student`
  - artifact outputs: `docs/testing/<role>-frontend-audit.md` and `docs/testing/<role>-frontend-fix-plan.md`

### 2. Discover reachable pages before clicking anything

- Use Serena first. Do not rely only on visible runtime buttons.
- Enumerate the role route tree under `next-frontend/app/(dashboard)/dashboard/<role>`.
- Inspect shared routing/auth helpers to confirm access and shared pages:
  - `next-frontend/src/components/layout/Sidebar.tsx`
  - `next-frontend/app/(dashboard)/dashboard/page.tsx`
  - `next-frontend/app/(dashboard)/layout.tsx`
  - `next-frontend/src/utils/profile.ts`
- Include shared pages only when they are reachable by the role, such as:
  - `/dashboard/library`
  - `/dashboard/notifications`
  - role-specific profile page
- Build a route inventory before opening Playwright.

### 3. Load seeded credentials deterministically

- Use `scripts/extract_seed_credentials.py` to read `backend/seed-database.js`.
- For `admin`, use the primary seeded admin account.
- For `teacher` and `student`, use the first seeded account as the primary login and keep the full list available for follow-up checks.
- If the seed script format changes and the helper fails, inspect the file manually and state the exact mismatch in the report.

### 4. Start or reuse the app

- Reuse an already running `next-frontend` dev server when possible.
- Otherwise start the frontend in `next-frontend`, normally on port `3001`.
- If the backend is required for real data-backed interaction, confirm it is reachable before the browser run.
- Respect tool/runtime approval rules. This skill does not bypass sandboxing or approval prompts.

### 5. Execute the audit with Playwright

- Log in through the real UI.
- Visit every discovered route for the requested role.
- Exercise safe actions on each page where available:
  - navigation links
  - buttons that open views, tabs, drawers, dialogs, or details
  - search, filter, sort, pagination, and view toggles
  - reversible or demo-safe form submissions
- drill-down flows that stay within the role's allowed routes
- Capture console messages and failed network requests when they clarify the issue source.
- Prefer explicit selectors and labels over brittle positional clicks.

### 6. Skip destructive actions unless explicitly requested

Default skip list:

- delete, purge, remove, archive
- irreversible publish/finalize/post-all flows
- bulk destructive actions
- ambiguous writes where the effect is not obviously reversible

Record skipped actions in the audit artifact under `Not Exercised`.

### 7. Convert evidence into artifacts

- Normalize findings into a JSON-like structure with:
  - `route`
  - `action`
  - `symptom`
  - `evidence`
  - `owner`
  - `source`
  - `severity`
  - `repro`
- Use `scripts/render_audit_report.py` to generate:
  - `docs/testing/<role>-frontend-audit.md`
  - `docs/testing/<role>-frontend-fix-plan.md`
- Each failure must include:
  - route
  - action attempted
  - observed symptom
  - visible error text, console/network evidence, or both when available
  - likely owning source file or subsystem

### 8. Build the fix plan from evidence, not guesses

- Group issues by concrete failure, not by file list.
- For each issue, state:
  - probable owner: frontend, backend, or integration contract
  - likely source area
  - exact fix intent
  - verification step after the fix
- Keep the plan implementation-ready, but stop before editing code unless the user explicitly asks.

## Tool Priorities

- Use Serena first for route discovery and source ownership clues.
- Use Playwright for execution, screenshots, snapshots, console logs, and network evidence.
- Use the bundled scripts for deterministic credential extraction and Markdown rendering.
- Use shell commands only for starting or checking local services.

## Bundled Resources

- `references/repo-conventions.md`
  - Repo-specific route, auth, and artifact conventions for this LMS project.
- `references/prompt-contracts.md`
  - Accepted prompt shapes, output requirements, and safe-action rules.
- `scripts/extract_seed_credentials.py`
  - Converts `backend/seed-database.js` into normalized JSON credentials.
- `scripts/render_audit_report.py`
  - Converts normalized findings into the required Markdown audit and fix-plan artifacts.

## Constraints

- This skill is optimized for this repo. Do not present it as a generic web audit framework.
- "Check every button" means "exercise every reachable safe action for the requested role," not blind clicking.
- If runtime approvals block Playwright or service startup, request approval through the normal tool flow and note that the run is pending approvals.
