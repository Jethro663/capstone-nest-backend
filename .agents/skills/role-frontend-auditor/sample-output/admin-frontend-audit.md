# Admin Frontend Audit

## Run Summary

- Role: `admin`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://127.0.0.1:3001`
- Routes discovered: `2`
- Findings: `1`
- Severity counts: `{'high': 1}`

## Route Inventory

- `/dashboard/admin`
- `/dashboard/admin/users`

## Findings

### 1. Users page search throws client error

- Severity: `high`
- Route: `/dashboard/admin/users`
- Action: `Type into the user search input`
- Symptom: The page crashes after the first keypress.
- Owner: `frontend`
- Source: `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`
- Evidence: Browser console shows a TypeError in the users page state update path.
- Repro: Log in as admin, open Users, type one character into the search input.

## Not Exercised

- Delete user buttons were skipped by default policy.
