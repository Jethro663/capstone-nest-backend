# Repository Improvement Roadmap

This roadmap turns the repository audit findings into small, reviewable change waves. It complements the completed [July 13 performance and architecture implementation plan](implementation-fix.md); that plan is a separately verified performance stream and is not duplicated here.

## Implementation status — July 13, 2026

The safe repository-owned scope is complete on the current `developement` worktree. Compatibility work that this roadmap explicitly required to remain isolated is recorded as bounded follow-up rather than forced into the runtime-hardening change.

| Wave | Status | Evidence / boundary |
| --- | --- | --- |
| 0. Baseline | Complete | Dated CI/dependency baseline, Compose validation, and implementation records are retained. |
| 1. Release safety | Repo-side complete | Railway is triggered by successful CI, checks out `workflow_run.head_sha`, and uses the `production` environment. Required reviewers remain a GitHub environment setting outside the repository. |
| 2. Supply chain | Safe scope complete; majors isolated | Python is fully pinned, app images run unprivileged where supported, Ollama is pinned, compatible vulnerable direct packages were patched, and reports run in CI. Expo, OpenTelemetry, and Nodemailer major migrations remain separate compatibility projects. |
| 3. CI gates | Complete at the recorded ratchets | Backend unit/e2e, frontend, mobile, AI, migration, lint, build, coverage, and dependency-report jobs have explicit budgets. Lint errors block; coverage/dependency reports remain advisory until their dated baselines can be safely promoted. |
| 4. Runtime hardening | Complete | Core, observability, and debug exposure are separated; required secrets fail fast; app privilege boundaries and collector exceptions are documented and Docker-verified. |

Current evidence and residual risk are summarized in [CURRENT_REPO_STATE.md](CURRENT_REPO_STATE.md).

## Operating defaults and decision record

- `developement` remains the source branch for production deployments until an explicitly approved branch-policy change replaces it.
- Ship one bounded concern per PR, with its own validation evidence and rollback path.
- Keep dependency major-version upgrades separate from compatible updates and advisory remediation.
- No learner-, teacher-, administrator-, or mobile-facing API contract changes are in scope. This roadmap concerns CI/CD, dependency resolution, containers, and developer commands.

### Wave dependency map

| Wave | Depends on | Unblocks |
| --- | --- | --- |
| 0. Baseline and decision record | — | A shared execution order for every later PR |
| 1. Release safety | 0 | Safe promotion of dependency and infrastructure PRs |
| 2. Supply-chain remediation | 1 | Trustworthy CI enforcement and repeatable production builds |
| 3. CI quality gates | 2 baseline reports | Safer major upgrades and performance refactors |
| 4. Runtime hardening | 1; coordinate with 2 for non-root images | Safer shared environments and clearer operational ownership |

## Wave 0 — Baseline and decision record

**Goal:** establish the current state before enforcement changes and keep the performance work stream separate.

**PRs and implementation notes**

1. Record the defaults above in this roadmap and link the [July 10 performance plan](docs/system-audit/backend-ai-performance-fix-plan-2026-07-10.md) from related audit/operational documentation where appropriate.
2. Capture initial CI duration, test/coverage output, dependency-scan findings by service, and a `docker compose config` result as CI artifacts or a dated decision record. Do not set coverage or vulnerability thresholds in this wave.

**Acceptance criteria**

- The team can identify the production source branch, PR size expectation, and the separation between safe updates and major upgrades.
- Each future threshold has a recorded baseline rather than an invented target.

**Rollback:** documentation and reporting-only changes can be reverted independently; retain captured artifacts for comparison.

**Unblocks:** Waves 1–4.

## Wave 1 — Release safety

**Goal:** Railway deploys only a reviewed commit that has passed CI.

**Source pointers:** [CI workflow](.github/workflows/ci.yml), [Railway deployment workflow](.github/workflows/railway-deploy-developement.yml).

**PRs and implementation notes**

1. Replace the Railway workflow’s direct `push` trigger with a post-CI trigger scoped to successful CI runs from `developement`. Explicitly reject other conclusions, branches, and missing head SHAs.
2. Pass the CI run’s tested commit SHA to Railway and deploy that SHA; never resolve the mutable branch head when the deployment job starts.
3. Bind the deployment job to GitHub’s protected `production` environment. Configure the environment with required reviewer approval before the Railway action runs.
4. Preserve a clear deployment record: CI run URL/ID, tested SHA, approver/environment state, Railway deployment URL/ID, and rollback target.

**Acceptance criteria**

- A deliberately failing CI run cannot start a Railway deployment.
- A successful CI run for `developement` waits for protected-environment approval, then deploys the exact tested SHA.
- A branch update after CI completes cannot alter the deployed revision.

**Rollback:** disable the post-CI deployment workflow or redeploy the last recorded approved SHA. Do not restore a direct-push trigger without an incident decision record.

**Unblocks:** safe promotion of Waves 2 and 4.

## Wave 2 — Supply-chain remediation

**Goal:** make dependency resolution auditable, reproducible, and progressively enforceable.

**Source pointers:** [backend dependencies](backend/package.json), [frontend dependencies](next-frontend/package.json), [mobile dependencies](mobile/package.json), [AI-service Dockerfile](ai-service/Dockerfile).

**PRs and implementation notes**

1. Add per-service dependency reports as non-blocking CI artifacts first. Classify production versus development dependencies and record suppressions with expiry/review ownership.
2. Apply compatible Node dependency updates and refresh each affected lockfile. Address direct vulnerable packages first; preserve a clean, reviewable diff per package manager.
3. After the safe-update baseline is clean, make high/critical production dependency findings fail the release gate. Keep dev-only findings report-only unless a separate policy says otherwise.
4. Create isolated compatibility projects/PRs for breaking Expo and OpenTelemetry upgrades. Their scope includes compatibility tests and rollback instructions; do not bundle them with advisory-only changes.
5. Replace AI-service minimum-only Python requirements with a fully pinned, reproducible dependency set and install from it during image builds. Add a repeatability check that rebuilds or resolves the same versions from the lock file.
6. Run the AI service as an unprivileged user, granting only the file permissions it needs.
7. Pin `ollama` to a tested immutable version or digest and record the model/image compatibility evidence.

**Acceptance criteria**

- CI publishes a dependency report for backend, frontend, mobile, and AI service.
- Once enabled after the clean baseline, high/critical production findings fail the release gate.
- The same AI lock file resolves identical package versions on a clean rebuild, and the resulting service runs as non-root.
- The Compose configuration no longer uses an untested floating Ollama image tag.

**Rollback:** revert the individual dependency/update PR or restore the prior lock file and tested image digest. A temporary, documented advisory suppression requires an owner and expiry date.

**Unblocks:** Wave 3 enforcement and repeatable production builds.

## Wave 3 — CI quality gates

**Goal:** ensure CI validates each application surface without mutating the checkout.

**Source pointers:** [CI workflow](.github/workflows/ci.yml), [backend scripts](backend/package.json), [frontend scripts](next-frontend/package.json), [mobile scripts](mobile/package.json).

**PRs and implementation notes**

1. Split backend unit and e2e tests into independently reported CI jobs. Ensure e2e prerequisites and secrets are explicit rather than inherited accidentally.
2. Run frontend lint and tests, mobile typecheck and tests, and AI-service tests. Use non-mutating lint commands in CI.
3. Change the backend `lint` command so it checks only; retain a separately named local autofix command (for example, `lint:fix`) for intentional rewrites.
4. Publish coverage reports/artifacts first. Set ratcheting thresholds only after Wave 0 records the baseline, and raise them gradually without retroactively blocking unrelated cleanup.
5. Make the release job require the appropriate test, lint, scan, and build jobs before it is eligible for protected-environment approval.

**Acceptance criteria**

- CI executes backend unit tests, backend e2e tests, frontend lint/tests, mobile typecheck/tests, and AI-service tests.
- A CI lint run leaves `git diff` unchanged.
- Coverage reports are retained and any introduced thresholds are traceable to the recorded baseline.

**Rollback:** make a newly added job advisory temporarily only with an issue/owner; revert an erroneous threshold separately from the underlying test job.

**Unblocks:** safer major dependency upgrades and ongoing performance refactors.

## Wave 4 — Runtime hardening

**Goal:** make the default Compose topology safer while retaining intentional local-debug workflows.

**Source pointers:** [Compose configuration](docker-compose.yml), [Compose environment template](.env.compose.example), [AI-service Dockerfile](ai-service/Dockerfile).

**PRs and implementation notes**

1. Put observability services and privileged host mounts behind an opt-in Compose profile (for example, `observability`). Ensure application services do not require that profile to start.
2. Move developer-facing debug ports into an explicit Compose override or profile. The default topology should expose only ports needed for normal local use.
3. Require Grafana credentials through environment validation; remove sample/default credentials from runtime defaults. Document all required Compose variables and generate no secrets in source control.
4. Remove root execution where the upstream image/service supports it. For any retained host access, document why it is necessary, its scope, and the mitigating controls.
5. Validate the default and opt-in topologies with documented environment input, including health-check and dependency behavior.

**Acceptance criteria**

- `docker compose config` validates using root `.env`, created from `.env.compose.example`.
- Default startup excludes privileged observability collectors and optional debugging exposure.
- Grafana cannot start with sample credentials; required credentials are documented.
- Retained root or host-access exceptions are explicit, minimal, and reviewed.

**Rollback:** use the explicit local override/profile to restore a diagnostic service temporarily; revert the scoped Compose PR if application startup regresses. Do not reintroduce privileged defaults as a permanent workaround.

**Unblocks:** safer shared environments and clearer operational ownership.

## Delivery and verification checklist

Before marking a wave complete, attach the following evidence to its PR or release record:

- The workflow/run links and exact tested/deployed SHA for release-safety changes.
- Per-service dependency reports and the policy state (report-only or enforcing).
- Test, lint, coverage, and AI-service test artifacts for CI-gate changes.
- `docker compose config` output and profile-aware startup evidence for runtime changes.
- A rollback command or recorded revision that has been tested at least once for production-affecting changes.

The execution order is 0 → 1 → 2 → 3, with Wave 4 beginning after Wave 1 and coordinating with Wave 2’s non-root image work. Keep the July 10 performance-plan PRs independently scoped, but require the relevant Wave 1 and Wave 3 gates before they are promoted to production.
