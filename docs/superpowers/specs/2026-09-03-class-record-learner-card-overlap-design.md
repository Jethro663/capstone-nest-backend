# Class Record Learner Card Overlap Design

## Problem

The grade grid combines a `width: max-content` table with sticky learner cells that have only a minimum width. A long learner name or eligibility message can therefore widen the entire sticky column. In a 500px browser fixture, the intended 190px learner column expanded to approximately 376px and covered about 300px of the score area while horizontally scrolling.

The fixed-height density rules make a second failure possible if long text is later constrained without restoring normal table-cell sizing: wrapped identity text could escape a grid-styled `<th>` instead of increasing the row height.

## Considered Approaches

1. **Constrain the sticky cell and use an inner learner-card layout — selected.** Keep the learner column sticky, give it a deliberate responsive width, retain the `<th>` as a table cell, and place the badge and identity in a nested grid. Names and supporting text wrap inside that grid, allowing the table row to grow when necessary.
2. **Remove sticky learner names.** This eliminates overlay behavior but makes wide gradebooks harder to scan and conflicts with the approved workbook design.
3. **Keep intrinsic sizing and truncate all learner metadata.** This limits growth only if every descendant is carefully clipped, but it hides useful eligibility information and remains fragile when new identity labels are added.

## Selected Design

- Use a 260px learner column for normal layouts and 220px below 560px.
- Keep the learner `<th>` in normal table-cell layout; a nested learner card owns the two-column badge-and-text grid.
- Let names and eligibility text wrap with safe word breaking. The 44px comfortable and 36px compact values remain minimum row heights rather than clipping boundaries.
- Apply the same controlled-width principle to learner cells in Eligibility, Annual, and History tables so the shared workbook does not reintroduce the defect in another tab.
- Preserve sticky behavior, surname-band colors, typography, score behavior, filtering, permissions, and backend contracts.

## Verification

- A component test requires the nested learner-card structure.
- A credential-free Playwright fixture loads the production CSS module, injects a long learner name and status, and checks bounded column width, badge/text separation, row-to-row separation, and horizontal-scroll containment at desktop and mobile widths.
- Existing class-record tests, the full frontend Jest suite, typecheck, lint, and production build must pass before commit and push.
