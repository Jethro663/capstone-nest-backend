# Test Mobile Slice

Scope: `test-mobile/` only.
This is the default mobile target for generic Nexora mobile work.

## Rule IDs In Play

- `RESP-1`, `SEC-1`, `AUTH-1`, `AUTH-2`
- Backend-alignment rules commonly touched: `DOM-2`, `AI-1`

## Entrypoints

- Install: `npm install`
- Start Expo: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Typecheck: `npm run typecheck`
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

## Working Rules

- Auth gating lives in `AppNavigator`; preserve the student-focused flow.
- Use `apiClient` for authenticated requests and `publicClient` for unauthenticated flows.
- Tokens live in secure storage; do not assume web cookie behavior here.
- Keep `src/types/*`, `src/api/services/*`, and screen expectations aligned with backend contracts.
- Prefer React Query hooks and shared theme tokens over one-off fetch or styling patterns.

## Do Not Break

- This app is currently student-scoped, not teacher/admin UX.
- Refresh depends on backend mobile auth endpoints.
- `API_BASE_URL` fallback assumes backend port `3000` with `/api`.
- Query invalidation must stay aligned with mutations or screens will stale.
- The app reaches AI through backend contracts, not directly to `ai-service`.

## Verification

- Required: `npm run typecheck`
- Run Expo after navigation, auth bootstrap, or API-config changes.
- Verify login, refresh, logout, and one data-backed student flow after auth or API edits.
- Recheck route params and query invalidation after screen or mutation changes.
