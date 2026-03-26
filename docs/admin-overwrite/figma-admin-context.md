# Admin Figma Context

## Source
- Figma Make preview:
  - file: `Create web frontend (Copy)`
  - tested preview routes came from the shared admin sidebar and top bar
- Repo surfaces compared:
  - `next-frontend/app/(dashboard)/dashboard/admin/*`
  - shared admin-accessible routes: `/dashboard/library`, `/dashboard/notifications`

## Figma Admin Route Inventory

### Core admin routes
- `/dashboard/admin`
  - heading: `Admin Dashboard`
  - visible areas: `Platform Pulse`, `User Mix`, `Quick Routes`, `System Health`
  - visible controls: `Refresh`, `Auto-refresh`, quick-route buttons for users, sections, classes, diagnostics
- `/dashboard/admin/diagnostics`
  - heading: `Diagnostics`
  - visible areas: `Dependency Checks`
  - visible controls: `Refresh`
- `/dashboard/admin/users`
  - heading: `Users`
  - visible controls: `Create User`, state filters, `Filter`, `Export`, search input
- `/dashboard/admin/sections`
  - heading: `Sections`
  - visible controls: `Create Section`, `Active`, `Archived`, search input
- `/dashboard/admin/classes`
  - heading: `Classes`
  - visible controls: `Create Class`, `Active`, `Archived`, search input, select filter
- `/dashboard/admin/roster-import`
  - heading: `Roster Import`
  - visible areas: `Upload Roster File`
  - visible controls: `Upload & Preview`, section select, file input
- `/dashboard/admin/reports`
  - heading: `Reports`
  - visible areas: `Subject Performance`
  - visible controls: `Export`, report tabs for class record, student master list, class enrollment, student performance, interventions, assessment summary, system usage
- `/dashboard/admin/evaluations`
  - heading: `Evaluations`
  - visible controls: search input, module select
- `/dashboard/admin/announcements`
  - heading: `Announcements`
  - visible controls: `Create Announcement`, class select
- `/dashboard/admin/chatbot`
  - heading: `AI Chatbot`
  - visible controls: `New Chat`, prompt suggestions, message input
- `/dashboard/admin/audit`
  - heading: `Audit Trail`
  - visible controls: `Export Log`, search input, select filter
- `/dashboard/admin/profile`
  - heading: `My Profile`
  - visible areas: `Password & Security`
  - visible controls: `Save Changes`, `Update Password`

### Shared admin-accessible surfaces
- `/dashboard/library`
  - heading: `Nexora Library`
  - visible controls: `New Folder`, `My Library`, `General Modules`, search input, select filter
- top-bar notification affordance
  - visible badge button: `2`
  - after click: `View all`
  - implies a notification list or drawer preview plus a full notification route

## Figma Navigation Structure
- Sidebar links in order:
  - `Dashboard`
  - `Diagnostics`
  - `Users`
  - `Sections`
  - `Classes`
  - `Nexora Library`
  - `Roster Import`
  - `Reports`
  - `Evaluations`
  - `Announcements`
  - `AI Chatbot`
  - `Audit Trail`
  - `Profile`
- Top bar structure:
  - welcome text
  - notification badge
  - compact profile/account button

## Repo Alignment Summary
- Every Figma-visible core admin route already exists in the current route tree.
- Shared admin-accessible `Nexora Library` already exists.
- Shared `/dashboard/notifications` already exists, even though the Figma preview exposes it as a top-bar interaction instead of a direct sidebar entry.
- Nested admin CRUD/detail routes already exist in the repo and should inherit the Figma design system even when not shown directly in the preview:
  - `users/create`, `users/[id]`
  - `sections/new`, `sections/[id]/edit`, `sections/[id]/roster`, `sections/[id]/students/add`
  - `classes/new`, `classes/[id]`, `classes/[id]/edit`

## Implementation Reading
- The repo is already partially redesigned for admin pages, but the strongest remaining gaps versus Figma are:
  - shared admin chrome in `Sidebar` and `TopBar`
  - admin treatment for shared routes like library and notifications
  - page headings, action labels, and some section composition details on the main admin routes
- The implementation should treat the Figma preview as the source of truth for admin hierarchy and visual tone, while preserving the current route map and data contracts.
