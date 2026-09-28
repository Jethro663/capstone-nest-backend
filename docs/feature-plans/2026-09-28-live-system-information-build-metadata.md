# Live System Information Build Metadata Plan

**Date:** 2026-09-28

**Status:** Reviewed implementation checklist for the authorized finish-and-ship goal.
**Analysis:** `docs/feature-analysis/2026-09-28-live-system-information-isolation-analysis.md`

## 1. Decision summary and feature brief

Display the actual deployed frontend and backend package versions and Git commits in the existing top-right System information modal. Use the CI workflow's authoritative `TESTED_SHA` for CLI uploads, with Railway's native `RAILWAY_GIT_COMMIT_SHA` as a fallback; do not introduce a manually edited version value or a second metadata API.

Recommended architecture:

- Frontend: package version remains compiled by Next; the deploy workflow pins `TESTED_SHA` as `APP_GIT_COMMIT_SHA`, Docker declares both supported commit inputs, and the client exposes a typed immutable build-info object.
- Backend: health metadata resolves `APP_VERSION`, then npm lifecycle version, then the packaged `backend/package.json` version; commit resolves the CI-pinned SHA, Railway's native SHA, then a local-development fallback.
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

- Railway deploys are CLI uploads from a CI checkout, so the workflow must propagate `TESTED_SHA`; native Railway Git metadata is only a fallback.
- Frontend and backend can deploy the same repository revision independently; the modal must show each service's own reported revision rather than assuming they match.

## 3. Current-state evidence ledger

| Status     | Evidence                                                                                                                         | Consequence                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Confirmed  | `backend/src/modules/health/health.service.ts:49-56` uses `npm_package_version ?? '0.0.0'`.                                      | Direct Node startup produces the observed `0.0.0`.                             |
| Confirmed  | Backend production contains `package.json` and starts compiled Node through `docker-entrypoint.sh` (`backend/Dockerfile:30-57`). | The packaged version is available without an external variable.                |
| Confirmed  | `next-frontend/next.config.ts:32-35` maps Railway SHA into a public build variable.                                              | Correct intent already exists.                                                 |
| Confirmed  | `next-frontend/Dockerfile:14-19` declares URL args but not the Railway SHA.                                                      | Railway's Docker build cannot expose that value to `next build` without `ARG`. |
| Confirmed  | `SystemInfoButton.tsx:59-114` fetches live backend metadata and tolerates partial request failure.                               | Fix producers and presentation; preserve fetch logic.                          |
| Confirmed  | Railway's current official Dockerfile documentation requires an `ARG` declaration for injected build variables.                  | Add both commit inputs in the builder stage.                                   |
| Confirmed  | Live backend health after the first release reported version `0.0.1` but commit `development`.                                  | CLI upload does not provide the GitHub-source SHA; pin `TESTED_SHA` explicitly. |
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

1. **CI-pinned SHA + native Railway fallback + packaged backend version (recommended).** Exact for the existing CLI upload path, still compatible with future GitHub-source deployments, and adds no endpoint.
2. **New runtime `/build-info` route for frontend.** Supports runtime image reuse but adds another public contract and server/client hop solely for immutable build data.
3. **Manual `NEXT_PUBLIC_*` and `APP_VERSION` Railway variables.** Easy initially but prone to drift and defeats automatic per-commit traceability.

Primary risk: a blank or malformed env value could be presented as live metadata. Normalize whitespace, preserve deterministic fallbacks, and test precedence.

## 6. Recommended architecture, security, and error behavior

- Add a small backend version resolver that reads trusted local package metadata once and allows explicit `APP_VERSION` override.
- Keep commit strings opaque; trim only, do not parse as numbers.
- Pin the non-secret tested SHA as a service variable immediately before each upload and declare both commit inputs in the frontend builder stage.
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
2. **Frontend build owner** — add a Docker/config regression assertion; declare the CI-pinned and Railway-native SHA inputs in `next-frontend/Dockerfile`; expose typed build info in `src/services/health-service.ts`.
3. **Deploy workflow owner** — set service-specific `APP_GIT_COMMIT_SHA=$TESTED_SHA` with `--skip-deploys` before backend/frontend uploads; retain exact-SHA checkout and deployment provenance.
4. **Web UI owner** — update `SystemInfoButton` and its tests to show separate version/commit values without changing fetch/error behavior.
5. **Verification owner** — backend focused tests/build; frontend focused tests/lint/build; Docker/workflow assertions; live health/modal evidence after deployment.

## 9. Verification matrix and acceptance criteria

| Layer         | Check                                            | Acceptance                                                                                    |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Backend unit  | Health metadata specs                            | Package fallback is `0.0.1`; CI-pinned SHA wins over Railway native metadata; blanks become development. |
| Frontend unit | System info modal test                           | Frontend and backend version plus commit are visible; partial health behavior remains.        |
| Build config  | Docker/config assertion and frontend build       | Known SHA reaches the Next public metadata variable; build succeeds without Railway vars.     |
| Browser       | Open System information in an authenticated role | Modal reports deployed frontend/backend revisions and no stale `dev 0.0.0`.                   |
| Live API      | `/api/health/live` and `/api/health/ready`       | Version equals backend package/release value and Git commit matches deployed revision.        |
| Release       | Exact-SHA CI and Railway workflow                | Final pushed SHA is tested/deployed successfully.                                             |

Acceptance criteria:

1. Production never shows backend `0.0.0` when `backend/package.json` has a valid version.
2. CI-uploaded Railway frontend/backend builds show the exact tested SHA; native Railway source builds remain supported as a fallback.
3. Frontend/backend values are labeled separately and can differ during a staggered deployment.
4. Local development remains explicit and healthy without provider metadata.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

Rollout: merge into the authorized `developement` push, observe CI and Railway, then verify live health metadata and the modal.

Rollback: revert the metadata commit and redeploy. No data rollback or migration is required.

Observability: the modal and public health endpoints are the validation surfaces; provider logs prove the deployed source SHA.

Cleanup: none beyond removing any superseded string-format helper if it has no consumers.

Unverified until rollout: actual provider build-argument injection, CDN/browser cache freshness, and authenticated visual acceptance. GitHub evaluates `workflow_run` definitions from the default branch, so automatic SHA pinning activates after this workflow revision is merged there; the current release must be pinned and redeployed explicitly.

## Self-review

- Unsupported claims removed or labeled Unverified.
- No schema, auth, data, or AI scope expansion.
- Producer and all discovered top-bar consumers mapped.
- Tasks name exact owners, failure behavior, and checks.
- No placeholder decision remains.
