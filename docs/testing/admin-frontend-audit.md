# Admin Frontend Audit

## Run Summary

- Role: `admin`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Routes discovered: `23`
- Findings: `0`
- Severity counts: `{}`
- Screenshot-source verification completed for the captured admin routes:
  - `/dashboard/admin`
  - `/dashboard/admin/users`
  - `/dashboard/admin/sections`
  - `/dashboard/admin/classes`
  - `/dashboard/admin/diagnostics`
- Safe interactive checks completed in Playwright on:
  - users status tabs and search/export shell
  - sections status tabs and table actions
  - classes grade filter shell and table/grid toggle
  - diagnostics refresh button

## Route Inventory

- `/dashboard/admin`
- `/dashboard/admin/announcements`
- `/dashboard/admin/audit`
- `/dashboard/admin/chatbot`
- `/dashboard/admin/classes`
- `/dashboard/admin/classes/new`
- `/dashboard/admin/classes/[id]`
- `/dashboard/admin/classes/[id]/edit`
- `/dashboard/admin/diagnostics`
- `/dashboard/admin/evaluations`
- `/dashboard/admin/profile`
- `/dashboard/admin/reports`
- `/dashboard/admin/roster-import`
- `/dashboard/admin/sections`
- `/dashboard/admin/sections/new`
- `/dashboard/admin/sections/[id]/edit`
- `/dashboard/admin/sections/[id]/roster`
- `/dashboard/admin/sections/[id]/students/add`
- `/dashboard/admin/users`
- `/dashboard/admin/users/create`
- `/dashboard/admin/users/[id]`
- `/dashboard/library`
- `/dashboard/notifications`

## Findings

- No findings were recorded.

## Not Exercised

- Delete, purge, archive, suspend, and other destructive mutations were skipped for this focused post-rewrite audit pass.
- Nested CRUD detail routes were inventoried but not exhaustively exercised in this pass.
- Roster import file upload/commit flow was not exercised.
- Announcement create/edit/delete mutations were not exercised.
- Library upload, rename, publish, and delete mutations were not exercised.
- Notification mark-read and mark-all-read writes were not exercised.
