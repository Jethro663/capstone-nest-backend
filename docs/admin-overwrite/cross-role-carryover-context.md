# Cross-Role Carryover Context

## Purpose
- Preserve the admin overwrite context so the later teacher and student Figma passes do not repeat the same shell discovery work.
- Record only the shared or likely reusable changes that matter outside admin.

## Shared Surfaces Touched by the Admin Overwrite
- `Sidebar`
  - admin nav order should follow the Figma preview
  - teacher and student nav entries must remain intact
  - any structural sidebar changes should be role-aware, not global by accident
- `TopBar`
  - admin needs the Figma-style welcome line, notification badge, and compact profile affordance
  - teacher/student top bars should keep their own behavior unless intentionally bridged
  - unread notification count is already available from `NotificationProvider`
- protected dashboard layout
  - shell changes should remain compatible with `/dashboard/student`, `/dashboard/teacher`, `/dashboard/admin`, `/dashboard/library`, and `/dashboard/notifications`
- shared routes
  - `/dashboard/library` and `/dashboard/notifications` must support admin styling now, but should later accept teacher/student-specific shells without forking route behavior
- shared profile/security
  - `RoleProfilePage` and `ProfileSecurityCard` already bridge role treatments; future teacher/student redesigns can reuse the same structural composition with role-specific tokens
- shared reports and evaluations bridges
  - admin currently uses shared shells for reports/evaluations; any reusable admin primitives should stay generic enough to support later teacher/student Figma alignment

## Reusable Admin-Derived Primitives
- page hero shell with badge, title, description, actions, and stat cards
- role-aware sidebar treatment
- role-aware top-bar notification badge pattern
- filter shell, table shell, grid card shell, empty state shell
- confirmation and drawer/dialog presentation helpers

## Teacher Follow-Up Notes
- teacher already has its own visual language; do not force the admin palette onto teacher
- teacher can likely reuse:
  - tighter header composition
  - clearer notification affordance
  - improved table/filter shells
- teacher/admin currently share the class detail implementation path:
  - `app/(dashboard)/dashboard/admin/classes/[id]/page.tsx` re-exports the teacher class workspace
  - any future teacher Figma pass on class detail will also affect admin unless that route is intentionally split
- teacher should keep separate:
  - palette
  - dashboard hero tone
  - learning/workload-specific card semantics

## Student Follow-Up Notes
- student should not inherit the admin shell structure directly
- student can likely reuse:
  - better notification badge behavior
  - cleaner shared-route handling for notifications
  - any non-admin-specific data view helpers
- student should keep separate:
  - top-level layout rhythm
  - tutoring and course-focused interaction model
  - student theme system and launcher behavior

## Implementation Guardrails
- No admin shell refactor should silently regress teacher/student navigation.
- Shared route styling must be explicitly role-aware.
- Any shared primitive introduced for admin should expose role-aware class hooks rather than hardcoding admin visuals.
