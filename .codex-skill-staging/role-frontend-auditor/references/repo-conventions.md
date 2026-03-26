# Repo Conventions

## Purpose

Use this reference when running the `role-frontend-auditor` skill against `capstone-nest-react-lms`.

## Fixed Paths

- Frontend app: `next-frontend`
- Backend seed source: `backend/seed-database.js`
- Role route roots:
  - `admin` -> `/dashboard/admin`
  - `teacher` -> `/dashboard/teacher`
  - `student` -> `/dashboard/student`
- Audit artifact directory: `docs/testing`

## Route Discovery Signals

Start with the file tree under:

- `next-frontend/app/(dashboard)/dashboard/admin`
- `next-frontend/app/(dashboard)/dashboard/teacher`
- `next-frontend/app/(dashboard)/dashboard/student`

Confirm shared reachability through:

- `next-frontend/src/components/layout/Sidebar.tsx`
- `next-frontend/app/(dashboard)/dashboard/page.tsx`
- `next-frontend/app/(dashboard)/layout.tsx`
- `next-frontend/src/utils/profile.ts`

Useful shared routes:

- `/dashboard/library`
- `/dashboard/notifications`
- role-specific profile routes from `getProfileRoute`

## Auth and Login Notes

- Login page: `/login`
- Dashboard redirect: `/dashboard`
- The dashboard shell redirects unauthenticated users back to `/login`.
- Incomplete profiles may redirect to `/complete-profile`.
- Seeded credentials come from `backend/seed-database.js`.

Primary seeded credentials at the time this skill was created:

- Admin: `admin@lms.local` / `Test@123`
- Teacher shared password: `Teacher123!`
- Student shared password: `Student123!`

Do not hardcode these in reasoning when the helper script can extract them from the seed file.

## Artifact Requirements

Generate both files on each completed audit:

- `docs/testing/<role>-frontend-audit.md`
- `docs/testing/<role>-frontend-fix-plan.md`

The audit report should contain:

- run summary
- route inventory
- findings
- not exercised actions

The fix plan should contain:

- one section per issue
- probable owner
- source area
- fix intent
- verification step

## Safe Action Policy

By default, include:

- navigation
- tabs and accordions
- search, filter, sort, and pagination
- modals and drawers
- detail views
- reversible form submissions

By default, skip:

- delete
- purge
- archive
- irreversible publish/finalize/post-all actions
- ambiguous writes with unclear impact
