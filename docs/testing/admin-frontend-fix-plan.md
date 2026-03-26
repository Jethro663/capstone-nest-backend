# Admin Frontend Fix Plan

## Summary

- Target role: `admin`
- Issues to address: `2`
- This plan is derived from the latest admin UI sweep and stops before code changes.

## Issues

### 1. Restore a valid favicon for the Next app shell

- Owner: `frontend`
- Source area: `next-frontend/app/layout.tsx` plus the root app static icon asset
- Problem: The auth entry point requests `/favicon.ico`, and the request returns `404`, which adds console noise on every fresh load.
- Fix intent: Add a favicon file under the app root or declare the icon explicitly in root metadata so `/favicon.ico` resolves successfully in both the auth and dashboard shells.
- Verification: Reload `http://localhost:3001/login` and confirm the favicon request returns `200` and the console no longer reports the `404`.

### 2. Add accessible descriptions to library dialogs

- Owner: `frontend`
- Source area: `next-frontend/app/(dashboard)/dashboard/library/page.tsx`
- Problem: Opening library modal dialogs currently triggers Radix accessibility warnings because at least the create-folder and rename dialogs mount `DialogContent` without `DialogDescription` or equivalent `aria-describedby`.
- Fix intent: Add `DialogDescription` content or wire `aria-describedby` for each library dialog, including the create-folder and rename flows, so the dialogs remain compliant and stop emitting console warnings.
- Verification: Open `/dashboard/library`, trigger `New Folder` and `Rename`, and confirm the dialogs render without `Missing Description or aria-describedby` warnings in the console.
