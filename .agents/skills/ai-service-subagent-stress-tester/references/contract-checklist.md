# Contract Checklist

## Backend Proxy Boundary

Validate compatibility between:

- `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- `ai-service/app/main.py`
- `ai-service/app/schemas.py`

## Required Headers

Check handling for:

- `X-User-Id`
- `X-User-Email`
- `X-User-Roles`
- optional `X-Internal-Service-Token`

Questions:

1. Does the route fail clearly when a required forwarded header is missing or malformed?
2. Does the route preserve backend-owned auth context assumptions instead of inventing direct-client auth?
3. Are role-dependent flows bounded and diagnosable when role headers are wrong?

## Paths and Route Families

Confirm that backend-exposed AI routes map to live AI service paths for:

- `/chat`
- `/admin/chat`
- `/student/tutor/*`
- `/student/ja/*`
- `/extract`
- `/extractions/*`
- `/teacher/interventions/*`
- `/teacher/quizzes/*`

Flag:

- path drift
- route family assumptions duplicated across backend and AI service
- timeout mismatches between route families

## Envelope Expectations

Check whether AI service responses stay compatible with backend consumers.

Important:

- preserve the backend-compatible envelope where the backend expects it
- do not silently change field names or nesting
- do not change error semantics casually

## LXP and AI Integration Checks

Validate whether AI flows that influence LXP-adjacent user experience remain compatible with:

- tutor bootstrap and session flows
- JA practice / ask / review flows
- remedial recommendation flows
- backend `lxp` module expectations where AI support is implied

Look for:

- mismatched identifiers
- role expectation drift
- session bootstrap assumptions
- hidden dependency on backend data shape

## Timeout and Degraded Mode Checks

Compare AI route families against backend timeout assumptions.

Examples:

- chat and tutor routes should not inherit extraction-style timeout expectations
- extraction and generation routes should not pretend to be low-latency chat paths
- degraded mode should remain visible to the caller, not silently mask failure

## Reporting Rules

- Mark each issue as `confirmed` or `suspected`.
- If the problem is inferred from route wiring or proxy assumptions, label it as inference.
- If a contract is unverified because no realistic local execution path exists, report that explicitly.
