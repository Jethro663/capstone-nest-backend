# Palette And Type

Use project tokens first. This file is only for fallback direction when the product has no clear visual system or when the user explicitly asks for a stronger redesign.

## Palette Rules

- Keep one dominant accent family.
- Favor calm neutrals for surfaces and borders.
- Use contrast for hierarchy before using saturation.
- Internal tools usually need quieter surfaces than marketing pages.

## Fallback Palettes

### Campus Light

- background: `#fcfcfb`
- surface: `#ffffff`
- border: `#e5e7eb`
- text: `#0f172a`
- muted text: `#64748b`
- accent: `#dc2626`

### Slate Utility

- background: `#f8fafc`
- surface: `#ffffff`
- border: `#dbe2ea`
- text: `#0f172a`
- muted text: `#475569`
- accent: `#0f766e`

### Warm Neutral

- background: `#faf7f2`
- surface: `#ffffff`
- border: `#e7ddd0`
- text: `#1f2937`
- muted text: `#6b7280`
- accent: `#b45309`

### Quiet Dark

- background: `#0b1220`
- surface: `#111827`
- border: `#1f2937`
- text: `#e5e7eb`
- muted text: `#94a3b8`
- accent: `#38bdf8`

## Typography Rules

- Reuse the project's existing font stack when possible.
- If you need a new sans direction, prefer one deliberate family such as `Manrope`, `Public Sans`, `Instrument Sans`, or `IBM Plex Sans`.
- Keep body copy in the readable 14px to 16px range for product UI.
- Use direct headings instead of eyebrow-plus-headline stacks.
- Avoid mixing too many font voices in one surface.

## Radius And Motion Defaults

- start with `8px` to `14px` radii for most internal UI surfaces
- reserve larger radii for rare emphasis, not the whole screen
- keep transitions around `120ms` to `200ms`
- prefer color, border, and opacity changes over transform-based hover motion
