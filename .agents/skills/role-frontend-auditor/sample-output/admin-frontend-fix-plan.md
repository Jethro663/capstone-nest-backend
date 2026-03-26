# Admin Frontend Fix Plan

## Summary

- Target role: `admin`
- Issues to address: `1`
- This plan is derived from the latest audit evidence and stops before code changes.

## Issues

### 1. Users page search throws client error

- Owner: `frontend`
- Source area: `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`
- Problem: The page crashes after the first keypress.
- Fix intent: Guard the search-state normalization path so undefined collection data cannot be filtered before load completes.
- Verification: Repeat the admin Users search flow and confirm the table filters without a console error.

