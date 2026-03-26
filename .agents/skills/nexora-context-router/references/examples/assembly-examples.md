# Assembly Examples

## Add a NestJS Endpoint

- Include: kernel, backend, security
- Optional: schema if DTO/query/table shape changes; testing if tests are requested
- Exclude by default: frontend, `test-mobile`, ai-service

## Fix a Teacher Dashboard Bug

- Include: kernel, frontend, debugging
- Optional: security for auth/session bugs; backend only if the issue crosses the API boundary
- Exclude by default: mobile, ai-service, schema

## Update Schema For LXP

- Include: kernel, backend, schema
- Optional: security when eligibility, grades, enrollment, or audit surfaces are touched; matching client slice when contract changes are required
- Exclude by default: unrelated clients, ai-service

## Write Playwright Tests For Login

- Include: kernel, frontend, testing, security
- Optional: backend only if tracing contract failures
- Exclude by default: mobile and ai-service

## Trace an Auth Issue

- Include: kernel, debugging, security, failing client slice
- Optional: backend when the failing client is frontend or mobile
- Exclude by default: unrelated subsystem slices

## Add AI Mentor Queue Flow

- Include: kernel, backend, ai-service, security, testing
- Optional: schema when new logs, jobs, or contracts are introduced
- Exclude by default: frontend, mobile
