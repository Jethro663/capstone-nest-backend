# Admin Frontend Audit

## Run Summary

- Role: `admin`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Seeded login used: `admin@lms.local`
- Routes exercised: `23`
- Findings: `2`
- Severity counts: `{'low': 2}`
- Safe actions exercised: sidebar navigation, dashboard redirect, refresh controls, tabs, search, filters, view toggles, detail views, modal open/close flows, direct drill-down route loads, chatbot suggestion prompt, library read flow, and notification filters.

## Route Inventory

- `/dashboard`
- `/dashboard/admin`
- `/dashboard/admin/diagnostics`
- `/dashboard/admin/users`
- `/dashboard/admin/users/create`
- `/dashboard/admin/sections`
- `/dashboard/admin/sections/new`
- `/dashboard/admin/sections/223c00c3-0e7d-4673-b22d-3493ead3bbc2/edit`
- `/dashboard/admin/sections/223c00c3-0e7d-4673-b22d-3493ead3bbc2/roster`
- `/dashboard/admin/sections/223c00c3-0e7d-4673-b22d-3493ead3bbc2/students/add`
- `/dashboard/admin/classes`
- `/dashboard/admin/classes/new`
- `/dashboard/admin/classes/03e2f5ef-382f-4a4a-b231-c564d9052824`
- `/dashboard/admin/classes/03e2f5ef-382f-4a4a-b231-c564d9052824/edit`
- `/dashboard/admin/roster-import`
- `/dashboard/admin/reports`
- `/dashboard/admin/evaluations`
- `/dashboard/admin/announcements`
- `/dashboard/admin/chatbot`
- `/dashboard/admin/audit`
- `/dashboard/admin/profile`
- `/dashboard/library`
- `/dashboard/notifications`

## Findings

### 1. Missing favicon produces a console 404 on the auth entry point

- Severity: `low`
- Route: `/login`
- Action: Load the seeded admin login page before authentication
- Symptom: The login page loads, but the browser console records a missing static asset request for the favicon.
- Owner: `frontend`
- Source: `next-frontend/app/layout.tsx` and missing `next-frontend/app/favicon.*`
- Evidence: Browser console error: `Failed to load resource: the server responded with a status of 404 (Not Found) @ http://localhost:3001/favicon.ico:0`. A repo search found no favicon asset under `next-frontend/app`, and the root metadata does not declare an icon override.
- Repro: Open `http://localhost:3001/login`, then inspect the browser console before signing in.

### 2. Library modal dialogs emit Radix accessibility warnings when opened

- Severity: `low`
- Route: `/dashboard/library`
- Action: Open the `New Folder` dialog during the admin library sweep
- Symptom: The dialog opens and can be cancelled, but the browser console emits accessibility warnings because the dialog content is missing descriptive wiring.
- Owner: `frontend`
- Source: `next-frontend/app/(dashboard)/dashboard/library/page.tsx`
- Evidence: Browser console warnings after opening library dialogs: `Warning: Missing Description or aria-describedby`. Source inspection shows the page imports `DialogDescription` nowhere and renders `DialogContent` blocks for the create-folder and rename flows without a matching description near lines 600-653.
- Repro: Sign in as admin, open `/dashboard/library`, click `New Folder`, and inspect the console while the modal is open.

## Not Exercised

- Destructive account actions were skipped: `Suspend User`, permanent user deletion, and any purge path.
- Destructive section actions were skipped: `Archive`, `Purge Section`, and any irreversible section mutation.
- Destructive class actions were skipped: `Archive`, permanent class deletion, and any irreversible class mutation.
- Library destructive or publish-side actions were skipped: `Delete`, `Publish`, upload submission, and rename submission.
- Creation forms were opened but not submitted on `/dashboard/admin/users/create`, `/dashboard/admin/sections/new`, and `/dashboard/admin/classes/new`.
- Roster import upload submission was not exercised because it mutates seeded data in bulk.
- The source-declared direct route `/dashboard/admin/users/[id]` was not exercised directly because the safe UI flow exposes `View Details` from the list but did not surface a stable user id in the DOM for deterministic direct navigation during this run.
