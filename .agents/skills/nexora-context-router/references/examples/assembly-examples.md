# Assembly Examples

## Fix a Refresh Loop in Student Dashboard

- Include: kernel, `auth-session-doctor`, frontend, backend, security
- Optional: debugging and testing
- Exclude by default: ai-service, unrelated slices

## Add an Assessment Column and Wire It to Mobile

- Include: kernel, `contract-change-orchestrator`, backend, schema, `test-mobile`
- Optional: `next-frontend` if the shared API contract also feeds web, plus testing and security as needed
- Exclude by default: unrelated slices

## Docker Compose Starts but AI Service Is Unhealthy

- Include: kernel, `dev-stack-doctor`, backend, ai-service
- Optional: next-frontend or `test-mobile` only if the failure symptom names them
- Exclude by default: unrelated slices

## Run the Safest Checks After Changing Submission Flow

- Include: kernel, `workflow-smoke-orchestrator`, affected slice, testing
- Optional: security when auth or data exposure is involved
- Exclude by default: unrelated slices

## Audit Student Mobile Login and Navigation

- Include: kernel, `mobile-flow-auditor`, `test-mobile`, backend, testing
- Optional: security for refresh or secure-storage symptoms
- Exclude by default: `mobile/`, `betamochi/`, unrelated slices

## Optimize Backend and AI Latency

- Include: kernel, `backend-ai-performance-remediator`, backend, ai-service
- Optional: schema, security, testing when the hotspot crosses those boundaries
- Exclude by default: frontend, mobile

## Fix Stale Agent Docs or Wrong Commands

- Include: kernel, affected slice docs
- Optional: testing, schema, or security refs only when validating the drift
- Exclude by default: unrelated subsystem slices

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
