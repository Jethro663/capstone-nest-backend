## Context

The current backend freezes a JSON academic policy per school year. Its default changes to three terms beginning in 2026, while production state was advanced from 2025–2026 directly to 2027–2028. Fifteen active classes, six linked sections, and one result-bearing class now sit under 2027–2028; teachers working in older classes are blocked before assessment or AI-draft preparation. The school has confirmed that Quarter 1–4 remains authoritative from 2026–2027 onward.

The backend owns official academic state, policy snapshots, record safety, and audit history. Clients must consume that contract rather than relabeling or bypassing it. The correction must preserve identities and evidence, reject stale previews, and remain atomic.

## Goals / Non-Goals

**Goals:**

- Make Q1–Q4 the canonical period set for every supported school year.
- Correct the production state to 2026–2027 Q1 through a reviewed, password-confirmed backend workflow.
- Move selected misdated classes, wholly owned sections, and explicitly confirmed legacy evidence without changing record IDs.
- Add equivalent period filtering and actionable AI readiness explanations to web and mobile.

**Non-Goals:**

- Change grading methods, weights, promotion rules, exam components, or rounding.
- Change AI-service routes, BullMQ payloads, or generation prompts.
- Automatically reinterpret annual grades, outcomes, external grades, source selections, or period revisions.
- Provide unaudited SQL or client-side policy overrides.

## Decisions

1. **Version the corrected policy.** `deped-2026-q4-v2` applies to 2026–2027 and `deped-2027-q4-v2` applies from 2027–2028 onward. Both expose Q1–Q4 and retain their existing non-period rules. This distinguishes corrected snapshots from the deployed three-term policy.

2. **Use a stateless deterministic manifest.** Preview reads inside a repeatable-read, read-only transaction, normalizes and sorts the complete state/policy/class/section/evidence impact, and hashes canonical JSON with SHA-256. Execution recomputes the same manifest inside the academic transaction and rejects any mismatch.

3. **Keep repair selection explicit.** Preview lists all active source-year classes, but the administrator supplies selected class IDs. Source-year sections move only when every class linked to that section is selected; sections already in the target year remain unchanged.

4. **Block ambiguous official data.** Any source- or target-year annual grade, outcome, external grade, annual source selection, or period revision blocks execution. Result-bearing legacy evidence is allowed only when preview emits and execution satisfies a separate exact confirmation.

5. **Preserve identity and references.** The transaction updates school-year labels on state, selected classes, movable sections, policy snapshots, and selected legacy evidence. It does not recreate classes or change enrollments, assessments, attempts, class records, final-grade IDs, or AI jobs.

6. **Keep AI enforcement server-owned.** Both clients explain ordered readiness blockers, but backend assessment preparation remains the authority. Reindex controls appear only for indexing blockers.

## Risks / Trade-offs

- **Official evidence is relabeled** → Require a result-bearing warning, exact confirmation, before/after audit payload, password step-up, and verified database backup.
- **A preview becomes stale during review** → Recompute the manifest under the academic lock and return conflict without partial writes.
- **A section mixes selected and unselected source classes** → Block execution rather than create class/section year drift.
- **Existing three-term snapshots remain cached by clients** → Deploy backend and clients first, refresh queries after repair, and verify live responses before generation.
- **Production correction cannot run unattended** → Deployment may complete, but the repair requires an authorized administrator's current password through the UI/API.

## Migration Plan

1. Deploy policy, preview/execution APIs, and web/mobile consumers without mutating academic data.
2. Verify a restorable PostgreSQL backup and run the production preview.
3. Require the known manifest: fifteen classes, six sections, one result-bearing class with sixteen legacy-evidence rows, and zero ambiguous official rows.
4. Execute once with administrator step-up authentication.
5. Verify 2026–2027 Q1 state, Q1–Q4 snapshots, class/section/evidence alignment, audit receipt, assessment preparation, and a live AI Draft job.
6. Reverse any completed correction only through a newly reviewed manifest; never use manual SQL.

## Open Questions

None. Product and data decisions are locked by the approved plan.
