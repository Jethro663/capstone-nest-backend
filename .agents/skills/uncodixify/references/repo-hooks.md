# Nexora Repo Hooks

Use this file when applying `uncodixify` inside `capstone-nest-react-lms`.

## Inspect These Files First

- `next-frontend/app/globals.css`
- `next-frontend/src/lib/themes.ts`
- `next-frontend/src/components/layout/Sidebar.tsx`
- `next-frontend/app/(dashboard)/layout.tsx`
- the specific page and shared component files you are editing

## Repo-Specific Notes

- The frontend already defines a global token base with campus-red defaults.
- The repo also contains many effect-heavy role and landing styles in `globals.css`.
- Current visual drift includes:
  - large radii across many surfaces
  - glassy panels and layered gradients
  - hover transforms on routine controls
  - hero chips, decorative labels, and premium-looking filler
  - multiple novelty themes in `src/lib/themes.ts`

## Safe Defaults For This Repo

- Preserve the campus-red core unless the page already belongs to a themed mode the user wants to keep.
- For internal dashboards, prefer solid surfaces, direct headings, readable tables/forms, and restrained borders.
- Tightening this UI usually means removing effect layers before inventing a new palette.
- If touching student theme work, do not add more novelty themes unless the user explicitly asks for them.
