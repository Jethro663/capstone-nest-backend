# Test Mobile Agent Guide

## Purpose
- Scope: `test-mobile/` only.
- Stack: Expo 54, React Native 0.81, React 19, React Navigation 6, React Query 5, NativeWind, axios.
- Role: standalone student-focused Expo prototype wired to the same backend API.

## Entrypoints / run commands
- Install: `npm install`
- Start Expo: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Typecheck: `npm run typecheck`
- App boot: `App.tsx`
- Root composition: `src/bootstrap/AppRoot.tsx`

## Architecture / folder map
- `App.tsx`: imports RN setup and `global.css`, then mounts `AppRoot`.
- `src/bootstrap/AppRoot.tsx`: wraps app with providers then navigator.
- `src/providers/*`: app-wide providers; current stack is gesture handler, safe area, React Query, error modal, auth.
- `src/navigation/*`: typed navigation and route structure.
- `src/screens/*`: screen-level UI and flows.
- `src/api/*`: config, axios clients, storage, hooks, query client, service modules, errors.
- `src/types/*`: request/response/domain types; keep these aligned with backend contracts.
- `src/theme/tokens.ts`: color, gradient, radius, shadow truth.
- `src/components/ui/*`: shared primitives and bottom tab bar.
- `global.css`: NativeWind/global utility styling entry.

## Change workflow
- Start from the screen or API service that owns the feature.
- If data changes, update `src/types/*` and `src/api/services/*` first.
- If caching behavior changes, update `src/api/hooks.ts` query keys/invalidation.
- If auth/session behavior changes, trace through `src/api/client.ts`, `src/api/storage.ts`, and `src/providers/AuthProvider.tsx`.
- Keep navigation type-safe: update route param types with screen additions.

## Patterns to follow
- Boot path is `App.tsx` -> `src/bootstrap/AppRoot.tsx` -> `src/providers/AppProviders.tsx` -> `src/navigation/AppNavigator.tsx`.
- Auth gating lives in `AppNavigator`; authenticated users get student navigator, otherwise auth stack.
- API base URL comes from `EXPO_PUBLIC_API_URL` or inferred LAN host fallback in `src/api/config.ts`.
- Use `publicClient` only for unauthenticated flows; `apiClient` handles bearer injection and refresh retry.
- Tokens live in secure storage; auth session snapshot is persisted for bootstrap.
- React Query hooks in `src/api/hooks.ts` are the preferred data-access entrypoint for screens.
- Styling should reuse `src/theme/tokens.ts`, `global.css`, and shared UI primitives before adding one-off values.

## Do not break / invariants
- Student scope: this app currently represents a student workflow, not teacher/admin UX.
- Refresh flow depends on backend mobile auth endpoints and stored refresh token.
- `API_BASE_URL` fallback assumes backend on port `3000` with `/api` prefix.
- Navigation theme colors come from `src/theme/tokens.ts`; keep visual changes centralized.
- Query invalidation must stay aligned with mutations or screens will show stale state.
- Keep screen/service/type alignment; avoid hidden shape mismatches in optimistic UI.

## Where to add or modify code
- New API endpoint integration: `src/types/*`, `src/api/services/*`, optionally `src/api/hooks.ts`.
- Auth/session/profile behavior: `src/providers/AuthProvider.tsx`, `src/api/client.ts`, `src/api/storage.ts`, `src/api/services/auth.ts`.
- New screen or flow: `src/screens/*`, `src/navigation/types.ts`, `src/navigation/AppNavigator.tsx`.
- Shared visual system: `src/theme/tokens.ts`, `global.css`, `src/components/ui/*`.
- App-wide provider behavior: `src/providers/*`.

## Validation / tests
- Required: `npm run typecheck`
- Run Expo app when changing navigation, auth bootstrap, or API config: `npm run start`
- Verify login, refresh, logout, and at least one data-backed student flow after auth/API changes.
- Verify route params and query invalidation after screen or mutation changes.

## Cross-service touchpoints
- Consumes backend `/api` endpoints, including `/auth/mobile/*`.
- Does not call `ai-service` directly; AI features still go through backend contracts.
- Type shapes here should track backend envelopes and domain fields.
- Mobile host discovery is local-network sensitive; LAN testing can fail if backend is not reachable from the device.
