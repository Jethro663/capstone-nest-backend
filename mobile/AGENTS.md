# Mobile Slice

Scope: `mobile/` only.
This is the default mobile target for generic Nexora mobile work.

## Rule IDs In Play

- `RESP-1`, `SEC-1`, `AUTH-1`, `AUTH-2`
- Backend-alignment rules commonly touched: `DOM-2`, `AI-1`

## Entrypoints

- Install: `npm install`
- Start Expo: `npm run start`
- Android: `npm run android`
- Android emulator on Windows: `npm run android:emulator`
- Android emulator clean start on Windows: `npm run android:emulator:clean`
- iOS: `npm run ios`
- Web: `npm run web`
- Typecheck: `npm run typecheck`
- Tests: `npm run test`
- App boot: `App.tsx`
- Root composition: `src/bootstrap/AppRoot.tsx`

## Owning Paths

- `src/bootstrap/*`: root composition
- `src/providers/*`: auth, React Query, error handling
- `src/navigation/*`: route structure and typed params
- `src/screens/*`: screen-level UI and flows
- `src/api/*`: config, clients, storage, hooks, services
- `src/types/*`: request/response/domain types
- `src/theme/*` and `global.css`: visual tokens and utilities

## Role Ownership

- `student`: `StudentNavigator` owns the learner dashboard, coursework, assessment, notification, and profile flows.
- `teacher`: `TeacherNavigator`, `teacher-route-manifest.ts`, and teacher screens own class, assessment, content, intervention, report, and profile flows.
- `admin`: `RoleTabs` owns the current admin workspace tabs. Admin remains a supported mobile role even where its UX intentionally reuses shared role-workspace screens.
- `resolveMobileRole` is the single role-precedence contract: admin, then teacher, then the student fallback.
- `TeacherAiDraftScreen.tsx` and `TeacherExtractionDetailScreen.tsx` own the extracted teacher AI/extraction flows; `TeacherDeepParityScreens.tsx` preserves their compatibility exports.

## Working Rules

- Auth gating lives in `AppNavigator`; preserve student, teacher, and admin role resolution and their owned navigation flows.
- Use `apiClient` for authenticated requests and `publicClient` for unauthenticated flows.
- Tokens live in secure storage; do not assume web cookie behavior here.
- Keep `src/types/*`, `src/api/services/*`, and screen expectations aligned with backend contracts.
- Prefer React Query hooks and shared theme tokens over one-off fetch or styling patterns.
- Use Serena first for navigation, service, and type ownership discovery before broad file dumping.

## Do Not Break

- This is a multi-role app. Do not remove teacher/admin navigation merely because `mobile/` is the default generic mobile target.
- Refresh depends on backend mobile auth endpoints.
- `API_BASE_URL` fallback assumes backend port `3000` with `/api`.
- On non-Windows shells, set `EXPO_PUBLIC_API_URL` explicitly instead of using the Windows-only `android:emulator` scripts.
- Query invalidation must stay aligned with mutations or screens will stale.
- The app reaches AI through backend contracts, not directly to `ai-service`.
- Display-only XP, achievement, readiness, and duration projections must remain derived from real backend data and must not masquerade as official stored records.

## Verification

- Required: `npm run typecheck`
- Run `npm run test` for touched React Native logic and screen behavior that already has Jest coverage.
- Run Expo after navigation, auth bootstrap, or API-config changes.
- Prefer `npm run android:emulator` for Android-specific auth, storage, or deep-link issues; use `npm run android:emulator:clean` when port `8081` is wedged.
- Verify login, refresh, logout, and one data-backed flow for every role affected by auth, API, or navigation edits.
- Recheck route params and query invalidation after screen or mutation changes.
