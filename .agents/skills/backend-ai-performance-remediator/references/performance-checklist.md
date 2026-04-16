# Performance Checklist

## Baseline Capture

Run before editing.

### Backend

- `cd backend`
- `npm run build`
- `npx eslint "{src,apps,libs,test}/**/*.ts"`
- targeted Jest for hotspots with nearby specs

Record:

- pass/fail status
- command duration when material
- exact failing files or tests
- whether the signal is structural, functional, or approximate performance-related

Do not use `npm run lint` for the pre-edit baseline. It runs with `--fix`.

### AI Service

- `cd ai-service`
- `python scripts/run_tests.py`
- `python -c "from app.main import app; print(app.title)"`

Record:

- pass/fail status
- import/startup errors
- missing dependencies or env expectations
- targeted test names that map to suspected hotspots

## DB and Query Review

Check for:

- loops that issue per-item DB queries
- repeated query fragments assembled in multiple methods
- queries that fetch broad datasets only to filter in memory
- duplicated joins or lookups across nearby helpers
- repeated count or aggregation queries that can share a single read path
- service methods that interleave query generation and presentation shaping

Questions:

1. Can this query path collapse into one read or one helper?
2. Is the code paying DB cost repeatedly because orchestration is unclear?
3. Would adding one more related entity multiply query count again?

## Async and Concurrency Review

Check for:

- sequential awaits on independent reads
- serialized remote calls with no dependency between them
- CPU-heavy preprocessing inside request paths
- repeated normalization or parsing of the same payload
- orchestration code that prevents safe `Promise.all` or `asyncio.gather`

Questions:

1. Are these operations truly dependent?
2. Would parallelization preserve order-sensitive semantics?
3. Would batching or helper extraction make future concurrency safer?

## AI Pipeline Waste Review

Check for:

- repeated chunking, sanitization, or embedding preparation
- model selection logic duplicated across services
- repeated retrieval/index construction within a single request family
- prompt assembly logic copied across tutoring, quiz, remedial, and mentor flows
- extraction paths that re-read the same content multiple times

Questions:

1. Is expensive work repeated because state is passed poorly?
2. Would extracting a pure helper remove duplication without adding stale state?
3. Is a route doing service-layer orchestration that should live deeper?

## Measurement Rules

- Prefer existing tests and observable command timings over invented numbers.
- If timing a command manually, say it is approximate.
- Only compare like-for-like measurements before and after.
- If the change is structural and not directly measurable, report reasoned benefit instead of fake timing deltas.
- Never present a percentage improvement without a reproducible basis.
