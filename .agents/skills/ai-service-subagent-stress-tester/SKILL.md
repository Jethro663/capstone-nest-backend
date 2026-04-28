---
name: ai-service-subagent-stress-tester
description: Use when stress testing `ai-service/`, validating LXP and other AI-backed features, pressure-testing tutor, mentor, remedial, retrieval, extraction, or quiz flows, or checking whether the AI service is actually robust in `capstone-nest-react-lms`; especially use when independent subagents should execute realistic AI reliability scenarios in parallel while preserving backend proxy compatibility.
---

# AI Service Subagent Stress Tester

Stress-test `ai-service/` as a product surface, not just a unit-test package. Discover the real AI entrypoints, map them to backend proxy and LXP integration paths, design realistic scenario families, run independent ones in parallel with subagents, then report what is confirmed working, degraded, fragile, or failing.

## Quick Start

- Emit:
  `ROUTER_TRACE task=ai-stress-test include=kernel,ai-service,backend optional_skipped=schema,security,debugging exclude=next-frontend,test-mobile reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `ai-service/AGENTS.md`
  - `backend/AGENTS.md` only when backend proxy, LXP integration, or contract validation is in scope
- Discover surfaces with `scripts/discover_surfaces.py`.
- Capture baseline before scenario execution.
- Build the scenario matrix before spawning subagents.

## Scope Rules

- Primary target: `ai-service/`
- Backend awareness is required only for:
  - proxy path and header compatibility
  - LXP/AI integration points
  - queued AI job or orchestration assumptions
  - response-envelope compatibility
- Exclude `next-frontend/` and mobile unless the prompt explicitly expands scope.
- Preserve:
  - AI read-only behavior for grades, enrollment, and official academic records
  - backend proxy compatibility
  - backend-compatible envelopes
  - no schema or caching policy changes unless the user explicitly requests them

## Audit Mode vs Remediation Mode

- Default to audit mode.
- Enter remediation mode only when the user explicitly asks to fix, harden, or automatically remediate findings.
- In remediation mode:
  - apply only bounded, local, high-confidence fixes
  - do not broad-refactor speculative architecture
  - keep subagent write scopes disjoint

## Workflow

### 1. Route and lock the testing boundary

- Always start from `ai-service/`.
- Add backend context only when validating:
  - `backend/src/modules/ai-mentor/ai-proxy.service.ts`
  - `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
  - `backend/src/modules/lxp/*`
  - other directly relevant AI proxy or LXP wiring
- Load `references/contract-checklist.md` and `references/verification-checklist.md` when contract or verification work starts.

### 2. Discover real test surfaces before inventing scenarios

- Run `scripts/discover_surfaces.py`.
- Confirm route and service families such as:
  - tutor and chat
  - JA practice / ask / review
  - extraction and apply flow
  - retrieval preview and indexing
  - quiz draft generation
  - remedial recommendation
  - AI job runtime and result retrieval
  - backend proxy headers and timeouts
- Use the real route inventory and existing tests to drive scenarios. Do not invent product flows that the repo does not have.

### 3. Capture a baseline before stressing anything

- From `ai-service/`:
  - `python scripts/run_tests.py`
  - targeted `python -m unittest ...` for the surfaces most likely to be exercised
  - `python -c "from app.main import app; print(app.title)"`
- Add `python scripts/run_eval_suite.py` only when prompt/model behavior or broad AI runtime quality is in question.
- If backend contract validation matters, add the narrowest meaningful backend checks.
- Record:
  - what passed
  - what failed
  - what is unverified
  - what can only be approximated locally

### 4. Build the scenario matrix before spawning

Each scenario should define:

- `feature`
- `scenario`
- `loadStyle`
- `expectedResult`
- `failureSignal`
- `observabilityEvidence`
- `confidence`

Use `references/stress-scenario-checklist.md` for the scenario families.

Required scenario types:

- repeated request pressure
- concurrent request pressure
- slow model response handling
- timeout handling
- partial dependency failure
- malformed but realistic inputs
- retrieval miss or weak-context behavior
- large content or long-running payload flow
- repeated extraction or indexing requests
- backend header or contract mismatch scenarios
- LXP-adjacent AI flows, not just generic chat

### 5. Use subagents only for independent scenario families

Preferred parallel ownership:

- tutor/chat scenarios
- LXP/remedial and JA scenarios
- retrieval/extraction/indexing scenarios
- backend proxy and contract compatibility scenarios
- second-pass verification

Rules:

- Keep orchestration centralized in the main agent.
- Give each subagent a bounded scenario family and output contract.
- Do not send vague "explore everything" prompts.
- If remediation happens, no two subagents may edit the same file set at the same time.
- Do not offload the immediate blocking task if the main agent needs it locally first.

Expected subagent return shape:

- scenario executed
- inputs
- observed output
- failures or timeouts
- suspected bottleneck or fragility
- likely owning files
- confidence

### 6. Classify findings before editing

Split findings into:

- confirmed bugs
- resilience or reliability failures
- performance bottlenecks
- contract fragility
- extension-risk fragility

Also label each result as:

- tested working
- degraded but functional
- partially verified
- unverified
- failing

Do not say "works" unless the executed scenario supports it.
Do not say "production ready" unless evidence is unusually strong.

### 7. Build the remediation plan

Use exactly three buckets:

- `safe immediate fixes`
- `conditional local refactors`
- `deferred items requiring human decision`

Explain:

- why each item matters
- likely owning files
- expected effect
- verification path

### 8. Remediate only when allowed

- Apply only minimal, high-confidence fixes.
- Preserve:
  - AI read-only behavior for official academic records
  - backend proxy headers and paths
  - response envelopes
  - current public contracts unless explicitly allowed to change
- No destructive operations.
- No unrelated reverts.
- No schema migrations unless explicitly requested.

### 9. Re-test and re-classify

- Re-run the affected scenario families.
- Re-run the closest baseline checks.
- Use an independent verification subagent when helpful.
- Distinguish measured changes from reasoned changes.

### 10. Report inline and to durable artifacts

- Always produce a short inline summary.
- Also render durable artifacts under `docs/system-audit/` with `scripts/render_stress_report.py`.
- Required sections:
  - short stress-test summary
  - scenario matrix summary
  - prioritized findings
  - remediation plan
  - actual edits when safe
  - before-vs-after comparison
  - remaining risks
  - confidence in LXP and AI feature readiness
  - second-pass verification

## Quick Reference

| Phase | Required output | Notes |
|---|---|---|
| Baseline | test/import results and direct verification limits | Record what is actually covered |
| Scenario design | stress matrix | Build before spawning subagents |
| Parallel execution | per-subagent results | Keep ownership disjoint |
| Findings | classified risk list | Separate failing from degraded and unverified |
| Remediation plan | safe, conditional, deferred | Required before edits |
| Re-test | affected scenarios plus baseline checks | Compare like for like |
| Report | inline summary plus `docs/system-audit/*` artifacts | Use the render script |

## Commands

### Surface inventory

```bash
python .agents/skills/ai-service-subagent-stress-tester/scripts/discover_surfaces.py
```

### AI baseline

```bash
cd ai-service
python scripts/run_tests.py
python -c "from app.main import app; print(app.title)"
```

### Deeper AI verification

```bash
cd ai-service
python scripts/run_eval_suite.py
```

### Render report artifacts

```bash
python .agents/skills/ai-service-subagent-stress-tester/scripts/render_stress_report.py path/to/stress-data.json
```

## Artifact Contract

`scripts/render_stress_report.py` expects a JSON payload that can include:

```json
{
  "runMeta": {
    "date": "2026-04-17",
    "repo": "capstone-nest-react-lms"
  },
  "baseline": [
    "python scripts/run_tests.py passed",
    "app import check passed"
  ],
  "scenarios": [
    {
      "feature": "student-tutor",
      "scenario": "concurrent session messages",
      "loadStyle": "parallel",
      "expectedResult": "responses remain bounded and session state remains valid",
      "failureSignal": "timeout or inconsistent session payload",
      "observabilityEvidence": "route-level response mismatch and test failure",
      "confidence": "medium"
    }
  ],
  "findings": [
    {
      "priority": "P1",
      "severity": "high",
      "status": "failing",
      "category": "contract-fragility",
      "title": "Tutor route fails when forwarded roles header is malformed",
      "files": ["ai-service/app/main.py"],
      "evidence": "Scenario reproduced a 500 instead of a bounded client error."
    }
  ],
  "plan": {
    "safeImmediateFixes": ["Guard malformed forwarded-role parsing."],
    "conditionalRefactors": [],
    "deferredItems": []
  },
  "changesMade": [],
  "verification": ["python scripts/run_tests.py"],
  "comparison": {
    "improved": [],
    "unchanged": [],
    "remainingRisks": []
  },
  "readiness": {
    "lxp": "partially verified",
    "aiFeatures": "degraded but functional",
    "notes": ["Extraction concurrency still needs deeper runtime evidence."]
  },
  "secondPassVerification": [
    "No new contract drift detected after the local fix."
  ]
}
```

## Load References Only When Needed

- `references/stress-scenario-checklist.md`
  - Use for scenario families, failure modes, and subagent ownership mapping.
- `references/contract-checklist.md`
  - Use when backend proxy headers, paths, envelopes, or LXP integration are under review.
- `references/verification-checklist.md`
  - Use when choosing baseline, retest, and second-pass commands.

## Common Mistakes

- Treating `python scripts/run_tests.py` as proof that the AI features are robust under pressure.
- Stress-testing only `/chat` and ignoring LXP-adjacent or teacher-facing AI flows.
- Spawning multiple subagents to explore the same scenario family without ownership boundaries.
- Reporting synthetic throughput numbers with no reproducible basis.
- Claiming production readiness from unit tests alone.
- Fixing one scenario by changing a public contract without checking backend proxy compatibility.

## Final Rule

Use subagents to parallelize independent pressure scenarios, not to fragment responsibility. Evidence first, claims second.
