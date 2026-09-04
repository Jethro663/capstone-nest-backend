# Landing Gallery Hotfix Design

## Goal

Remove the lower Nexora artwork from the school-first landing page and make every gallery photo change feel smooth without weakening accessibility or the restrained institutional design.

## Approved Direction

The Nexora section keeps its two-column composition, but its left side becomes a code-native school-to-digital-campus bridge instead of an image. The panel uses typography, a simple route line, and two concise endpoints—GABHS and Nexora—to communicate continuity from the physical school to its online learning space. It must not resemble a fake dashboard, add product metrics, or introduce another decorative asset.

The gallery uses a true crossfade for the selected photograph. The outgoing and incoming photographs briefly overlap in the same stage, with opacity as the primary transition and only a very small scale settle for polish. The transition lasts 360 milliseconds. When `prefers-reduced-motion` is active, the selected photograph changes immediately with no scale or timed animation.

## Component Boundaries

- `SchoolLandingPage.tsx` owns the replacement bridge content and keeps all existing Nexora links and feature copy.
- `SchoolGallery.tsx` owns the selected-photo transition and continues to expose the same `photos: readonly SchoolPhoto[]` interface.
- `globals.css` owns the bridge composition and stage-frame geometry. It does not introduce application-wide tokens.
- Existing landing and gallery tests protect removal of `/NexoraHome.png`, presence of the replacement panel, and keyed transition state when the selected photograph changes.

## Accessibility and Responsive Behavior

The replacement panel has a concise accessible label and readable text; its route line is decorative. The gallery keeps one meaningful image alternative per active stage, all real button controls, live caption updates, and the existing focus-managed enlarged view. At tablet and mobile widths, the replacement panel becomes the first full-width portion of the Nexora section and remains typographic rather than image-like.

## Verification

Run the two focused landing suites first, then frontend type checking, linting, the full Jest suite, and a production build. Visually verify the transition and replacement panel at desktop and mobile widths before release.

## Self-Review

- No placeholder copy or undefined component contract remains.
- The change is limited to the public landing page and its tests.
- The design removes an image instead of silently replacing it with another asset.
- Reduced-motion behavior and dialog accessibility remain explicit requirements.
