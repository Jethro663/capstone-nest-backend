---
name: backend-ai-performance-remediator
description: Use when reviewing or optimizing `backend/` plus `ai-service/` performance, query flow, async orchestration, logic fragility, extension risk, or backend/AI contract safety in `capstone-nest-react-lms`; also use for cross-subsystem audits that should inspect both services, apply only bounded high-confidence fixes, and verify before-vs-after results.
---

# Backend AI Performance Remediator

Audit both `backend/` and `ai-service/` as one bounded system. Capture a baseline, inspect each backend module plus key AI files, plan fixes before editing, apply only low-risk improvements, then verify and report what actually improved.

## Quick Start

- Emit:
  `ROUTER_TRACE task=performance-audit include=kernel,backend,ai-service optional_skipped=next-frontend,mobile exclude=<extra unloaded slices> reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `backend/AGENTS.md`
  - `ai-service/AGENTS.md`
- Discover inventory with `scripts/discover_targets.py`.
- Capture baseline before editing.
- Audit first, edit second, verify third, re-audit fourth.

## Workflow

### 1. Route and lock scope

- Always treat this as a dual-subsystem run:
  - `backend/`
  - `ai-service/`
- Exclude `next-frontend/` and mobile unless the user explicitly expands scope.
- Load cross-cutting refs only when findings justify them:
  - `references/verification-checklist.md` for all verification work
  - Nexora router `testing` slice when tests need broader interpretation
  - Nexora router `security` slice for auth, RBAC, audit, token, or PII findings
  - Nexora router `schema` slice only if a suspected issue depends on contract shape

### 2. Discover targets before judging hotspots

- Do not cherry-pick a few large files and call it complete.
- Run `scripts/discover_targets.py` and review:
  - every directory under `backend/src/modules/*`
  - key Python files under `ai-service/app/*.py`
- Use that inventory as the checklist for the audit pass.
- Keep the audit module-by-module, even when the final report summarizes only the important findings.

### 3. Capture a baseline before edits

- Backend baseline:
  - `npm run build`
  - `npx eslint "{src,apps,libs,test}/**/*.ts"` from `backend/`
  - targeted Jest only when a hotspot already has nearby specs or a narrow regression surface
- AI baseline:
  - `python scripts/run_tests.py` from `ai-service/`
  - `python -c "from app.main import app; print(app.title)"` from `ai-service/`
- Measurements:
  - Use lightweight timings only when they reveal a realistic hotspot.
  - Accept approximate timings when no benchmark suite exists.
  - Label approximate numbers as approximate. Do not fake precision.
- Record failures, warnings, durations, and missing coverage before touching code.

### 4. Audit both services systematically

Review each target for these smell classes:

- repeated or slow DB access
- N+1 or redundant queries
- unnecessary recomputation
- serialized awaits that can be safely parallelized
- blocking work inside request paths
- oversized methods or files hiding multiple concerns
- duplicate logic
- fragile condition trees
- weak module boundaries or hidden cross-module coupling
- hidden failure states or misleading error flow
- backend/AI contract fragility
- wasteful retrieval, extraction, or model-routing flow
- logic that works today but is likely to break when adjacent features are added

Use `references/audit-heuristics.md` for the severity rubric and subsystem-specific heuristics. Use `references/performance-checklist.md` for the review checklist.

### 5. Record findings before editing

Normalize each finding with:

- `priority`
- `severity`
- `subsystem`
- `files`
- `title`
- `category`
- `rationale`
- `evidence`
- `expectedImpact`
- `verificationTarget`
- `status`
  - `candidate`
  - `fixed`
  - `deferred`

Keep confirmed bugs separate from suspected fragility. If a benefit is reasoned rather than measured, say so explicitly.

### 6. Build the remediation plan before edits

Split work into exactly three buckets:

- `safe immediate fixes`
  - method-level cleanup
  - query optimization
  - duplicate logic removal
  - guard clauses
  - localized flow fixes
  - clearer local orchestration boundaries
- `conditional local refactors`
  - allowed only when scope is bounded, contracts stay stable, and verification is strong
- `deferred items requiring human decision`
  - architectural rewrites
  - schema-affecting changes
  - caching or persistence policy changes
  - contract changes with frontend or mobile impact

Do not edit before this plan exists.

### 7. Apply only bounded high-confidence fixes

- Prefer the smallest change that removes the problem.
- Preserve:
  - thin controllers
  - service-owned business logic
  - `DatabaseService` and `this.db`
  - `success/message/data` envelopes
  - auth, role enforcement, DTO validation, and audit logging
  - backend/AI proxy compatibility
  - AI read-only behavior for grades, enrollment, and official academic records
- Do not add speculative caches, stale derived data, or broad rewrites with weak evidence.
- Do not revert unrelated user changes.

### 8. Verify after edits

- Re-run the narrowest meaningful verification first.
- Broaden only when the touched surface or risk justifies it.
- Re-run the closest baseline measurements for changed hotspots.
- Use `references/verification-checklist.md` for command selection and second-pass rules.

### 9. Perform a second-pass audit

- Re-scan touched files plus nearby dependents.
- Check whether the new structure is easier to extend without hidden coupling.
- Confirm the fix did not merely move fragility elsewhere.

### 10. Report inline and to durable artifacts

- Always produce a short inline summary for the user.
- Also render durable artifacts under `docs/system-audit/` with `scripts/render_audit_report.py`.
- Required sections:
  - short audit summary
  - prioritized findings list
  - remediation plan
  - actual edits when safe
  - before-vs-after comparison
  - second-pass clean check

## Quick Reference

| Phase | Required output | Notes |
|---|---|---|
| Baseline | command results, failures, approximate timings if any | Capture before edits |
| Audit | prioritized findings | Module-by-module, not hotspot-only |
| Plan | safe fixes, conditional refactors, deferred items | Build before editing |
| Remediation | bounded code changes only | Preserve contracts and architecture rules |
| Verification | targeted checks and re-measurements | Do not claim improvement without evidence |
| Second pass | clean-check summary | Re-scan touched areas and nearby dependents |
| Report | inline summary plus `docs/system-audit/*` artifacts | Use the render script |

## Commands

### Inventory

```bash
python .agents/skills/backend-ai-performance-remediator/scripts/discover_targets.py
```

### Backend baseline

```bash
cd backend
npm run build
npx eslint "{src,apps,libs,test}/**/*.ts"
```

### AI baseline

```bash
cd ai-service
python scripts/run_tests.py
python -c "from app.main import app; print(app.title)"
```

### Render report artifacts

```bash
python .agents/skills/backend-ai-performance-remediator/scripts/render_audit_report.py path/to/audit-data.json
```

## Artifact Contract

`scripts/render_audit_report.py` expects a JSON payload that can include:

```json
{
  "runMeta": {
    "date": "2026-04-16",
    "repo": "capstone-nest-react-lms"
  },
  "baselineFindings": [
    "backend build passed",
    "ai-service tests passed"
  ],
  "findings": [
    {
      "priority": "P1",
      "severity": "high",
      "subsystem": "backend",
      "files": ["backend/src/modules/performance/performance.service.ts"],
      "title": "Repeated analytics query fan-out",
      "category": "redundant-queries",
      "rationale": "The service repeats per-section queries inside a loop.",
      "evidence": "Observed repeated query construction during inspection.",
      "expectedImpact": "Lower DB load and simpler extension path.",
      "verificationTarget": "backend performance specs plus build",
      "status": "candidate"
    }
  ],
  "plan": {
    "safeImmediateFixes": ["Collapse repeated query path into one helper."],
    "conditionalRefactors": [],
    "deferredItems": []
  },
  "changesMade": [],
  "verification": ["npm run build"],
  "comparison": {
    "improved": ["Removed one repeated query path."],
    "unchanged": ["No benchmark-grade latency suite exists."],
    "remainingRisks": ["Large extraction flow still needs decomposition."]
  },
  "secondPassCleanCheck": [
    "Touched services still preserve response envelopes."
  ]
}
```

## Load References Only When Needed

- `references/audit-heuristics.md`
  - Use for severity scoring, fragility heuristics, and backend/AI anti-pattern checks.
- `references/performance-checklist.md`
  - Use while capturing the baseline and during the audit pass.
- `references/verification-checklist.md`
  - Use when selecting backend and AI verification commands, and for the second-pass audit.

## Common Mistakes

- Treating `backend` and `ai-service` as separate tasks instead of one audited boundary.
- Running `backend` lint with `npm run lint` during the pre-edit baseline.
  - That script uses `--fix` and mutates files.
- Optimizing for speed first and breaking correctness, auth, DTO validation, or response contracts.
- Claiming performance wins without any evidence.
- Refactoring large files broadly because they are ugly.
  - Broader refactors need bounded scope and verification evidence.
- Adding caches or stored derived data to hide expensive logic.
  - Prefer correctness and explicit recomputation over stale derived state.

## Final Rule

Audit first. Plan before editing. Verify after edits. Re-audit before claiming the system is cleaner.
