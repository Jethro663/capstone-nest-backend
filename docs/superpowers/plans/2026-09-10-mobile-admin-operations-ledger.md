# Mobile Admin Operations Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete mobile administrator workspace drawer-led, flat, scannable, and consistent while preserving every existing admin contract and mutation.

**Architecture:** A typed admin route manifest supplies grouped drawer destinations and maps dedicated hidden-tab route names to the existing administration tool domains. New admin-owned primitives provide the role palette, screen shell, flat sections, metric strip, rows, buttons, fields, and one standard filter bar; admin screens consume those primitives without altering backend services.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, React Query, TypeScript, Jest, Android Gradle.

## Global Constraints

- Work in the current `developement` checkout; create no worktree and preserve unrelated changes.
- Change `mobile/` plus required Android download/version artifacts only; do not change backend contracts or web admin behavior.
- Preserve role precedence, RBAC, query keys, APIs, confirmations, academic safeguards, detail-stack parameters, pull-to-refresh, and iOS build-number independence.
- Use policy-provided academic period labels instead of hard-coded universal quarters.
- Build and validate the repository-configured ARM64 Android release with the production backend `/api` URL.

---

### Task 1: Admin design primitives

**Files:**
- Create: `mobile/src/theme/admin.ts`
- Create: `mobile/src/components/admin/AdminMobilePrimitives.tsx`
- Create: `mobile/src/components/admin/__tests__/AdminMobilePrimitives.test.tsx`

**Interfaces:**
- Produces: `adminTheme`, `AdminScreen`, `AdminMetricStrip`, `AdminSection`, `AdminDataRow`, `AdminButton`, `AdminFilterBar`, `AdminChip`, `AdminField`, `AdminEmpty`, and `AdminNotice`.
- `AdminFilterBar` accepts `search`, `onSearchChange`, `segments`, `activeSegment`, `onSegmentChange`, and `resultCount`; it exposes an accessible clear-search action only when search is non-empty.

- [ ] Write a render test proving the metric strip is one divided surface, the filter bar exposes search/segments/result count/clear, sections are flat, and minimum button/segment height is 44 px.
- [ ] Run `npm --prefix mobile test -- --runInBand src/components/admin/__tests__/AdminMobilePrimitives.test.tsx` and observe failure because the module does not exist.
- [ ] Implement the admin palette and primitives with white flat sections, deep-blue selection, ink/slate text, border dividers, no shadows, and no floating KPI containers.
- [ ] Re-run the focused primitive test and require all assertions to pass.

### Task 2: Complete drawer navigation

**Files:**
- Create: `mobile/src/navigation/admin-route-manifest.ts`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/role-drawer-model.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/navigation/__tests__/admin-route-manifest.test.ts`
- Modify: `mobile/src/components/navigation/__tests__/RoleNavigationDrawer.test.tsx`

**Interfaces:**
- Produces: `AdminDrawerRouteName`, `AdminToolRouteName`, `adminDrawerRouteNames`, and `adminToolForRoute(routeName)`.
- The drawer order is Home; Users; Classes; Roster; Assessments; Announcements; Evaluations; Academic; Calendar; Templates; Library; Reports; Audit; Diagnostics; Settings; then the shared Profile footer.

- [ ] Change the navigation tests first to require the complete grouped drawer, hidden-tab routes, `backBehavior="history"`, and removal of the admin drawer provider from the narrow five-tab wrapper.
- [ ] Run the two focused navigation suites and observe assertion failures against the five-destination implementation.
- [ ] Add typed route names and grouped drawer destinations, mount dedicated tool tabs with `initialParams.section`, and place one `RoleDrawerProvider role="admin"` around the complete admin navigator so stack fallbacks retain access to primary navigation.
- [ ] Keep feature-detail routes and legacy direct-entry routes registered, and make drawer-root screens use the hamburger while pushed details retain Back.
- [ ] Re-run both focused navigation suites and require all assertions to pass.

### Task 3: Primary admin inventories and Home

**Files:**
- Modify: `mobile/src/screens/AdminHomeScreen.tsx`
- Modify: `mobile/src/screens/AdminClassesScreen.tsx`
- Modify: `mobile/src/screens/AdminAssessmentsScreen.tsx`
- Modify: `mobile/src/screens/AdminAnnouncementsScreen.tsx`
- Create: `mobile/src/screens/__tests__/admin-workspace-contract.test.ts`

**Interfaces:**
- Home navigates directly to typed drawer tabs instead of `AdminTools` stack sections.
- Classes filters by search plus `all | active | archived` inside `classes | sections` scope.
- Assessments filters by search plus `all | published | draft`.
- Announcements filters by search plus `all | pinned | scheduled | published`.

- [ ] Add source/render contract tests requiring admin primitives, direct drawer-tab navigation, standard filter order, clear-filter recovery, and absence of teacher card primitives.
- [ ] Run the focused workspace test and observe failure against current imports and missing filters.
- [ ] Replace Home’s module-button cloud with compact metrics, readiness rows, and a short Review and act list.
- [ ] Refactor Classes, Assessments, and Announcements to `AdminScreen`, `AdminMetricStrip`, `AdminSection`, `AdminDataRow`, and `AdminFilterBar`; preserve all existing mutations, detail routes, and refreshes.
- [ ] Re-run the workspace test and relevant announcement editor suite and require all assertions to pass.

### Task 4: Tools, academic controls, and account

**Files:**
- Modify: `mobile/src/screens/AdminToolsScreen.tsx`
- Modify: `mobile/src/screens/AdminAcademicScreen.tsx`
- Modify: `mobile/src/screens/AdminProfileScreen.tsx`
- Modify: `mobile/src/screens/__tests__/admin-workspace-contract.test.ts`

**Interfaces:**
- `AdminToolsScreen` derives its fixed workspace from `route.params.section`; the former eleven-chip switcher is removed.
- List-backed tools use the common filter bar; create/edit and guarded academic operations remain progressive sections with unchanged payloads and confirmation flow.

- [ ] Extend the failing workspace test to cover every admin screen and reject old teacher card imports and the tool switcher.
- [ ] Run the focused test and observe the expected failure.
- [ ] Convert Tools, Academic, and Profile to admin primitives; preserve user lifecycle, campaign, event, file, report, audit, roster, template, password, logout, recovery, academic preview, and confirmation procedures.
- [ ] Add filtered empty-state recovery for list-backed tool workspaces and retain backend error text.
- [ ] Re-run focused admin, profile-version, academic, and announcement suites and require all assertions to pass.

### Task 5: Verification, packaging, and release

**Files:**
- Modify through existing release tooling: `mobile/app.json`, `mobile/android/app/build.gradle`, `mobile/scripts/app-version-release.test.cjs`
- Replace through existing artifact contract: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Produces the next monotonic Android app version and versionCode, exact APK size/SHA metadata, and an unchanged iOS build number.

- [ ] Run focused Jest suites, `npm --prefix mobile run typecheck`, the complete mobile Jest suite, release tests, release verification, and rich-text bundle generation; retain full logs and require zero failures.
- [ ] Use the existing release preparation script to bump Android metadata while keeping the iOS build number independent, then rerun all invalidated checks.
- [ ] Build the configured ARM64 release with JDK 17, Android SDK variables, `NODE_ENV=production`, and `EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api`.
- [ ] Validate ZIP integrity, package/version identity, ARM64 ABI, signing certificate, v2 signature, 16 KB alignment, permissions, embedded API URL, source markers, artifact size, SHA-256, manifest, and source/destination byte equality.
- [ ] Run the affected frontend download tests, frontend TypeScript/build gates, inspect the final diff and every outgoing commit, commit only task-owned files, push to `origin/developement`, and confirm zero divergence at the exact SHA.
- [ ] Observe exact-SHA CI and downstream Railway deployment to terminal success, verify provider deployment state and backend live health, then compare the served APK and manifest bytes/checksum with the packaged artifact.
- [ ] Register the new Android build through the guarded release endpoint when the live update record is stale, and verify old/current/newer Android plus current iOS update-policy responses.
