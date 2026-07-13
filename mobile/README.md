# Nexora Mobile

Expo 54 and React Native client for the student, teacher, and administrator experiences in Nexora.

## Architecture

- `App.tsx` boots `src/bootstrap/AppRoot.tsx`.
- `src/navigation/AppNavigator.tsx` owns authenticated navigation.
- `src/navigation/role-resolver.ts` is the role-precedence contract: admin, then teacher, then student fallback.
- `src/api/client.ts` uses JSON access/refresh tokens from secure storage. Mobile does not use the browser cookie session model.
- `src/api/services/` and React Query hooks own backend integration and cache invalidation.
- AI features call NestJS backend routes; the app never calls `ai-service` directly.

Role ownership:

- Student: learner dashboard, lessons, assessments, LXP, notifications, interventions, and profile flows.
- Teacher: classes, content, extraction review, AI drafts, assessments, interventions, reports, and profile flows.
- Administrator: supported mobile role using the current shared role-workspace tabs where a dedicated native surface is not yet warranted.

## Start locally

```bash
npm install
cp .env.example .env
npm run start
```

For an Android emulator, the committed example uses `http://10.0.2.2:3000/api`. A physical device needs the development machine’s LAN address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api
EXPO_PUBLIC_WS_URL=http://192.168.1.20:3000
```

Do not commit QA login seed credentials.

## Commands

```bash
npm run android
npm run android:emulator
npm run ios
npm run web
npm run typecheck
npm run test -- --runInBand
```

## Data presentation

Some presentation values are intentionally derived when the backend has no native field:

- assessment state combines attempts and due dates;
- profile readiness is calculated from populated profile fields;
- achievements, XP, level, streak, and study hours are derived from real lesson, assessment, LXP, and performance data;
- subject emoji/colors and lesson duration estimates are local visual metadata.

These are display projections, not independent official records. Missing images, teacher metadata, and due dates use explicit visual fallbacks.

## Verification expectations

- Always run `npm run typecheck`.
- Run the full Jest suite for auth, navigation, API, role, or screen changes.
- Exercise at least one data-backed flow for each affected role after navigation or contract changes.
- Recheck secure-storage refresh, logout, route params, WebSocket origin, and query invalidation after auth/API changes.

See `AGENTS.md` for ownership and change-safety rules and `APK_DEPLOYMENT.md` for Android packaging guidance.
