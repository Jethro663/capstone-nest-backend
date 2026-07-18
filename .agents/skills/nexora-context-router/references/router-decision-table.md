# Router Decision Table

| Task type | Primary include | Optional include | Exclude by default | Typical cues |
| --- | --- | --- | --- | --- |
| Contract change | kernel + backend + schema + matching client slice when the contract escapes backend | security, testing, ai-service | unrelated slices | schema, DTO, response envelope, contract, typed client, wire to mobile/web |
| Auth/session | kernel + failing client slice + backend + security | debugging, testing | unrelated slices | refresh token, cookie, login loop, logout, route gate, 401 after refresh, secure storage |
| Dev stack | kernel + backend + ai-service | next-frontend, mobile, security | unrelated slices | docker compose, unhealthy, ready, env, startup, Redis, Postgres, Ollama, port |
| Cross-platform smoke | kernel + affected slices + testing | security | unrelated slices | safest checks, smoke, sanity, minimal regression, what should I run |
| Backend CRUD | kernel + backend | security, schema, testing | frontend, mobile, ai-service | endpoint, DTO, controller, service, BullMQ, module |
| Schema change | kernel + backend + schema | security, testing, matching client slice when contract changes are explicit | unrelated slices | migration, table, column, enum, Drizzle, SQL |
| Frontend page or bug | kernel + frontend | debugging, security, testing | mobile, ai-service, schema | page, route, component, hydration, dashboard, sonner |
| Mobile audit | kernel + mobile + testing | backend, security | unrelated web or ai-service slices | audit mobile role flow, login, navigation, query invalidation, Expo health |
| Mobile integration | kernel + `mobile` | backend, security, testing | unrelated slices | Expo, screen, navigator, secure storage, React Query |
| AI mentor / queue / extraction | kernel + backend + ai-service | schema, security, testing | frontend, mobile unless named | mentor, extraction, Ollama, retrieval, proxy, queue |
| Debugging | kernel + failing subsystem + debugging | security when auth/session/PII is involved | unrelated slices | trace, reproduce, regression, console, network |
| Test writing | kernel + target subsystem + testing | security, schema | unrelated slices | Jest, Playwright, spec, regression, coverage |
| Repo docs drift | kernel + affected slice docs | testing, schema, security | unrelated subsystem slices | command is wrong, docs drift, AGENTS mismatch, stale verification note |

## Precedence

- Specialized workflow routing wins before generic subsystem routing.
- When a prompt matches both a workflow and a subsystem, load the workflow skill first and let it pull only the slices it needs.
- Contract drift, auth/session issues, smoke verification, and stack health should not fall through to generic CRUD or page-bug routing.
- Tool selection follows the same priority: Serena or Playwright first when they can answer the task directly, shell when the task is command-oriented.

## Prompt And Path Overrides

- Prompt explicitly names `backend/`, `next-frontend/`, `ai-service/`, or `mobile/`: trust the named folder over generic nouns.
- Prompt explicitly mentions both server and client work: allow two subsystem slices.
- Prompt asks for contract compatibility after a schema or backend change: add the matching client slice.
- Prompt asks for a generic `mobile` task: route to `mobile/`.

## Optional Slice Triggers

- Add `schema`: `schema`, `migration`, `table`, `column`, `enum`, `Drizzle`, `index`, `foreign key`
- Add `security`: `auth`, `role`, `guard`, `cookie`, `token`, `permission`, `PII`, `audit`, `refresh`
- Add `testing`: `test`, `spec`, `Playwright`, `Jest`, `coverage`, `regression`, `fixture`
- Add `debugging`: `bug`, `trace`, `reproduce`, `console`, `network`, `runtime`, `hydration`, `stack`
