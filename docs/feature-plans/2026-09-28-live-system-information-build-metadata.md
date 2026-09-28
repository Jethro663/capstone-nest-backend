# Live System Information Build Metadata Plan

**Date:** 2026-09-28

**Status:** Reviewed implementation checklist for the authorized finish-and-ship goal.
**Analysis:** `docs/feature-analysis/2026-09-28-live-system-information-isolation-analysis.md`

## 1. Decision summary and feature brief

Display the actual deployed frontend and backend package versions and Git commits in the existing top-right System information modal. Use Railway's provided `RAILWAY_GIT_COMMIT_SHA`; do not introduce manually maintained production version variables or a second metadata API.

Recommended architecture:

- Frontend: package version remains compiled by Next; Docker declares Railway's Git SHA in the builder stage; the client exposes a typed immutable build-info object.
- Backend: health metadata resolves `APP_VERSION`, then npm lifecycle version, then the packaged `backend/package.json` version; commit resolves Railway SHA with a local-development fallback.
- UI: show Version and Commit as separate fields for frontend/backend, retain live status and partial-failure behavior.

## 2. Scope, non-goals, permissions, and assumptions

In scope:

- `next-frontend/Dockerfile`, `next.config.ts`, frontend health/build metadata, modal presentation/tests.
- Backend health metadata resolver/tests.
- Existing CI/deploy/live health verification.

Non-goals:

- No database/schema/migration change.
- No auth/RBAC change; health endpoints remain intentionally public.
- No AI-service version redesign.
- No manual Railway variable mutation is expected.
- No mobile UI change for this feature.

Permission: the user explicitly invoked `finish-and-ship`, authorizing implementation, tests, commit, push, and the configured deployment after this plan. The planning-only skills produced these artifacts first; execution follows the separate authorization in the same request.

Assumptions:

- Railway deploys originate from GitHub, so `RAILWAY_GIT_COMMIT_SHA` is present.
- Frontend and backend can deploy the same repository revision independently; the modal must show each service's own reported revision rather than assuming they match.

## 3. Current-state evidence ledger

| Status     | Evidence                                                                                                                         | Consequence                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Confirmed  | `backend/src/modules/health/health.service.ts:49-56` uses `npm_package_version ?? '0.0.0'`.                                      | Direct Node startup produces the observed `0.0.0`.                             |
| Confirmed  | Backend production contains `package.json` and starts compiled Node through `docker-entrypoint.sh` (`backend/Dockerfile:30-57`). | The packaged version is available without an external variable.                |
| Confirmed  | `next-frontend/next.config.ts:32-35` maps Railway SHA into a public build variable.                                              | Correct intent already exists.                                                 |
| Confirmed  | `next-frontend/Dockerfile:14-19` declares URL args but not the Railway SHA.                                                      | Railway's Docker build cannot expose that value to `next build` without `ARG`. |
| Confirmed  | `SystemInfoButton.tsx:59-114` fetches live backend metadata and tolerates partial request failure.                               | Fix producers and presentation; preserve fetch logic.                          |
| Confirmed  | Railway's current official Dockerfile documentation requires an `ARG` declaration for injected build variables.                  | Add `ARG RAILWAY_GIT_COMMIT_SHA` in the builder stage.                         |
| Unverified | Live provider build logs for the not-yet-pushed revision.                                                                        | Must be checked after release.                                                 |

## 4. End-to-end impact and consumer map

`Railway Git trigger -> Docker builder ARG -> Next config -> public frontend build-info -> SystemInfoButton`

`backend package/env + Railway runtime SHA -> HealthService -> /api/health/live and /ready -> healthService client -> SystemInfoButton`

Consumers preserved:

- Admin, teacher, and student web top bars.
- CI and provider health checks that read the existing health routes.
- Admin diagnostics, which uses the same health services but not the modal presentation.

## 5. Conflicts, invariants, risks, and options

Invariants:

- Backend remains health/build metadata authority for itself.
- Frontend build metadata is immutable for a deployed bundle.
- Public health response shape and readiness status codes do not change.
- Missing metadata degrades to an explicit local/development label, never a fabricated live SHA.

Options considered:

1. **Explicit Docker build arg + packaged backend fallback (recommended).** Smallest change, uses provider-native values, no new endpoint.
2. **New runtime `/build-info` route for frontend.** Supports runtime image reuse but adds another public contract and server/client hop solely for immutable build data.
3. **Manual `NEXT_PUBLIC_*` and `APP_VERSION` Railway variables.** Easy initially but prone to drift and defeats automatic per-commit traceability.

Primary risk: a blank or malformed env value could be presented as live metadata. Normalize whitespace, preserve deterministic fallbacks, and test precedence.

## 6. Recommended architecture, security, and error behavior

- Add a small backend version resolver that reads trusted local package metadata once and allows explicit `APP_VERSION` override.
- Keep commit strings opaque; trim only, do not parse as numbers.
- Declare the Railway SHA only in the frontend builder stage. It is public non-secret metadata.
- Export `FRONTEND_BUILD_INFO` with `{ version, gitCommit }`; keep `FRONTEND_APP_VERSION` only if an existing test/consumer needs compatibility.
- The modal shows `Unavailable` for failed backend calls and `Local development` for absent frontend Git metadata.
- No secrets, environment dumps, repository URLs, or author identities are displayed.

## 7. Contract, schema, migration, and compatibility

- API contract: no shape change; existing `ServiceMetadata` fields remain.
- Frontend internal contract: add typed build info; maintain the existing version export during transition.
- Schema/migration: none.
- Compatibility: local development continues without Railway variables; Docker/Compose builds remain valid with an optional blank build arg.

## 8. Ordered implementation phases and owners

1. **Backend health owner** — add failing tests for explicit/package version precedence and blank commit fallback; implement resolver in `backend/src/modules/health/health.service.ts`.
2. **Frontend build owner** — add a Docker/config regression assertion; declare `RAILWAY_GIT_COMMIT_SHA` in `next-frontend/Dockerfile`; expose typed build info in `src/services/health-service.ts`.
3. **Web UI owner** — update `SystemInfoButton` and its tests to show separate version/commit values without changing fetch/error behavior.
4. **Verification owner** — backend focused tests/build; frontend focused tests/lint/build; Docker source assertion; live health/modal evidence after deployment.

## 9. Verification matrix and acceptance criteria

| Layer         | Check                                            | Acceptance                                                                                    |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Backend unit  | Health metadata specs                            | Package fallback is `0.0.1`; explicit version and Railway SHA win; blanks become development. |
| Frontend unit | System info modal test                           | Frontend and backend version plus commit are visible; partial health behavior remains.        |
| Build config  | Docker/config assertion and frontend build       | Known SHA reaches the Next public metadata variable; build succeeds without Railway vars.     |
| Browser       | Open System information in an authenticated role | Modal reports deployed frontend/backend revisions and no stale `dev 0.0.0`.                   |
| Live API      | `/api/health/live` and `/api/health/ready`       | Version equals backend package/release value and Git commit matches deployed revision.        |
| Release       | Exact-SHA CI and Railway workflow                | Final pushed SHA is tested/deployed successfully.                                             |

Acceptance criteria:

1. Production never shows backend `0.0.0` when `backend/package.json` has a valid version.
2. GitHub-triggered Railway frontend builds show the triggering SHA.
3. Frontend/backend values are labeled separately and can differ during a staggered deployment.
4. Local development remains explicit and healthy without provider metadata.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

Rollout: merge into the authorized `developement` push, observe CI and Railway, then verify live health metadata and the modal.

Rollback: revert the metadata commit and redeploy. No data rollback or migration is required.

Observability: the modal and public health endpoints are the validation surfaces; provider logs prove the deployed source SHA.

Cleanup: none beyond removing any superseded string-format helper if it has no consumers.

Unverified until rollout: actual provider build arg injection, CDN/browser cache freshness, and authenticated visual acceptance. These remain release gates, not assumptions.

## Self-review

- Unsupported claims removed or labeled Unverified.
- No schema, auth, data, or AI scope expansion.
- Producer and all discovered top-bar consumers mapped.
- Tasks name exact owners, failure behavior, and checks.
- No placeholder decision remains.
