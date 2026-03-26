# Router Decision Table

| Task type | Primary include | Optional include | Exclude by default | Typical cues |
| --- | --- | --- | --- | --- |
| Backend CRUD | kernel + backend | security, schema, testing | frontend, mobile, ai-service | endpoint, DTO, controller, service, BullMQ, module |
| Schema change | kernel + backend + schema | security, testing, matching client slice when contract changes are explicit | unrelated slices | migration, table, column, enum, Drizzle, SQL |
| Frontend page or bug | kernel + frontend | debugging, security, testing | mobile, ai-service, schema | page, route, component, hydration, dashboard, sonner |
| Mobile integration | kernel + `test-mobile` | backend, security, testing | `mobile`, `betamochi`, ai-service unless named | Expo, screen, navigator, secure storage, React Query |
| AI mentor / queue / extraction | kernel + backend + ai-service | schema, security, testing | frontend, mobile unless named | mentor, extraction, Ollama, retrieval, proxy, queue |
| Debugging | kernel + failing subsystem + debugging | security when auth/session/PII is involved | unrelated slices | trace, reproduce, regression, console, network |
| Test writing | kernel + target subsystem + testing | security, schema | unrelated slices | Jest, Playwright, spec, regression, coverage |

## Prompt And Path Overrides

- Prompt explicitly names `backend/`, `next-frontend/`, `ai-service/`, `test-mobile/`, `mobile/`, or `betamochi/`: trust the named folder over generic nouns.
- Prompt explicitly mentions both server and client work: allow two subsystem slices.
- Prompt asks for contract compatibility after a schema or backend change: add the matching client slice.
- Prompt asks for a generic `mobile` task: route to `test-mobile/`.

## Optional Slice Triggers

- Add `schema`: `schema`, `migration`, `table`, `column`, `enum`, `Drizzle`, `index`, `foreign key`
- Add `security`: `auth`, `role`, `guard`, `cookie`, `token`, `permission`, `PII`, `audit`, `refresh`
- Add `testing`: `test`, `spec`, `Playwright`, `Jest`, `coverage`, `regression`, `fixture`
- Add `debugging`: `bug`, `trace`, `reproduce`, `console`, `network`, `runtime`, `hydration`, `stack`
