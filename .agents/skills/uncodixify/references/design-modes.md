# Design Modes

Pick the smallest mode that solves the task.

## Preserve

Use when:

- the current page already fits the product language
- the task is a small feature addition or bug fix
- the user did not ask for redesign

Allowed moves:

- align spacing, borders, and typography with nearby components
- simplify one or two noisy details
- improve layout density and responsiveness

Avoid:

- changing the page's whole visual direction
- inventing new tokens for a local change

## Tighten

Use when:

- the page works but feels template-like or over-designed
- styles drift from the rest of the product
- the user asks for "cleaner", "more human", or "less AI-looking"

Allowed moves:

- reduce gradients, glow, badge clutter, hover transforms, and oversized radii
- replace filler cards with clearer content blocks
- convert decorative copy into direct labels and headings

Avoid:

- creating a brand-new design system
- swapping palettes unless the current one is clearly broken

## Redesign

Use when:

- the user explicitly asks for a redesign
- the page is structurally incoherent and cannot be tightened cleanly
- marketing or landing work needs a different surface language than internal tools

Allowed moves:

- reset layout structure
- replace token choices
- introduce a new composition pattern that better fits the product

Guardrails:

- keep the information architecture honest
- do not fake product depth with placeholder charts or ornamental copy
- keep accessibility and responsiveness intact
