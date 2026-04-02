# JA Student Portal Reference

Reference image path:
- `docs/design-references/ja/ja-student-portal-reference.png`

Purpose:
- Use this file as the visual anchor for the JA hub redesign (`/dashboard/student/ja`) while keeping real backend contracts and student-shell conventions intact.

Live mapping:
- Left mode cards map to real mode state: `practice`, `ask`, `review`.
- Center chat/mission shell maps to mode-specific interaction:
  - `Ask`: JA thread conversation and grounded reply flow.
  - `Practice`: objective session flow.
  - `Review`: interleaved coached replay session flow.
- Right rail maps to JA hub metrics from API:
  - mastery ring (class-level score proxy),
  - JA XP / streak / sessions,
  - badge unlock state.

Visual-only guidance:
- Mascot/robot presence and greeting tone should stay consistent across all modes.
- Keep high-fidelity section hierarchy from reference, but prefer live values from JA APIs over placeholder numbers.
- If a metric is unavailable, show a graceful empty state rather than fabricated academic values.

Implementation note:
- This reference is for desktop-first visual hierarchy; keep responsive collapse behavior usable on tablet/mobile.
