# Testing Slice

Load this when the task is primarily about tests or when a risky change needs verification guidance.

## Targeted Commands

- Backend: `npm run test`, `npm run test:e2e`, `npm run build`, `npm run lint`
- Frontend: `npm run test`, `npm run build`, `npm run lint`
- `test-mobile`: `npm run typecheck`, then `npm run start` for flow checks
- AI service: `python -m unittest ai-service.tests.test_student_tutor_service` or targeted Python tests

## Preferred Scope

- Test the touched module or service first.
- Add regression coverage for the specific failure or rule risk, not generic blanket tests.
- Keep contract tests aligned with `RESP-1` and security tests aligned with `AUTH-*`, `SEC-1`, and `AUD-1`.

## Typical Coverage By Task

- Backend endpoint: controller delegation, DTO validation, service happy/failure paths, auth/role guard expectations.
- Frontend bug: service wrapper behavior, component state transitions, route gating, and browser-level reproduction when needed.
- Mobile integration: API service typing, auth bootstrap, navigation params, React Query invalidation.
- AI flows: backend proxy contract, queue/job orchestration, ai-service route/schema compatibility.

## Common Triggers

- test, spec, regression, coverage, Playwright, Jest, failing CI, smoke, e2e.
