# Audit Heuristics

## Severity Rubric

Use the smallest honest severity that matches the risk.

| Severity | Meaning | Typical signal |
|---|---|---|
| `critical` | Likely data corruption, security break, or contract break in common flow | Official records risk, auth bypass, broken backend/AI headers, write-path rule violation |
| `high` | Material performance waste, fragile logic, or hidden failure likely to affect common usage or adjacent features | Repeated DB fan-out, hidden exception swallowing, tightly coupled orchestration |
| `medium` | Real maintainability or efficiency issue with bounded current blast radius | Duplicate branching, repeated recomputation, weak helper boundaries |
| `low` | Small cleanup or clarity improvement | Minor guard clause, naming cleanup, local dead path |

Use a separate `priority` field when ordering work. Example:

- `P1`: fix now, safe and material
- `P2`: useful, but secondary
- `P3`: defer unless already touching the area

## Backend Anti-Patterns

Check each `backend/src/modules/*` area for:

- repeated Drizzle queries in loops
- service methods that mix orchestration, query building, formatting, and policy logic
- controllers containing business logic or query logic
- cross-module coupling through private helpers or leaked implementation assumptions
- repeated status or eligibility calculations with copy-pasted branches
- helper functions that hide query count explosions
- sequential awaits for independent reads or writes
- broad `try/catch` blocks that flatten real failure causes
- envelope drift away from `success/message/data`
- direct DB access patterns that bypass `DatabaseService` and `this.db`
- writes that should trigger audit logging but do not

Fragility warning signs:

- branching keyed on literal strings repeated across services
- data assembly spread across multiple methods with shared mutable locals
- behavior depending on order of array iteration without explicit contract
- implicit assumptions that a related module will never add a new enum/status/case

## AI Service Anti-Patterns

Check `ai-service/app/*` for:

- repeated prompt/model selection logic scattered across files
- retrieval or extraction flows that repeat expensive normalization or chunking
- blocking preprocessing in request handlers that could be isolated
- sequential remote calls that can safely share a gather pattern
- route handlers doing service-level orchestration inline
- response-envelope drift that can break backend proxy expectations
- error handling that hides model failures, timeout causes, or dependency unavailability
- task behavior that mutates or appears to mutate official academic records
- duplicated content sanitation, parsing, or validation logic

Fragility warning signs:

- backend header assumptions not validated consistently
- request parsing logic duplicated between route and service layers
- long files with multiple unrelated route families or flows
- model-routing branches that require touching multiple files for one new capability

## Extension-Risk Heuristics

Flag logic that is not broken today but is likely to break when adjacent work lands.

Examples:

- a condition tree that assumes only two assessment states, while nearby modules already imply more
- a helper that returns a shape assembled from positional tuple ordering instead of explicit keys
- orchestration that depends on synchronous ordering of unrelated data fetches
- route/service code that requires copy-pasting a new branch for every new AI mode or analytics variant
- duplicated rule logic across backend and AI service that will drift under future edits

Use these questions:

1. Would adding one more status, model, or module require touching multiple unrelated files?
2. Does the code hide assumptions that are not enforced by type, DTO, schema, or guard?
3. Does one service know too much about another service's internal data assembly?
4. Would a new adjacent feature likely duplicate this logic instead of extending it cleanly?

If the answer is yes, record it as fragility even when no production failure is visible yet.

## Backend and AI Contract Checks

Audit compatibility at these boundaries:

- backend proxy path and method expectations
- response envelope shape
- forwarded headers:
  - `X-User-Id`
  - `X-User-Email`
  - `X-User-Roles`
  - optional `X-Internal-Service-Token`
- timeout expectations and retry behavior
- error translation between FastAPI exceptions and NestJS responses

High-risk findings include:

- changed path or envelope without proxy updates
- AI route assuming direct-client auth instead of backend-owned auth context
- backend service assuming AI writes official records
- silent fallback behavior that hides AI unavailability from the backend

## Evidence Rules

- Prefer confirmed evidence over inference.
- When using inference, label it as inference.
- If no benchmark or runtime trace exists, explain the expected benefit from structure and call path.
- Do not convert a style complaint into a performance claim without evidence.
