# Nexora Rule Index

Use rule IDs in reasoning, reviews, and implementation notes instead of repeating long prose.

## Architecture

| Rule | Meaning | Primary anchors |
| --- | --- | --- |
| `ARCH-1` | Controllers route, validate, delegate, and format only. | `backend/src/modules/*/*.controller.ts` |
| `ARCH-2` | Services own business logic and orchestration. | `backend/src/modules/*/*.service.ts` |
| `ARCH-3` | Backend services access Drizzle through `DatabaseService` and `this.db`. | `backend/src/database`, `backend/src/modules/*/*.service.ts` |
| `ARCH-4` | Modules are feature boundaries; do not import another module's private internals. | `backend/src/modules/*/*.module.ts` |

## Auth, Contracts, And Errors

| Rule | Meaning | Primary anchors |
| --- | --- | --- |
| `AUTH-1` | JWT auth is global; `@Public()` is explicit. | `backend/src/app.module.ts`, `backend/src/modules/auth` |
| `AUTH-2` | Roles are enforced explicitly with role-aware guards and decorators. | `backend/src/common/constants/role.constants.ts`, `backend/src/modules/auth/guards/roles.guard.ts` |
| `VALID-1` | DTO validation is required on external inputs. | `backend/src/main.ts`, `backend/src/modules/*/DTO`, `next-frontend/src/schemas` |
| `RESP-1` | Preserve the `success/message/data` envelope unless the task explicitly changes the contract. | `backend/src/modules/*/*.controller.ts`, `next-frontend/src/services`, `next-frontend/src/lib/auth-service.ts` |
| `SEC-1` | Do not leak PII, secrets, stack traces, or internal-only diagnostics. | `backend/src/common/filters`, `backend/src/modules/auth`, response DTOs |
| `ERR-1` | Use the correct framework exception/status type for each failure path. | `backend/src/common/filters/global-exception.filter.ts`, controllers/services |
| `AUD-1` | Audit-log sensitive academic writes. | `backend/src/modules/audit`, `backend/src/drizzle/schema/base.schema.ts` |

## Domain And Data Integrity

| Rule | Meaning | Primary anchors |
| --- | --- | --- |
| `DOM-1` | LXP eligibility is based on low performance across multiple assessments, not a single score. | `backend/src/modules/performance/performance.service.ts`, `backend/src/modules/lxp/lxp.service.ts` |
| `DOM-2` | LXP access stays guarded and is not general-purpose content access. | `backend/src/modules/lxp/lxp.controller.ts`, `backend/src/modules/lxp/lxp.service.ts` |
| `DOM-3` | LXP never writes official class records. | `backend/src/modules/lxp`, `backend/src/modules/class-record` |
| `AI-1` | AI mentor is read-only for grades, enrollment, and official academic records. | `backend/src/modules/ai-mentor`, `ai-service/app` |
| `AI-2` | AI work is async via BullMQ or equivalent queue orchestration. | `backend/src/app.module.ts`, `backend/src/modules/ai-mentor` |
| `AI-3` | AI feedback logs stay separate from official academic records. | `backend/src/drizzle/schema/ai-mentor.schema.ts` |
| `INT-1` | Intervention activation requires teacher or admin approval. | `backend/src/modules/lxp/lxp.service.ts` |
| `INT-2` | Intervention history is append-only. | `backend/src/drizzle/schema/lxp.schema.ts`, `backend/src/modules/lxp` |
| `REC-1` | Assessment scores are immutable after teacher review. | `backend/src/modules/assessments`, `backend/src/modules/class-record` |
| `DATA-1` | Computed totals are not authoritative stored values. | `backend/src/modules/class-record`, `backend/src/modules/performance` |
| `DATA-2` | LXP eligibility is computed or recomputed; do not rely on a permanent stale flag. | `backend/src/modules/performance/performance.service.ts`, `backend/src/modules/lxp/lxp.service.ts` |

## Router Rules

| Rule | Meaning |
| --- | --- |
| `ROUTER-1` | Load kernel first, then one primary slice. |
| `ROUTER-2` | Add cross-cutting slices only on prompt or path triggers. |
| `ROUTER-3` | Add a second subsystem slice only for explicit cross-boundary work. |
| `ROUTER-4` | Keep appendices unloaded unless exact detail is needed. |
| `ROUTER-5` | Emit `ROUTER_TRACE` before substantive work. |
