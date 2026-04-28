# Verification Checklist

## Default Baseline

Run from `ai-service/`:

- `python scripts/run_tests.py`
- `python -c "from app.main import app; print(app.title)"`

Use this baseline before scenario execution and after remediation.

## Targeted Verification

Prefer targeted tests for the scenario family you touched or reproduced.

Examples:

- `python -m unittest tests.test_student_tutor_service`
- `python -m unittest tests.test_quiz_generation_service`
- `python -m unittest tests.test_retrieval_service`
- `python -m unittest tests.test_extraction_pipeline`
- `python -m unittest tests.test_ai_job_runtime`

Use targeted runs when:

- the finding is local
- the owning files are narrow
- you need fast retest loops

## Broader AI Verification

- `python scripts/run_eval_suite.py`

Use this when:

- prompt/model behavior changed
- multiple AI surfaces are implicated
- the narrower set is not enough to support the final claim

## Backend-Aware Verification

Add backend verification only when proxy or LXP integration is directly involved.

Prefer:

- targeted backend specs in `backend/src/modules/ai-mentor/**/*.spec.ts`
- targeted backend specs in `backend/src/modules/lxp/**/*.spec.ts`
- `npm run build` from `backend/` for structural confirmation

Do not escalate to broad backend suites unless the touched blast radius justifies it.

## Scenario Re-Run Rules

After remediation:

1. Re-run the exact scenario family that failed.
2. Re-run the narrowest relevant baseline checks.
3. Re-run any contract-specific checks if a route, header, or envelope path changed.
4. If a subagent reproduced the original failure, prefer an independent verification subagent for the second pass.

## Reporting Rules

For every final claim, identify whether it is:

- `verified by direct execution`
- `verified by tests`
- `reasoned but not directly measurable`
- `unverified`

Do not collapse those categories into one generic "passed" statement.
