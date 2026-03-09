# Student Theme System

## What shipped
- Added a client-side theme provider with local persistence through `localStorage`.
- Added three student themes: `nexora-red`, `dark`, and `soft-ocean`.
- Added an animated theme selector in the student dashboard top bar.
- Refactored the main student-facing chrome and profile surfaces to use semantic CSS variables instead of hard-coded red/slate colors.

## Architecture
- Source of truth: `src/lib/themes.ts`
- Provider and hook: `src/providers/ThemeProvider.tsx`
- Selector UI: `src/components/layout/StudentThemeSwitcher.tsx`
- Theme tokens: `app/globals.css`

## How it works
- The selected theme is stored under `nexora-student-theme`.
- The provider applies `data-theme` and `data-student-route` to the root document element.
- Student pages read from `--student-*` semantic tokens, so new themes can be added by:
  - adding a new `ThemeId` and metadata entry
  - adding a CSS variable override block in `app/globals.css`

## Current scope
- The richer theme visuals and selector are active on student dashboard routes.
- Teacher, admin, landing, and auth flows keep their current behavior.
