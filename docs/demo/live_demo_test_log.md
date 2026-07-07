# Live Demo Test Log

## Runtime Context
- Existing local processes were already running for backend, frontend, ai-service, Postgres, and Ollama.
- Docker compose itself showed no active services during the audit, so the live proof came from the active local dev stack.

## Commands Run
- `docker compose --env-file .env.compose ps`
- `Invoke-WebRequest http://localhost:3000/api/health/ready`
- `Invoke-WebRequest http://localhost:3000/api/docs`
- `Invoke-WebRequest http://localhost:3001`
- `Invoke-WebRequest http://localhost:11434/api/tags`
- `node next-frontend/scripts/nav-perf-smoke.js`
- `inline Playwright browser crawl against web routes with screenshots`
- `node backend/scripts/post-seed-smoke.js (first attempt from repo root failed due to postgres host resolution)`
- `node backend/scripts/post-seed-smoke.js (rerun from backend cwd succeeded)`
- `..\.venv\Scripts\python.exe scripts/run_tests.py (from ai-service cwd)`
- `npm run build (backend)`
- `npm run build (next-frontend)`
- `npm run typecheck (mobile)`
- `npm run test (mobile)`

## Key Results
- `GET /api/health/ready` succeeded with database, redis, and aiService all healthy.
- `GET /api/docs` returned 404, which confirms Swagger is not served from that path.
- Frontend root and authenticated routes responded successfully.
- Ollama tags confirmed `qwen2.5:3b`, `gemma3:4b`, and `nomic-embed-text` were present.
- `next-frontend/scripts/nav-perf-smoke.js` completed and exercised admin, teacher, and student routes successfully.
- Playwright crawl captured screenshots for major admin, teacher, and student pages with no console errors recorded.
- `backend/scripts/post-seed-smoke.js` succeeded after rerun from the backend cwd.
- `ai-service/scripts/run_tests.py` passed 60 tests after rerun from the ai-service cwd.
- `npm run build` passed in backend and web; `npm run typecheck` and `npm run test` passed in `mobile`.

## Important Runtime Findings
- Admin diagnostics page is real and populated.
- Admin audit trail page is real and populated.
- Teacher interventions page explicitly shows the 74% trigger threshold.
- Student JA Hub exists, but can sit on a loading state before rendering full content.

## Blockers and Retries
- The stack was already running outside docker compose, so live proof came from existing local processes rather than a fresh compose startup.
- The first backend post-seed smoke run failed from the repo root because it resolved the wrong database host; rerunning from backend cwd fixed it.
- The first ai-service test invocation used the wrong relative .venv path; rerunning from ai-service cwd fixed it.
- Exact DOCX pagination is approximate outside the table/list references because raw text extraction does not preserve Word layout perfectly.

## Screenshots Captured
- `docs/research-paper-audit/screenshots/login.png`
- `docs/research-paper-audit/screenshots/forgot-password.png`
- `docs/research-paper-audit/screenshots/admin-dashboard.png`
- `docs/research-paper-audit/screenshots/admin-diagnostics.png`
- `docs/research-paper-audit/screenshots/admin-audit.png`
- `docs/research-paper-audit/screenshots/teacher-dashboard.png`
- `docs/research-paper-audit/screenshots/teacher-classes.png`
- `docs/research-paper-audit/screenshots/teacher-interventions.png`
- `docs/research-paper-audit/screenshots/student-dashboard.png`
- `docs/research-paper-audit/screenshots/student-courses.png`
- `docs/research-paper-audit/screenshots/student-ja.png`
- `docs/research-paper-audit/screenshots/student-ja-delayed.png`
- `docs/research-paper-audit/screenshots/student-announcements.png`
