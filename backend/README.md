# Nexora Backend

NestJS 11 API and system-of-record service for Nexora.

## Responsibilities

- JWT access tokens, rotating refresh sessions, OTP verification, and role-based access.
- Users, profiles, sections, classes, content, assessments, class records, announcements, and notifications.
- Academic state, audit history, analytics, reporting, performance snapshots, LXP, and interventions.
- Backend-facing contracts for both web and mobile clients.
- AI proxy authorization plus BullMQ orchestration for extraction and generation jobs.
- WebSocket events, health/readiness, Prometheus metrics, structured logs, and optional OTLP tracing.

The backend owns official academic records. LXP and AI features may assist or recommend, but must not bypass review/audit rules or write official grades through the AI service.

## Key paths

| Path | Ownership |
| --- | --- |
| `src/main.ts` | HTTP bootstrap, validation, CORS, cookies, Swagger, global prefix |
| `src/app.module.ts` | top-level module graph and global guards/filter |
| `src/tracing.ts` | optional OTLP tracing bootstrap; blank endpoint disables tracing |
| `src/modules/` | domain controllers, services, workers, DTOs, and tests |
| `src/drizzle/schema/` | schema source of truth |
| `drizzle/` | ordered SQL migrations and snapshots |
| `src/modules/health/` | liveness and dependency readiness |
| `src/monitoring/` | Prometheus metrics and structured logging |
| `docker-entrypoint.sh` | migration/seed bootstrap and upload-volume ownership repair |

Important extracted seams include performance snapshot reads, assessment access, LXP system evaluation, storage cleanup metrics, and AI generation/extraction queue workers. Existing public controllers and response envelopes remain the compatibility facade.

## Local development

```bash
npm install
cp .env.example .env
npm run start:dev
```

The default development command can coordinate the local AI service. Use `npm run start:dev:core` when only the Nest process should be started.

The development helper reads root `.env` when it bootstraps Compose dependencies. Create it from the root `.env.compose.example` first.

Common endpoints:

- API prefix: `http://localhost:3000/api`
- Swagger in development only: `http://localhost:3000/api/docs`
- Readiness: `http://localhost:3000/api/health/ready`
- Metrics: `http://localhost:3000/api/metrics`

## Environment boundaries

Start from `.env.example`; never commit a populated `.env`.

Required production inputs include:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `OTP_PEPPER`
- `AI_SERVICE_URL`
- `AI_SERVICE_SHARED_SECRET`

`AI_SERVICE_SHARED_SECRET` must exactly match the AI service. Browser and mobile clients do not receive this value.

Email is disabled when `EMAIL_SERVICE` is blank. Set `EMAIL_SERVICE=gmail` or `EMAIL_SERVICE=resend` only with valid provider credentials. The committed Docker template intentionally leaves delivery disabled.

Optional telemetry:

- Blank `OTEL_EXPORTER_OTLP_ENDPOINT` disables tracing safely.
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` enables Compose OTLP export.
- `LOKI_HOST=http://loki:3100` enables the direct Loki transport; Promtail also discovers container logs in the observability profile.

## Docker runtime

Use the root Compose workflow. The backend image runs migrations and the application as the unprivileged `node` user. The entrypoint begins as root only long enough to repair an older root-owned `/app/uploads` named volume, then drops privileges with `su-exec`.

Do not remove that bootstrap boundary without testing both a new volume and an existing root-owned volume.

## Verification

```bash
npm run lint
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

Additional safety checks:

```bash
npm run check:src-clean
npm run check:migrations
npm run seed:smoke
```

Apply the checked migration journal from the repository root with `node backend/run-migrations.js`, or from this directory with `node run-migrations.js`.

`npm run lint` is non-mutating. `npm run lint:fix` is the explicit local rewrite command. The warning ceiling is a ratchet for legacy debt; new errors are not accepted.

See `AGENTS.md` for change ownership and contract rules, `BACKEND_SETUP.md` for detailed setup, and the root README for Compose operations.
