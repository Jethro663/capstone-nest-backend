## Context

Nexora currently uses `assessment_attempts.score` as an integer percentage. The assessment review screen understands that contract, but several history screens render the same value as raw points and the mobile profile mapper divides it by `totalPoints` a second time. The official class-record path is safer: `calculateStudentRecord` rejects scores above HPS and owns missing, zero, excused, category-weight, examination-component, transmutation, and finalization behavior. `ClassesService` and `PerformanceService` nevertheless contain separate raw-score formulas with different missing-score, weighting, and range semantics.

The system must support intentional teacher bonus points without allowing accidental over-entry or surplus contribution to later categories/overall grades. Existing clients and historic rows must remain readable during rollout, and repairs must preserve evidence rather than silently rewriting official history.

## Goals / Non-Goals

**Goals:**

- Make every persisted, returned, displayed, and aggregated percentage finite and bounded to 0–100.
- Distinguish base, bonus, awarded, possible, and effective points from a percentage.
- Cap at each assessment/class-record item before category weighting.
- Keep one policy-aware class-record calculation owner and remove alternate grade formulas.
- Protect auto-grading against duplicate responses, retry duplication, and invalid denominators.
- Keep web and mobile behavior identical for student, teacher, and admin consumers.
- Audit and repair legacy evidence, then deterministically rebuild derived performance projections.

**Non-Goals:**

- Changing academic periods, category weights, exam-component weights, transmutation bands, passing grades, annual-grade arithmetic, promotion policy, or immutable revision rules.
- Treating performance estimates, LXP, JA, or AI output as an official grade authority.
- Replacing the current assessment editor, class-record workbook, or role navigation.
- Removing the compatibility `score` property in this release.

## Decisions

1. **Use a shared pure point-normalization primitive.** Add `backend/src/modules/academic-state/academic-score.ts` with a finite-number/range assertion and a `calculateBoundedScore` result containing `basePoints`, `bonusPoints`, `awardedPoints`, `possiblePoints`, `effectivePoints`, `scorePercent`, and `wasCapped`. Alternative: sprinkle `Math.min(100, ...)` at consumers. Rejected because it hides invalid arithmetic and cannot preserve audit semantics.

2. **Separate ordinary score entry from bonus entry.** Base points remain within `0..HPS`; bonus points are non-negative, require a non-blank reason when positive, and are stored separately. `effectivePoints = min(basePoints + bonusPoints, possiblePoints)`. Alternative: accept `20` in a 10-point base field and infer overflow as bonus. Rejected because an accidental typo becomes indistinguishable from an intentional adjustment.

3. **Cap each item before aggregation.** A 5-point base plus 15-point bonus on a 10-point item is awarded as 20 but contributes 10. With a separate 0/10 item, the category numerator is `10 + 0`, so the category is 50%, not 100%. Category percentages are defensively bounded to 0–100, weighted contributions to `0..categoryWeight`, and the initial grade to 0–100.

4. **Persist grading evidence and an effective compatibility percentage.** Add nullable `base_points_earned` and `possible_points_snapshot`, non-negative `bonus_points` defaulting to zero, and `bonus_reason` to assessment attempts. Keep `score` as the effective bounded integer percentage and `direct_score` as the existing 0–100 direct grading mode. Add `bonus_points` and `bonus_reason` to class-record scores while retaining `score` as the base score. Audit logs record the actor, old/new point breakdown, and reason.

5. **Expose an explicit additive response contract.** Attempt/history/result responses add `scorePercent` and `scoreBreakdown`. Legacy `score` remains equal to `scorePercent`. `scoreBreakdown` is `{ basePoints, bonusPoints, awardedPoints, possiblePoints, effectivePoints, scorePercent, wasCapped, bonusReason }`. New web/mobile code must not divide `score` or `scorePercent` by `totalPoints`; raw point presentation comes from `scoreBreakdown`.

6. **Make auto-grading idempotent and unique per question.** Reject repeated `questionId` values in submit/progress payloads, add a unique `(attempt_id, question_id)` database constraint, and upsert/replace one response per question within the grading transaction. The denominator uses the persisted possible-points snapshot derived from the current assessment evidence and must be positive for graded non-file attempts.

7. **Reuse the class-record calculator for standing and performance.** `ClassesService.getLatestStandingSnapshot` calls `calculateStudentRecord` for the latest record and never substitutes missing with zero. `PerformanceService` reads a finalized official grade when present or a complete canonical preview; incomplete class records yield no class-record grade. `blendedScore` uses the canonical class-record grade when available and otherwise the latest-per-assessment average, avoiding double-counting synchronized assessments.

8. **Keep diagnostic aggregates separate from official grades.** Assessment averages and performance estimates remain useful signals but are explicitly named and bounded. Teacher/student “Overall Grade” uses only the canonical policy-aware class-record value. Reports, profiles, LXP, and JA consume `scorePercent` or the canonical grade without inventing a new formula.

9. **Use shared client presentation helpers.** Web and mobile each get one score formatter/presenter that renders effective points over possible points plus percentage and an optional capped-bonus note. Role pages consume backend values; no client computes an official percentage.

10. **Repair legacy rows conservatively.** A read-only audit runs before migration. Backfill base/possible evidence from response totals, rubric results, direct scores, and assessment totals in that order. Ambiguous overflow is preserved in audit metadata, effective percentages are bounded, invalid duplicate response groups keep one deterministic row only after evidence capture, and affected performance snapshots are recomputed. No period/final-grade revision is fabricated.

## Risks / Trade-offs

- **Old clients only understand `score`** → keep it as the bounded percentage and make all new fields additive.
- **Historic attempts may lack recoverable raw points** → derive the most conservative equivalent from the stored percentage and current/snapshotted denominator, record provenance, and never claim reconstructed evidence is original.
- **A class record can be incomplete** → return a provisional/unavailable state rather than treating missing work as zero.
- **Adding unique response constraints can fail on legacy duplicates** → preflight, evidence capture, deterministic repair, then constraint creation.
- **Performance behavior changes when duplicate sources were previously averaged** → characterize old/new results in tests and label the new authoritative versus diagnostic fields explicitly.
- **Bonus entry can be abused** → require a reason, preserve actor/time in audit, show the adjustment to teachers/admins/students, and never let it contribute above HPS.

## Migration Plan

1. Run the read-only grade-invariant audit against the target database and retain its counts/checksum.
2. Add columns and checks through `backend/drizzle/0017_grade_score_invariants.sql`; repair duplicate response groups before adding uniqueness.
3. Backfill attempt point snapshots and bound compatibility percentages with evidence-preserving audit rows.
4. Deploy backend additive contract first, then web and mobile consumers in the same release commit.
5. Recompute performance snapshots from canonical sources and rerun the audit until every out-of-range/duplicate/mismatch count is zero.
6. Verify seeded role flows, full local suites, migration on fresh and upgraded PostgreSQL, web build/E2E, mobile typecheck/tests/device flow, and APK contract/provenance checks.
7. Rollback before writes may remove the additive migration. After repair writes, rollback is forward-only: redeploy the previous application against the additive schema without deleting evidence columns or audit history.

## Open Questions

None. The implementation uses explicit bonus points with a required reason, item-level capping, an additive compatibility contract, and backend-only official grade calculation.
