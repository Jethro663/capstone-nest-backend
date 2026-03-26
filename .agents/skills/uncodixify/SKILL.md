---
name: uncodixify
description: De-template frontend design guidance for web UI work. Use when building or refactoring React, Next.js, Tailwind, HTML, or CSS interfaces that should feel less AI-generated, less generic SaaS, more human-designed, more product-shaped, or more aligned with an existing design system; when cleaning up dashboards, forms, tables, settings pages, or landing sections; and when removing visual clutter, fake metrics, glassy shells, badge spam, or template-like styling.
---

# Uncodixify

Turn noisy, template-looking UI into restrained product UI. Preserve an existing design system first. Redesign only when the user asks for it or the current surface is internally inconsistent.

## Workflow

### 1. Inspect before styling

- Read the existing tokens, global CSS, shared layout primitives, and the specific page or component you are changing.
- Reuse the current spacing, radius, border, and typography system when it is coherent enough to keep.
- For this repo, read `references/repo-hooks.md` before major visual changes in `next-frontend`.

### 2. Pick the smallest valid design mode

- `preserve`: keep the current system and clean only the local surface.
- `tighten`: remove noisy AI-like patterns while staying inside the current system.
- `redesign`: introduce a stronger visual reset only when the user explicitly asks or the page is beyond repair.
- Read `references/design-modes.md` when the correct mode is not obvious.

### 3. Remove template signals first

- Cut decorative hero blocks in internal tools, filler KPI cards, ornamental badges, floating shells, fake trend widgets, and copy that only exists to sound premium.
- Prefer sharper hierarchy, denser useful content, and calmer surfaces over more effects.
- Read `references/banned-patterns.md` when you need the explicit anti-pattern list.

### 4. Build from information architecture

- Start from page title, primary actions, filters, core content, and supporting detail.
- Internal product surfaces should favor tables, lists, forms, details, and direct navigation over decorative cards.
- Use motion only for clarity. Most interactions need color, opacity, or border transitions rather than transforms.

### 5. Choose tokens deliberately

- Use project colors and typography first.
- If the project does not provide a coherent palette, read `references/palette-and-type.md`.
- Keep one main accent family, readable contrast, and restrained radii by default.

### 6. Self-audit before finishing

- Ask whether the UI looks like the product or like a generated dashboard template.
- Re-check hierarchy, density, responsiveness, focus states, and empty states.
- If it still looks synthetic, simplify again before shipping.

## Pairing

- Pair with `$role-frontend-auditor` when the user wants UI cleanup plus route-by-route validation.
- Pair with the repo kernel/router as normal. This skill changes how the UI is shaped, not the domain or security rules.

## Load References Only When Needed

- `references/repo-hooks.md`
  - Use for Nexora-specific inspection targets and current visual drift.
- `references/design-modes.md`
  - Use when deciding between preserve, tighten, and redesign.
- `references/banned-patterns.md`
  - Use when removing AI-template artifacts or reviewing a draft.
- `references/palette-and-type.md`
  - Use only when you need fallback palettes, typography direction, or a finishing pass.
