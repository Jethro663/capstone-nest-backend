# Verification Checklist

## Command Selection Rules

- Start with the narrowest command that can prove the touched change.
- Expand verification when:
  - the touched surface crosses modules
  - shared helpers changed
  - contract or orchestration logic changed
  - a low-confidence edit needs stronger evidence

## Backend Verification

Run from `backend/`.

### Always-valid structural checks

- `npm run build`
- `npx eslint "{src,apps,libs,test}/**/*.ts"`

### Targeted tests

Prefer module-local specs first, for example:

- `npm test -- performance.service.spec.ts`
- `npm test -- ai-proxy.service.spec.ts`
- `npm test -- lxp.service.spec.ts`

Use targeted tests when:

- the module already has specs
- the change is local
- build plus lint are not enough to prove behavior

### Broader backend tests

- `npm run test`
- `npm run test:e2e`

Use only when:

- shared infrastructure changed
- multiple modules were touched
- targeted coverage is missing and the blast radius is wider

## AI Service Verification

Run from `ai-service/`.

### Always-valid structural checks

- `python scripts/run_tests.py`
- `python -c "from app.main import app; print(app.title)"`

### Targeted tests

Use the closest test module when the change is localized, for example:

- `python -m unittest tests.test_retrieval_service`
- `python -m unittest tests.test_extraction_pipeline`
- `python -m unittest tests.test_student_tutor_service`

### Broader checks

- `python scripts/run_eval_suite.py`

Use only when:

- changes affect multiple AI flows
- common helpers or shared routing logic changed
- one targeted test is not enough to prove stability

## Second-Pass Rescan

After verification passes, re-inspect:

- the touched files
- direct callers or dependents
- any helper introduced or expanded during remediation

Confirm:

- contracts and envelopes still match expectations
- guard clauses did not hide real failures
- query optimization did not move complexity into a different fragile helper
- async/concurrency cleanup did not change order-sensitive behavior
- the new structure is easier to extend than the old one

## Reporting Rules

- Record exactly what was run.
- Distinguish:
  - `verified by command`
  - `reasoned but not directly measurable`
  - `untested due to missing coverage`
- If a broader check was skipped, state why the narrower set was sufficient.

## Important Note

`backend/package.json` defines `npm run lint` as `eslint ... --fix`.

That means:

- do not use `npm run lint` for pre-edit baseline capture
- use direct `npx eslint "{src,apps,libs,test}/**/*.ts"` when you need a non-mutating lint signal
- reserve mutating lint/format runs for deliberate post-edit cleanup only
