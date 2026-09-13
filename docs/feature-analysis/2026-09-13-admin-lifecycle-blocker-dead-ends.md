# Admin Lifecycle Blocker Dead-End Isolation Analysis

**Date:** 2026-09-13

**Repository baseline:** `developement` at `f46235a34466ec8460a7017e21a78ae85da7001d`

**Scope assumption:** the five reported user, section, and class cases are variants of one feature: evidence-aware purge and historical archival through the Admin Maintenance Gateway.

**Method:** targeted static source, contract, and test analysis plus the user's observed UI messages. No application code, configuration, schema, database data, external system, or Git history was changed.

## Evidence vocabulary

- **Confirmed** — directly supported by current source, tests, specifications, or the exact UI text reported by the user.
- **Inferred** — a consequence strongly implied by confirmed relationships but not executed against a live runtime or database.
- **Unverified** — requires deployed configuration, live database contents, runtime reproduction, or school-record review outside this analysis.
- Effects are classified as **direct**, **transitive**, **operational**, **dormant**, or **uncertain**.

## 1. Executive verdict

The permanent-deletion refusals are **correct safety behavior**, but the resulting workflow is not acceptable product behavior. A student, class, or section that has retained academic or lifecycle evidence must not be physically deleted through ordinary maintenance. The current purge planner and execution service enforce that boundary twice: preview returns a blocker, and execute recomputes the manifest and refuses any blocked plan. **Confirmed.**

The historical class and section archive refusals expose a separate, real feature gap. A record can be `isActive=true` while belonging to a non-current school year, so it appears in the Active directory and exposes an Archive action. The planner then classifies the year mismatch as non-resolvable and displays “must be handled through academic repair,” but it does not issue an `ACADEMIC_REPAIR` next action. The current Audit & Recovery screen also has no general historical-section retirement and only a narrowly constrained current-year duplicate-class retirement. **Confirmed.**

**Root cause:** the decision model collapses every blocker marked `resolvable: false` into `IMMUTABLE`, even when the condition is an inapplicable request or a missing supported workflow rather than immutable evidence. The class and section helper functions mark all ordinary blockers non-resolvable, while typed next actions are derived only from `resolutionOptions`. This makes the exact messages reported by the user deterministic and leaves `decision.nextActions` empty. **Confirmed.**

**Coupling:** high. The behavior crosses web entry points, a shared web dialog, maintenance API routes, four backend planners/services, PostgreSQL evidence, audit/lifecycle state, OpenSpec requirements, and a mobile consumer of the same decision envelope.

**Removability:** the confusing presentation and incomplete historical workflow are replaceable. The retained-evidence purge floor is not safely removable.

### Recommendation

Keep evidence-aware purge immutable, but stop presenting it as a deletion flow that might succeed. Add an eligibility result that says the archived record must remain, shows why, and offers only useful non-destructive actions such as “Keep archived” and “View retained evidence.” Separately add a governed **historical retirement** path:

1. If a historical class or section has no lingering `enrolled` memberships, archive only the structural record and linked structure while preserving all academic rows.
2. If historical `enrolled` memberships remain, open a target-specific repair task that requires the administrator to record the real outcome before archival; do not infer completion, withdrawal, or transfer.
3. Return a typed next action carrying the target context, and update both web and mobile to execute or navigate it.

This resolves the dead end without weakening finalized-grade, attempt, score, audit, enrollment-history, or lifecycle-event retention.

## 2. Feature anatomy

### 2.1 Current flow

```text
Admin action in users / sections / classes
                  |
                  v
        AdminLifecycleDialog
                  |
                  v
 POST /admin/maintenance/{purge|classes|sections}/preview
                  |
        +---------+----------+
        |                    |
        v                    v
  purge inventory     class/section planner
        |                    |
        +---------+----------+
                  v
       manifest + blockers + warnings
                  |
                  v
 derive decision from resolvable + resolutionOptions
                  |
                  v
 IMMUTABLE with no next action -> disabled execute -> close dialog manually
```

Preview is read-only and repeatable-read. The web disables execution whenever `safeToExecute` is false, and the backend recomputes the preview inside the academic transaction before rejecting any remaining blocker. The reported attempts therefore do not delete or archive data. **Confirmed.**

### 2.2 Reported variants

| Case | Why the current result occurs | Safety verdict | Product verdict |
|---|---|---|---|
| Permanently delete student | Purge inventory found non-zero `enrollmentHistory`, `lifecycleEvents`, `scores`, and `attempts`; every retained category blocks purge. | **Keep blocked.** Those rows are academic/lifecycle evidence. | The page already knows deletion is only for an empty archived account, yet still leads into an impossible deletion review with no alternative. |
| Permanently delete section | Section inventory includes its enrollments/events, linked classes, and each linked class's records, scores, attempts, assessments, and lessons. The observed categories are therefore sufficient to block. | **Keep blocked.** Deleting the section would cut ownership/lineage for multiple evidence types. | Show that this is a retained historical record, not an action awaiting acknowledgement. |
| Archive historical section | `section.schoolYear !== academicState.schoolYear` produces `SECTION_NOT_IN_ACTIVE_YEAR` through a helper that always sets `resolvable: false`. | **Do not use current-year closure semantics blindly.** | A safe historical retirement/repair workflow is missing; the message supplies neither a link nor an executable resolution. |
| Permanently delete class | Class evidence inventory found enrollment and lifecycle rows; either one permanently disqualifies ordinary purge. | **Keep blocked.** Archival is the correct durable state. | The purge icon should behave as an eligibility check and resolve to “must remain archived,” not a stalled destructive form. |
| Archive historical class | `class.schoolYear !== academicState.schoolYear` produces `CLASS_NOT_IN_ACTIVE_YEAR` through the same non-resolvable helper. | **Do not mark historical memberships completed by assumption.** | The advertised academic-repair destination is absent from the manifest and lacks a general historical-retirement operation. |

The exact category counts for the supplied student ID and target class/section IDs were not queried in this analysis. The user-reported categories are consistent with the current inventory code. **Observed by user; exact database counts unverified.**

### 2.3 State and side effects

- `isActive` and `schoolYear` are independent fields. Admin directory tabs use `isActive`, not current-school-year membership, so an active historical record is a valid current state and can expose Archive. **Confirmed.**
- Any non-zero retained category blocks ordinary purge. The category set includes enrollment history, lifecycle events, class records, finalized participants, scores, attempts, assessments, lessons, and linked classes. **Confirmed.**
- The purge planner always returns a permanent-action warning, two required confirmations, and a prospective purge effect even when the action is blocked. The web consequently renders “Warnings to acknowledge” and “Will change,” but hides the actual acknowledgement inputs because execution is blocked. **Confirmed.**
- Class and section planners can calculate archive effects before adding the historical-year blocker. Those are hypothetical effects, not committed changes, but the shared dialog labels them “Will change.” **Confirmed.**
- Blocked preview creates no lifecycle operation, audit record, notification, queue work, or external effect. Those occur only after a valid execute request enters the transaction. **Confirmed.**
- Current direct archive primitives complete active enrollment rows. Reusing those primitives for historical records without an explicit outcome would retroactively assert that every lingering membership completed. **Confirmed implementation behavior; incorrectness for a specific record is unverified until school evidence is reviewed.**

## 3. Cascade map

This table is the relationship source of truth for the focused issue.

| ID | Provider | Interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E01 | User detail page | “Review permanent deletion” for deleted accounts | `AdminLifecycleDialog` | direct | Medium: invites a destructive path even when a used student can never qualify | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx:418-428,726-762` | Keep entry only as clearly named eligibility review, or preflight it before display |
| E02 | Sections directory | Active Archive and archived Purge actions | Shared dialog | direct | High: active historical rows lead to a backend dead end; retained rows repeatedly expose purge | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx:473-494,506-665` | Split current-year closure, historical retirement, and purge eligibility |
| E03 | Classes directory | Active Archive and archived Purge actions | Shared dialog | direct | High: same state/action mismatch as sections | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx:563-599,613-733` | Split current-year closure, historical retirement, and purge eligibility |
| E04 | Web lifecycle dialog | Blockers, warnings, decision, effects, confirmations | All three web surfaces | operational | High: impossible actions are described as warnings to acknowledge and effects that “will” happen | Confirmed | `AdminLifecycleDialog.tsx:191-218,301-438` | Render blocked, actionable, and executable states with different information hierarchy |
| E05 | Maintenance API wrapper/controller | Purge/class/section preview routes | Web and mobile | direct | Medium: additive decision changes have two client consumers | Confirmed | `admin-lifecycle-service.ts`; `admin-maintenance-lifecycle.controller.ts` | Preserve envelope; evolve typed decisions additively or version explicitly |
| E06 | Purge evidence classifier | Any non-zero retained category | Purge planner | direct | Critical if removed: official evidence can be deleted or orphaned | Confirmed | `admin-lifecycle.evidence.ts:27-54`; `purge-lifecycle.service.ts:64-108` | **Keep hard floor** |
| E07 | User purge inventory | Enrollments, events, participants, scores, grades, attempts, taught classes/records | `PURGE_USER` preview | transitive | Critical: account identity anchors learner and teacher evidence | Confirmed | `purge-lifecycle.service.ts:190-275` | Keep inventory; present category counts and retained-record outcome |
| E08 | Class/section purge inventory | Class evidence plus section-linked nested evidence | `PURGE_CLASS` / `PURGE_SECTION` preview | transitive | Critical: deletion severs multi-entity academic lineage | Confirmed | `purge-lifecycle.service.ts:111-165,277-324` | Keep; consider one query/read-model optimization separately |
| E09 | Purge planner presentation fields | Warning, confirmations, prospective effect on every preview | Web/mobile reviewers | operational | Medium: contradictory copy implies acknowledgement can unlock an immutable action | Confirmed | `purge-lifecycle.service.ts:85-107` | Emit executable ceremony only for eligible purge; blocked preview should expose retention guidance |
| E10 | Decision derivation | `!resolvable` -> `IMMUTABLE`; next actions only from `resolutionOptions` | Web/mobile decision renderers | direct | High: taxonomy conflates protected evidence, invalid input, stale state, and missing workflow | Confirmed | `admin-lifecycle.manifest.ts:69-135` | Replace Boolean-only derivation with explicit blocker class/disposition |
| E11 | Class planner | `CLASS_NOT_IN_ACTIVE_YEAR` with no resolution options | Historical class archive | direct | High: current UI promise ends in an actionless `IMMUTABLE` result | Confirmed | `class-lifecycle.service.ts:88-139` | Add history-safe retirement/repair decision, not a force bypass |
| E12 | Section planner | `SECTION_NOT_IN_ACTIVE_YEAR` with no resolution options | Historical section archive | direct | High: multi-class historical structure remains incorrectly active | Confirmed | `section-lifecycle.service.ts:68-130` | Add aggregate historical retirement/repair decision |
| E13 | Next-action metadata | `ACADEMIC_REPAIR` -> Audit & Recovery | Decision renderer | dormant | Medium: the route exists but is never emitted for E11/E12 | Confirmed | `admin-lifecycle.manifest.ts:18-66` | Bind next actions to relevant blocker codes and target context |
| E14 | Academic Recovery | Targeted grade/state repairs and duplicate current-year class retirement | Admin repair screen | transitive | High: a generic link would still not resolve historical class/section archival | Confirmed | `AcademicRecoveryPanel.tsx:20-33`; `AcademicRepairService.retireDuplicateClass` | Add a specific historical-structure task before advertising this route |
| E15 | Execute service | Re-preview, manifest hash, blocker rejection, transaction, audit | All governed execution | direct | Critical if weakened: stale or blocked plans could mutate | Confirmed | `admin-lifecycle.service.ts:327-362,446-599` | **Keep unchanged in principle** |
| E16 | Mobile lifecycle review | Same preview envelope and next-action rendering | Mobile admin | operational | Medium: backend-only changes can produce parity drift or inert actions | Confirmed | `AdminLifecycleReviewScreen.tsx:337-379,513-535,1001-1064` | Update and test with web in the same contract slice |
| E17 | Actionable lifecycle spec | Immutable alternatives and executable next actions | Implementation and tests | operational | High: current behavior falls short of the accepted requirement | Confirmed | `openspec/changes/admin-maintenance-gateway/specs/actionable-admin-lifecycle/spec.md:22-39,109-118` | Add missing characterization and acceptance cases |

## 4. Isolation and disassembly

### 4.1 Cut simulations

| Proposed cut | Immediate result | Delayed/persisted effect | Verdict |
|---|---|---|---|
| Remove `RETAINED_EVIDENCE` or add `force=true` | Reported purge actions appear executable | Academic lineage can be deleted, foreign-key behavior becomes data-dependent, and audit claims become unreliable | **Reject** |
| Call legacy direct delete/purge routes | Bypasses the clear maintenance preview | Duplicated semantics, weaker manifest/idempotency evidence, and possible constraint failures | **Reject** |
| Reuse current direct archive for historical rows | Class/section disappears from Active | Every lingering `enrolled` membership is asserted `completed`, whether or not school records support that outcome | **Reject as generic repair** |
| Add only `resolutionOptions: ['ACADEMIC_REPAIR']` | A button appears | The destination has no general historical-section retirement and no unconstrained historical-class retirement | **Incomplete** |
| Hide purge buttons for every used record | Prevents the misleading dialog | Requires an evidence capability in list data and does not solve external clients or historical active rows | **Useful presentation optimization, not the full fix** |
| Keep the purge floor; add eligibility presentation plus historical retirement/repair | Makes impossible deletion honest and gives historical records a safe completion path | Preserves evidence and adds auditable structural closure | **Recommended** |

### 4.2 Required seams and prerequisites

1. **Decision semantics seam:** classify blockers as `PROTECTED_EVIDENCE`, `NEEDS_INPUT`, `NEEDS_REPAIR`, `INAPPLICABLE`, `STALE`, or `SECURITY`, rather than deriving `IMMUTABLE` from one Boolean. Preserve stable existing codes during migration.
2. **Historical retirement seam:** create a separate plan from current-year class/section closure. It must inventory lingering memberships, linked classes, records, attempts, scores, assessments, lessons, and lifecycle events, and must never rewrite grade/attempt content.
3. **Targeted repair seam:** when active historical memberships exist, carry target type, target ID, school year, and evidence summary into a real repair task. The repair must record the administrator's verified real-world outcome and append audit/lifecycle evidence.
4. **Eligibility read model:** expose enough read-only summary to distinguish “empty test record may be purged” from “retained record must stay archived” before asking for password or confirmations.
5. **Shared consumer contract:** web and mobile must support every issued action kind, including cancel/keep-archived behavior and target-aware navigation.

### 4.3 Ordered implementation plan

| Phase | Change boundary | Validation | Rollback |
|---|---|---|---|
| 0 — Characterize | Add fixtures for the five reported cases and exact current messages/decisions. No behavior change. | Planner, manifest, web, and mobile tests reproduce the empty-next-action and blocked-warning behavior. | Remove tests only; no data effect. |
| 1 — Correct blocked presentation | For `IMMUTABLE`, show “Deletion unavailable” or “Historical repair required”; hide acknowledgement controls; relabel effects as hypothetical; issue “Keep archived,” “View evidence,” or a real repair action. | No blocked preview displays “Warnings to acknowledge” or promises “Will change”; execute remains disabled client-side and rejected server-side. | Revert clients/decision mapping; hard blockers remain. |
| 2 — Add historical retirement | Permit state-only structural archival when the target is historical and has no lingering active membership requiring interpretation. Archive linked classes with a section in the same transaction. | Before/after checksums prove scores, attempts, assessments, lessons, class records, final grades, and lifecycle history are unchanged; one operation/audit receipt is created. | Use an evidence-preserving inverse status change; never delete operation/audit history. |
| 3 — Add historical membership repair | For lingering `enrolled` rows, require source-period-aware, target-specific completion/withdrawal/correction decisions backed by school records, then retire structure. | No inferred outcome; all affected memberships have one explicit decision; transaction rollback and stale-manifest tests pass. | Revert through a new audited corrective operation, not history deletion. |
| 4 — Preflight directories | Show purge eligibility/retention state in user, class, and section actions; keep the definitive preview on click. | Evidence-free archived fixtures can reach password/exact confirmation; retained fixtures offer no delete CTA. | Remove preflight UI while retaining authoritative preview. |
| 5 — Contract parity | Ship web and mobile handling together and keep older route adapters. | Shared contract fixtures, web interaction tests, mobile tests, backend unit/e2e, and current/non-current school-year cases pass. | Disable new retirement execution; old clients continue to receive safe blockers. |

### 4.4 Compatibility, cleanup, and operational effects

- Prefer additive next-action data while existing clients are supported. If a new action kind is necessary, increment the manifest schema and make unsupported clients fail closed. **Inferred recommendation.**
- Do not delete or rewrite existing `admin_lifecycle_operations`, `enrollment_lifecycle_events`, audit records, archived rows, or retained academic evidence as cleanup. **Required.**
- Historical retirement should reuse manifest hashing, expiry, idempotency, the academic transaction, audit linkage, and post-commit notification behavior. **Inferred recommendation from E15.**
- No queue, cache, AI, or external-storage cleanup belongs in ordinary historical retirement. Those systems have no direct edge in the inspected preview/archive paths. **Confirmed within inspected scope.**
- A rollout flag may disable the new historical execution path, but it must not disable the retained-evidence purge guard. **Required.**

## 5. Improvements

### Required decoupling

Separate **retention policy**, **action applicability**, **repair routing**, and **presentation ceremony**. Today one `resolvable` Boolean drives all four. The purge policy should decide only whether physical deletion is allowed; historical retirement should decide how structure leaves the Active workspace; repair should own ambiguous historical membership outcomes; clients should render the server-issued disposition without implying that warnings can override evidence.

### Optional evidence-backed enhancements

1. Replace raw category keys such as `lifecycleEvents` with human labels and counts while preserving stable machine codes.
2. Hide the single-choice Outcome selector and “Change outcome” button when a dialog has only one possible intent.
3. Add a “Why this record must remain” evidence drawer linking classes, school years, and counts without exposing score contents in the directory.
4. Add list badges: `Empty test record`, `Retained history`, and `Historical repair needed`, all derived from backend facts.
5. Record decision-code telemetry without row contents so maintainers can quantify which dead ends remain after release.

## 6. Uncertainty and coverage boundary

- **Unverified:** exact database counts and record identities behind the supplied student ID and the reported class/section previews.
- **Unverified:** whether each historical active membership should be completed, withdrawn, corrected, or retained unchanged; that is a school-record decision and must not be inferred from `schoolYear` alone.
- **Unverified:** deployed frontend/backend/mobile SHA and feature flags; this report is confirmed against the local baseline named above, not against a production build.
- **Unverified:** external or older client consumers outside the repository and their support window.
- **Unverified:** institution/legal retention requirements beyond the repository's current immutable-evidence policy.
- **Scope boundary:** inspected current web entry points, shared web dialog, maintenance/lifecycle preview and execution owners, evidence inventory, academic recovery capabilities, relevant tests/specification, and the mobile public-contract consumer. Live database data, authenticated browser reproduction, deployment state, unrelated CRUD, AI/LXP, queues, and System Reset execution were excluded.

No additional dependency was found within the inspected scope.
