# Backend Gap Analysis

## Classification Rules
- `covered`: the current frontend and backend contract already supports the Figma interaction
- `frontend-only`: the data contract exists and the work is only shell/layout/composition
- `missing-contract`: a Figma interaction requires new backend data or a new payload shape

## Route-to-Contract Map

### Dashboard
- route: `/dashboard/admin`
- frontend callers:
  - `dashboardService.getAdminStats()`
  - `analyticsService.getAdminOverview()`
  - `adminService.getUsageSummary()`
- backend coverage:
  - `GET /api/admin/dashboard/stats`
  - `GET /api/analytics/admin/overview`
  - `GET /api/admin/usage-summary`
- status: `covered`
- notes:
  - remaining work is mainly layout and control fidelity

### Diagnostics
- route: `/dashboard/admin/diagnostics`
- frontend callers:
  - `adminService.getHealthLive()`
  - `adminService.getHealthReadiness()`
- backend coverage:
  - `GET /api/health/live`
  - `GET /api/health/ready`
- status: `covered`

### Users
- route: `/dashboard/admin/users`
- frontend callers:
  - `userService.getAll()`
  - `userService.create()`
  - `userService.update()`
  - `userService.suspend()`
  - `userService.reactivate()`
  - `userService.softDelete()`
  - `userService.exportUser()`
  - `userService.purge()`
  - `userService.resetPassword()`
- backend coverage:
  - users controller supports list/detail/create/update/suspend/reactivate/soft delete/export/purge/reset password
- status: `covered`

### Sections
- route family: `/dashboard/admin/sections*`
- frontend callers:
  - `sectionService.getAll()`
  - `sectionService.getById()`
  - `sectionService.create()`
  - `sectionService.update()`
  - `sectionService.archive()`
  - `sectionService.restore()`
  - `sectionService.permanentDelete()`
  - `sectionService.getRoster()`
  - `sectionService.getCandidates()`
  - `sectionService.addStudents()`
  - `sectionService.removeStudent()`
  - `sectionService.getStudentProfile()`
- backend coverage:
  - sections controller supports list/detail/create/update/delete/restore/permanent delete/roster/candidates/student profile
- status: `covered`

### Classes
- route family: `/dashboard/admin/classes*`
- frontend callers:
  - `classService.getAll()`
  - `classService.getById()`
  - `classService.create()`
  - `classService.update()`
  - `classService.toggleStatus()`
  - `classService.hide()`
  - `classService.unhide()`
  - `classService.delete()`
  - `classService.purge()`
  - `classService.getEnrollments()`
  - `classService.getCandidates()`
  - `classService.enrollStudents()`
  - `classService.removeStudent()`
  - `classService.updatePresentation()`
  - `classService.uploadBanner()`
- backend coverage:
  - classes controller supports the matching CRUD, archive, purge, visibility, enrollment, and presentation actions
- status: `covered`

### Nexora Library
- route: `/dashboard/library`
- frontend callers:
  - `fileService.getFolders()`
  - `fileService.getAll()`
  - `fileService.createFolder()`
  - `fileService.updateFolder()`
  - `fileService.deleteFolder()`
  - `fileService.upload()`
  - `fileService.update()`
  - `fileService.download()`
  - `fileService.delete()`
  - `classService.getAll()` or `classService.getByTeacher()`
- backend coverage:
  - files controller and classes controller already back the library route
- status: `covered`
- notes:
  - admin currently reuses the teacher shell, so the main change is frontend treatment, not contract coverage

### Roster Import
- route: `/dashboard/admin/roster-import`
- frontend callers:
  - `rosterImportService.preview()`
  - `rosterImportService.commit()`
  - `rosterImportService.getPending()`
  - `rosterImportService.resolvePending()`
  - `sectionService.getAll()`
- backend coverage:
  - roster-import controller supports preview, commit, pending list, and resolve
- status: `covered`

### Reports
- route: `/dashboard/admin/reports`
- frontend callers:
  - `reportService.*`
  - `classRecordService.*`
  - `dashboardService.*`
  - `classService.*`
- backend coverage:
  - reports, class-record, admin dashboard, and classes controllers already provide the current report data
- status: `covered`
- notes:
  - the expected work is primarily visual and navigational

### Evaluations
- route: `/dashboard/admin/evaluations`
- frontend callers:
  - `lxpService.getEvaluations()`
- backend coverage:
  - `GET /api/lxp/evaluations`
- status: `covered`

### Announcements
- route: `/dashboard/admin/announcements`
- frontend callers:
  - `announcementService.*`
  - `classService.getAll()`
- backend coverage:
  - class-scoped announcements controller already supports create/list/detail/update/delete
- status: `covered`

### AI Chatbot
- route: `/dashboard/admin/chatbot`
- frontend callers:
  - `GET /api/ai/health`
  - `GET /api/ai/history`
  - `POST /api/ai/chat`
  - `GET /api/ai/extractions?classId=...` indirectly from the shared admin/teacher class detail route
- backend coverage:
  - ai-mentor controller already exposes health, history, and chat endpoints
- status: `covered`
- verification note:
  - admin chatbot now relies on degraded AI fallbacks when the external AI service is unavailable
  - `GET /api/ai/health`, `GET /api/ai/history`, and `GET /api/ai/extractions` were hardened to return non-error fallback payloads instead of surfacing `500` responses into the admin UI

### Audit Trail
- route: `/dashboard/admin/audit`
- frontend callers:
  - `adminService.getAuditLogs()`
  - `adminService.getActivityExportUrl()`
- backend coverage:
  - `GET /api/admin/audit-logs`
  - activity export from admin controller
- status: `covered`

### Profile and Security
- route: `/dashboard/admin/profile`
- frontend callers:
  - `profileService.getMe()`
  - `profileService.update()`
  - `profileService.uploadAvatar()`
  - auth change-password flow through `auth-actions` and `auth-service`
- backend coverage:
  - profiles controller for profile and avatar
  - auth controller for change password and profile update flow
- status: `covered`

### Notifications
- route: `/dashboard/notifications`
- frontend callers:
  - `notificationService.getAll()`
  - `notificationService.getUnreadCount()`
  - `notificationService.markRead()`
  - `notificationService.readAll()`
- backend coverage:
  - notifications controller supports list, unread count, mark read, mark all read
- status: `covered`
- notes:
  - the admin top-bar badge and drawer treatment are frontend work; unread count is already available

## Current Gap Conclusion
- No proven `missing-contract` items were found during static exploration for the Figma-visible admin surfaces.
- The highest-confidence remaining work is `frontend-only`:
  - admin shared shell treatment
  - admin styling on shared library and notifications
  - page-level heading and control alignment with the Figma preview
- One runtime integration gap did appear during live verification:
  - the shared class detail route triggered `GET /api/ai/extractions?classId=...` and originally returned `500`
  - this was resolved by adding a degraded empty-list fallback in the ai-mentor controller so admin class detail pages stay error-free when extraction history is unavailable

## Conditional Backend Rule
- If a Figma-visible interaction cannot be wired using the existing services during implementation, document it here with:
  - owning backend module
  - exact endpoint or DTO addition needed
  - frontend caller that needs it
  - verification step
