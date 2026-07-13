# CI and Dependency Quality Baseline

Created: July 10, 2026. Last reconciled: July 13, 2026.

This is the ratchet record used by `improvement-plan.md`. Reports stay advisory when the only remediation is a major compatibility migration; lint and build/test regressions are blocking.

## Enforced CI surfaces

- Backend non-mutating lint, unit tests, migration integrity/build, and e2e tests.
- Fresh pgvector migration bootstrap.
- Frontend lint, Jest, and production build.
- Mobile typecheck and Jest.
- AI dependency-lock regeneration check and full Python suite on Python 3.12.
- Explicit job timeouts from 10 to 30 minutes.
- Railway deployment only after successful CI on `developement`, using the exact tested SHA and the protected `production` environment.

## Lint ratchets

- Backend: zero errors; legacy warning ceiling of 2,219. The latest completed implementation verification recorded 2,218 warnings.
- Frontend: zero errors; warning ceiling of 5.
- CI lint commands do not mutate the checkout. Intentional backend rewrites use `npm run lint:fix` locally.

## Production dependency snapshot — July 13, 2026

| Service | Low | Moderate | High | Critical | Boundary |
| --- | ---: | ---: | ---: | ---: | --- |
| Backend | 0 | 26 | 8 | 0 | Compatible NestJS/Swagger fixes were applied. Remaining direct advisories require coordinated OpenTelemetry or Nodemailer major-line validation. |
| Web | 0 | 2 | 4 | 0 | DOMPurify was patched; remaining findings are transitive rather than vulnerable direct dependencies. |
| Mobile | 1 | 15 | 11 | 1 | The critical/transitive remediation requires an Expo SDK and native dependency migration. |
| AI service | 0 | 0 | 0 | 0 | `pip-audit -r requirements.txt` reported no known vulnerabilities; `uv pip check` reported a compatible environment. |

Counts are a dated npm/pip advisory snapshot and can change as advisories are published. Regenerate the CI artifacts before making a release decision.

## Promotion criteria

1. Run each major compatibility migration in isolation.
2. For OpenTelemetry, verify backend startup with telemetry disabled and enabled, Tempo export, graceful shutdown, tracing specs, backend tests, and Docker readiness.
3. For Nodemailer, verify each configured provider plus the intentionally disabled local-email path.
4. For Expo, verify native Android/iOS builds, secure-storage auth refresh, notifications, deep links, and at least one student, teacher, and administrator flow.
5. Promote high/critical dependency reports from advisory to blocking only after the baseline is clean or an explicit owner/expiry exception is recorded.
6. Introduce coverage thresholds as ratchets from retained artifacts, not arbitrary repository-wide targets.

Do not use `npm audit fix --force` to satisfy the report. It can cross framework/native major boundaries and invalidate the compatibility evidence this baseline protects.
