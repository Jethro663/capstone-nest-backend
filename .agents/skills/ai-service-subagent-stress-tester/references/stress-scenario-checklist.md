# Stress Scenario Checklist

## Scenario Families

Cover the AI service as reachable product behavior, not just helper functions.

### Tutor and Chat

- repeated `/chat` requests
- repeated `/student/tutor/session/{id}/message`
- concurrent tutor messages against the same session
- concurrent tutor messages across different sessions
- malformed session or answer payloads
- weak-context or empty-context requests
- slow model response simulation if a local hook or mock path exists

### JA and LXP-Adjacent Flows

- `/student/ja/practice/*`
- `/student/ja/ask/*`
- `/student/ja/review/*`
- tutor bootstrap paths used by LXP-adjacent experiences
- remedial or intervention recommendation paths that influence LXP workflows

Check whether:

- responses stay bounded and intelligible
- missing context degrades cleanly
- LXP-linked AI surfaces fail visibly rather than silently
- extension of one JA flow is likely to destabilize another

### Teacher AI Generation

- quiz draft job enqueue and result retrieval
- direct quiz draft generation
- intervention recommendation enqueue and result retrieval
- repeated teacher generation requests for the same logical work
- malformed or oversized teacher request payloads

### Retrieval, Extraction, and Indexing

- retrieval preview with sparse or irrelevant context
- repeated indexing triggers
- repeated extraction requests
- extraction status polling under in-flight and failed states
- apply flow after extraction completion
- malformed extraction updates
- degraded dependency paths such as unavailable Ollama or weak extraction confidence

### Backend Contract and Headers

- missing `X-User-Id`
- malformed `X-User-Roles`
- absent or incorrect `X-Internal-Service-Token` where relevant
- path and envelope expectations across backend proxy routes
- backend timeout assumptions vs AI route families

## Load Styles

Use explicit labels:

- `single`
- `repeated`
- `parallel`
- `burst`
- `long-running`
- `degraded-dependency`
- `malformed-realistic`

Do not fake high-volume benchmarking. Prefer realistic, reproducible local pressure.

## Observability Evidence

Each scenario should collect at least one of:

- unit or integration test result
- runtime response payload
- timeout or status code
- structured exception text
- route-level mismatch
- log or warning message when directly available

## Subagent Ownership Mapping

Preferred ownership split:

- `chat-tutor`
- `ja-lxp-remedial`
- `retrieval-extraction-indexing`
- `backend-contract`
- `second-pass-verifier`

Do not assign overlapping scenario families unless the user explicitly wants comparative duplication.

## Result Labels

Use one result label per scenario:

- `tested working`
- `degraded but functional`
- `partially verified`
- `unverified`
- `failing`

Use one risk type per issue:

- `confirmed bug`
- `resilience failure`
- `performance bottleneck`
- `contract fragility`
- `extension-risk fragility`
