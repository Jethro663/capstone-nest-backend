# Feature Isolation Analyzer Skill Design

**Status:** Design approved; skill creation is not yet authorized

**Target skill:** `feature-isolation-analyzer`

**Intended location:** `~/.codex/skills/feature-isolation-analyzer/`

## Summary

Create a repository-agnostic, analysis-only Codex skill that reverse-engineers an existing software feature as a bounded system. It explains how the feature works, traces its inbound and outbound dependencies, models the cascade effects of disconnecting it, identifies safe isolation and disassembly steps, and surfaces focused improvement opportunities.

The skill uses adaptive depth: it begins with focused discovery and expands only where evidence reveals coupling, state, shared ownership, asynchronous behavior, security sensitivity, external consumers, or removal risk. An explicit `full forensic` request broadens the search across every applicable subsystem without claiming mathematically complete coverage.

The only permitted mutation is one canonical Markdown analysis report.

## Relationship to Existing Skills

This skill remains separate from `feature-impact-planner`:

- `feature-isolation-analyzer` investigates an existing feature and its current dependency graph, removal feasibility, cascade risks, and improvement seams.
- `feature-impact-planner` evaluates a proposed new or materially changed feature and produces a decision-ready implementation plan.

The separation keeps automatic activation precise and prevents either skill from accumulating unrelated modes. A completed isolation report may later become evidence for feature planning, but this skill does not invoke implementation or silently transition into it.

## Goals

- Establish a precise, evidence-backed boundary for a named feature.
- Explain current behavior from entry point through durable and external side effects.
- Trace direct, transitive, operational, and uncertain dependencies in both directions.
- Determine whether the feature is removable now, removable after decoupling, embedded and high-risk, or not yet sufficiently understood.
- Produce a safe logical disassembly sequence with validation and rollback checkpoints.
- Identify improvements that reduce coupling, clarify ownership, or make later isolation safer.
- Preserve useful depth while minimizing unnecessary repository reads and repeated explanation.

## Non-Goals and Authorization Boundary

- Do not modify application code, tests, configuration, schemas, dependencies, or data.
- Do not remove, disable, migrate, deploy, commit, or operate external systems.
- Do not convert the analysis into an implementation plan unless the user separately requests that workflow.
- Do not promise exhaustive coverage or assert that no undiscovered dependencies exist.
- Do not perform generic whole-repository architecture documentation when no feature boundary is supplied.

The report is the only authorized write. Committing the report also requires explicit user authorization unless repository instructions state otherwise.

## Activation and Interface

The skill should allow normal implicit invocation. It applies when the user asks to analyze, break down, isolate, disconnect, deconstruct, remove safely, assess the blast radius of, or improve an existing feature.

It should not activate for:

- Planning a new feature from scratch.
- Implementing a previously approved change.
- Diagnosing a specific defect when feature isolation is not the goal.
- General repository review without a feature target.

Proposed description:

> Analyze an existing software feature as a bounded system, tracing how it works, its dependencies and consumers, removal blast radius, safe isolation sequence, and improvement opportunities in a canonical Markdown report. Use for feature breakdowns, dependency or cascade audits, removal feasibility, and feature isolation planning; not for implementation or new-feature planning.

Plain requests such as `analyze and break down X` use adaptive composite analysis. More specific language emphasizes one or more inferred lenses:

- `understand`: behavior, ownership, and data flow.
- `isolate`: boundaries, seams, shared dependencies, and decoupling prerequisites.
- `remove`: cascade simulation, safe disassembly order, cleanup, verification, and rollback.
- `improve`: coupling, ownership, reliability, testability, observability, and maintainability opportunities.
- `full forensic`: maximum applicable breadth with explicit remaining uncertainty.

Modes guide emphasis rather than creating independent workflows or separate reports.

## Analysis Engine

### 1. Resolve the Target

Read repository instructions first. Translate the user's feature name into a small vocabulary set containing likely routes, labels, symbols, contracts, data entities, flags, and jobs. Identify the user-visible behavior, likely entry points, and primary owner.

Ask one focused question only when multiple plausible interpretations would materially change the dependency graph. Otherwise proceed with an explicit scope assumption.

### 2. Build the Dependency Spine

Trace the feature in both directions:

- **Inbound:** callers, routes, screens, commands, schedules, callbacks, registrations, flags, and configuration that activate or expose it.
- **Outbound:** internal services, public contracts, persistent state, caches, queues, events, files, permissions, audit records, observability, and external services it uses or changes.
- **Consumers:** other features, clients, workers, reports, integrations, tests, and operational processes that depend on its behavior or data.

Inspect only dependency categories that exist in the repository. Search for producers and consumers of public contracts rather than assuming that the defining module is the complete boundary.

### 3. Expand by Risk

All direct relationships are inventoried. A transitive relationship receives deeper inspection when one or more of these conditions apply:

- Shared by multiple features or clients.
- Owns or mutates durable state.
- Runs asynchronously, on a schedule, or outside the initiating request.
- Enforces authentication, authorization, privacy, audit, or another policy.
- Crosses a service, package, process, deployment, or external-system boundary.
- Is generated, dynamically registered, reflection-driven, or otherwise difficult to find statically.
- Would change behavior, compatibility, recovery, or cleanup during removal.

Low-risk leaf nodes are recorded with evidence but are not expanded without a reason. Use qualitative risk signals instead of a pseudo-precise numeric score.

### 4. Simulate Disconnection

Model removal at each meaningful seam: entry point, caller, public contract, producer, consumer, worker, state owner, configuration, and deployment resource. For every proposed cut, record:

- Immediate failure or behavior change.
- Transitive and delayed effects.
- Persisted or orphaned state.
- Compatibility and migration needs.
- Observability or support blind spots.
- Validation that would prove the cut safe.
- Rollback path if the assumption is wrong.

The resulting disassembly order should normally retire exposure and new writes before readers, background processing, durable state, shared contracts, schemas, and residual configuration. The exact order must be evidence-derived rather than imposed when the architecture requires something different.

### 5. Stop on Bounded Saturation

Stop adaptive exploration when:

- Every discovered high-risk relationship has an owner, evidence pointer, effect, confidence level, and disposition.
- Known entry points and public contracts have inbound and consumer searches.
- Stateful, asynchronous, security-sensitive, and external effects have been resolved or marked unverified.
- One final focused search using the accumulated feature vocabulary finds no new relevant relationship.

Describe this as bounded coverage. Use wording such as `no additional dependency was found within the inspected scope`, never `there are no other dependencies`.

## Evidence and Dependency Model

Consequential conclusions use these confidence labels:

| Label | Meaning |
|---|---|
| Confirmed | Directly supported by current source, configuration, schema, test, command, or runtime evidence. |
| Inferred | A reasoned conclusion tied to named evidence but not directly observed. |
| Unverified | Material uncertainty that available evidence cannot currently resolve. |

Dependency effects use a compact classification:

| Effect | Meaning |
|---|---|
| Direct | The removed feature or interface is immediately referenced or invoked. |
| Transitive | The effect propagates through another owner or contract. |
| Operational | Build, deployment, support, monitoring, scheduling, or maintenance behavior changes. |
| Dormant | The dependency is inactive in the observed path but can be activated by configuration, data, role, or timing. |
| Uncertain | Evidence indicates a possible relationship but does not prove its behavior. |

Prefer precise `file:symbol`, route, schema, test, or focused line references. Do not paste large source excerpts into the report.

## Canonical Markdown Artifact

Use the user's requested path first. Otherwise follow an established repository analysis-document convention. If neither exists, use:

`docs/feature-analysis/YYYY-MM-DD-<feature-slug>.md`

Before creating a file, search for an existing canonical analysis of the same feature and update it instead of creating a competing document. Preserve still-valid evidence and clearly identify refreshed or superseded conclusions.

The report is layered in this order:

### 1. Executive Verdict

- Feature purpose and current owner.
- Inspected scope and important exclusions.
- Coupling level: low, moderate, high, or critical.
- Removal verdict: removable now, removable after decoupling, embedded/high-risk, or insufficient evidence.
- Highest-impact cascade risks.
- Recommended next action.

### 2. Feature Anatomy

- Entry points and activation paths.
- Core components and responsibilities.
- End-to-end request, event, and data flow.
- State, contracts, side effects, and lifecycle.
- Known variants by role, client, environment, or configuration.

### 3. Dependency and Cascade Map

Use compact tables showing provider, interface, consumer, reason for the relationship, effect if disconnected, risk, confidence, and evidence. Explain each component once and reuse short identifiers in later tables where clarity is preserved.

### 4. Isolation and Disassembly Plan

- Natural seams and switch-off points.
- Decoupling prerequisites.
- Ordered disassembly phases.
- Compatibility and migration requirements.
- Data retention, orphan, and cleanup decisions.
- Validation and rollback checkpoint for each phase.
- Residual tests, documentation, configuration, and operational cleanup.

### 5. Improvement Opportunities

Prioritize only evidence-backed improvements that make the feature safer, clearer, less coupled, more observable, or easier to test. Separate required decoupling from optional product or architecture enhancements.

### 6. Evidence and Uncertainty

Include the evidence ledger, unresolved questions, unavailable runtime checks, and the exact claims that remain inferred or unverified.

## Token and Performance Strategy

- Begin with feature vocabulary, manifests, routes, public interfaces, and likely owner symbols.
- Prefer symbol-aware reference discovery and focused file ranges. Use repository search as a fallback or for dynamic/string-based relationships.
- Keep one exploration ledger containing each node, its evidence, incoming and outgoing relationships, confidence, risk, and inspection status.
- Do not repeatedly explain the same component; assign a concise stable label when reused.
- Skip generated output, dependencies, build artifacts, snapshots, lockfiles, and unrelated tests unless evidence shows that they participate in the feature.
- Read broad files only when focused discovery cannot establish ownership or behavior.
- Keep source excerpts out of the report unless a small excerpt is necessary to explain a non-obvious invariant.
- Prefer a compact accurate report over a long narrative, but do not omit evidence or high-impact uncertainty merely to save tokens.

Version one should use a single self-contained `SKILL.md` plus generated UI metadata. It should not add scripts, assets, or supporting references until observed repetition or complexity proves that they improve reliability. A generic dependency-extraction script is intentionally excluded because multi-language dynamic relationships can produce confident but incomplete graphs.

## Error and Uncertainty Handling

- If runtime services or credentials are unavailable, continue with static evidence and mark runtime-dependent claims unverified.
- If specialized code-navigation tools are unavailable, use focused text search and explicitly narrow the coverage claim.
- If the repository is not writable, provide the analysis in the response and state that the required artifact could not be created.
- If an existing report contains conflicting evidence, retain the conflict until current evidence resolves it; do not silently overwrite the conclusion.
- If the feature boundary grows into multiple independent systems, document the shared boundary and split the analysis into clearly named subgraphs within the same canonical report unless the user asks for separate artifacts.
- If a destructive command would be needed to verify a hypothesis, do not run it; describe the safe verification requirement instead.

## Self-Review and Validation

Before handoff, verify that:

- Every discovered entry point has an owner or an explicit uncertainty.
- Both inbound and outbound dependencies were traced.
- Public interfaces have a consumer search.
- Durable state, async behavior, security policy, external effects, and operations were considered when present.
- Each disassembly phase includes expected impact, validation, and rollback guidance.
- The verdict agrees with the dependency map and unresolved uncertainty.
- The report contains no placeholders, contradictory conclusions, unsupported certainty, or accidental implementation authorization.

When the skill is created:

1. Run the standard `quick_validate.py` structural validator.
2. Test a small, low-coupling feature to verify that adaptive analysis stops without needless expansion.
3. Test a cross-system feature with persistent data, async work, and multiple consumers to verify risk-driven expansion.
4. Test an ambiguous feature label and a dynamically registered dependency to verify uncertainty handling.
5. Review the actual generated reports for evidence quality and useful removal sequencing rather than testing exact headings or prose.

Independent subagent evaluation is optional and requires explicit user authorization under the repository's delegation policy.

## Planned Skill Structure

```text
feature-isolation-analyzer/
|-- SKILL.md
`-- agents/
    `-- openai.yaml
```

Proposed UI metadata:

- Display name: `Feature Isolation Analyzer`
- Short description: `Trace, isolate, and safely deconstruct existing features`
- Default prompt: `Analyze and break down this existing feature, map its dependencies and cascade risks, and write the findings to a Markdown report.`

Automatic invocation remains enabled.

## Acceptance Criteria

- A plain `analyze and break down X` request produces one canonical evidence-backed Markdown report.
- The workflow adapts its depth to discovered risk and supports an explicit `full forensic` override.
- The report traces inbound and outbound connections, cross-boundary consumers, state, asynchronous effects, and operational coupling when present.
- The report provides a defensible removal verdict, ordered disassembly plan, validation checkpoints, rollback guidance, and focused improvements.
- All material claims are confirmed, inferred, or unverified with precise evidence pointers.
- No product, repository, data, git, deployment, or external-system mutation occurs beyond the report itself.
- The skill remains distinct from new-feature impact planning and implementation workflows.
