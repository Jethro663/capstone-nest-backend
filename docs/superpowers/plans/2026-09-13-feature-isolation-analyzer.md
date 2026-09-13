# Feature Isolation Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and behaviorally validate a global, repository-agnostic, analysis-only skill for feature dependency, cascade, isolation, removal, and improvement analysis.

**Architecture:** Keep version one self-contained in one `SKILL.md` plus generated Codex UI metadata. Validate it as a technique skill with matched before/after scenarios: a low-coupling feature must stop cheaply, while a cross-system feature must expand through state, async, dynamic, and consumer boundaries.

**Tech Stack:** Markdown skill instructions, YAML UI metadata, Codex skill initializer and validator, temporary synthetic repository fixtures, fresh subagent evaluations.

## Global Constraints

- Install the skill at `/home/jethro/.codex/skills/feature-isolation-analyzer/`.
- Keep normal implicit invocation enabled.
- The skill is analysis-only; one canonical Markdown report is its only permitted mutation.
- Do not add scripts, assets, references, dependencies, product-code changes, or deployment operations in version one.
- Do not claim exhaustive dependency coverage; express the result as bounded by inspected evidence.
- Do not commit generated analysis reports unless the user explicitly asks.
- Repository policy requires user permission before spawning behavioral-test subagents.

---

### Task 1: Establish RED Behavioral Baselines

**Files:**
- Create temporarily: `/tmp/feature-isolation-analyzer-fixture/`
- Create temporarily: `/tmp/feature-isolation-analyzer-fixture/reports/baseline-small.md`
- Create temporarily: `/tmp/feature-isolation-analyzer-fixture/reports/baseline-cross-system.md`
- Reference: `/home/jethro/Documents/Projects/capstone-nest-backend/docs/superpowers/specs/2026-09-13-feature-isolation-analyzer-design.md`

**Interfaces:**
- Consumes: Approved design requirements and user authorization for subagents.
- Produces: Two baseline reports and a scored failure ledger that identifies what the skill must teach.

- [ ] **Step 1: Build one temporary fixture repository with two feature shapes**

Create a low-coupling `beta-banner` feature and a `digest-notifications` feature whose activation, API, state, queue worker, scheduler, dynamic registration, mail integration, tests, and configuration live in different fixture files. Include a local `AGENTS.md` that permits only report writes.

- [ ] **Step 2: Run the low-coupling scenario without the new skill**

Use a fresh subagent with this prompt:

```text
In /tmp/feature-isolation-analyzer-fixture, analyze and break down the existing beta-banner feature. Explain how it works, everything connected to it, what would cascade if it were disconnected, how to remove it safely, and focused improvements. Analysis only. Write the result to reports/baseline-small.md.
```

Expected RED evidence: record whether the agent establishes a boundary, traces inbound and outbound connections, gives a bounded removal verdict, avoids unrelated expansion, labels uncertainty, and writes only the requested report.

- [ ] **Step 3: Run the cross-system scenario without the new skill**

Use a separate fresh subagent with this prompt:

```text
In /tmp/feature-isolation-analyzer-fixture, analyze and break down the existing digest-notifications feature. Explain how it works, everything connected to it, what would cascade if it were disconnected, how to remove it safely, and focused improvements. Analysis only. Write the result to reports/baseline-cross-system.md.
```

Expected RED evidence: record missed direct or transitive consumers, durable state, async or scheduled behavior, dynamic registration, safe disassembly order, validation and rollback checkpoints, or unsupported completeness claims.

- [ ] **Step 4: Record the observed baseline failures**

Write a concise working ledger outside the permanent skill containing only failures demonstrated by the reports. If both controls already satisfy every acceptance criterion, stop: there is no demonstrated guidance gap to justify creating the skill.

---

### Task 2: Create the Minimal Skill and Metadata

**Files:**
- Create: `/home/jethro/.codex/skills/feature-isolation-analyzer/SKILL.md`
- Create: `/home/jethro/.codex/skills/feature-isolation-analyzer/agents/openai.yaml`

**Interfaces:**
- Consumes: Baseline failure ledger from Task 1.
- Produces: `$feature-isolation-analyzer`, automatically discoverable for existing-feature forensics and constrained to report-only analysis.

- [ ] **Step 1: Initialize the skill directory**

Run:

```bash
python3 /home/jethro/.codex/skills/.system/skill-creator/scripts/init_skill.py feature-isolation-analyzer \
  --path /home/jethro/.codex/skills \
  --interface 'display_name=Feature Isolation Analyzer' \
  --interface 'short_description=Trace and safely deconstruct existing features' \
  --interface 'default_prompt=Use $feature-isolation-analyzer to analyze and break down this existing feature, map its dependencies and cascade risks, and write the findings to a Markdown report.'
```

Expected: a new skill directory containing `SKILL.md` and `agents/openai.yaml`, with no optional resource directories.

- [ ] **Step 2: Replace the scaffold with the minimal behavior-shaping instructions**

Write `/home/jethro/.codex/skills/feature-isolation-analyzer/SKILL.md` with this structure and tighten only where Task 1 demonstrated a real gap:

```markdown
---
name: feature-isolation-analyzer
description: Use when examining an existing software feature to understand its behavior, dependencies, consumers, blast radius, removal feasibility, isolation boundaries, or focused improvement opportunities.
---

# Feature Isolation Analyzer

## Contract

Reverse-engineer one existing feature as a bounded system and make one canonical Markdown report the source of truth. This is analysis-only: the report is the only permitted mutation. Do not edit code, configuration, dependencies, schemas, data, git history, or external systems.

Use adaptive depth for ordinary requests. `Full forensic` broadens every applicable subsystem but still reports bounded—not guaranteed complete—coverage.

## Analyze

1. Read repository instructions. Resolve the feature's behavior, vocabulary, entry points, and primary owners. Ask one question only when competing interpretations materially change the graph; otherwise state the scope assumption.
2. Trace the dependency spine in both directions. Inbound edges include callers, routes, UI actions, schedules, callbacks, registrations, flags, and configuration. Outbound edges include services, contracts, state, caches, jobs, events, files, policy, audit, observability, and external systems. Search for consumers of public contracts.
3. Inventory every direct edge. Expand transitive edges when they are shared, stateful, asynchronous, security-sensitive, external, dynamic, or removal-relevant. Maintain one exploration ledger so evidence is not rediscovered or repeated.
4. Simulate cuts at entry points, producers, consumers, workers, contracts, state owners, and operational resources. Record immediate, delayed, persisted, compatibility, validation, cleanup, and rollback effects.
5. Stop when each discovered high-risk edge has an owner, evidence, effect, confidence, and disposition; known entry points and public contracts have consumer searches; and one focused saturation search finds nothing new. Say `no additional dependency was found within the inspected scope`, never `there are no other dependencies`.

## Evidence

Use precise file and symbol, route, schema, test, command, or runtime pointers.

| Label | Meaning |
|---|---|
| Confirmed | Direct current evidence |
| Inferred | Reasoned from named evidence |
| Unverified | Material uncertainty not currently resolvable |

Classify effects as direct, transitive, operational, dormant, or uncertain. Prefer focused ranges and symbol-aware references; skip generated output, dependencies, build artifacts, lockfiles, and unrelated tests unless evidence connects them.

## Report

Use the user's path, then a repository analysis convention, otherwise `docs/feature-analysis/YYYY-MM-DD-<feature-slug>.md`. Update an existing canonical report for the same feature rather than creating a competitor. Do not commit it unless explicitly asked.

Layer the report:

1. Executive verdict: scope, owner, coupling, removability, cascade risks, recommendation.
2. Feature anatomy: entry points, owners, flows, state, contracts, side effects, variants.
3. Dependency and cascade map: provider, interface, consumer, effect, risk, confidence, evidence.
4. Isolation and disassembly: seams, prerequisites, ordered cuts, compatibility, cleanup, validation, rollback.
5. Focused improvements: separate required decoupling from optional enhancements.
6. Evidence and uncertainty ledger.

If runtime or tools are unavailable, continue with narrower evidence and mark affected conclusions unverified. Before handoff, reconcile the verdict with the map, account for state and async effects when present, give every removal phase validation and rollback guidance, remove placeholders, and state the remaining coverage boundary.

## Common Mistakes

- Following only imports misses data, events, configuration, runtime registration, and operational consumers.
- Reading every file equally wastes context; expand by risk.
- Treating search saturation as proof of absence overstates confidence.
- Mixing implementation into the report exceeds authorization.
```

- [ ] **Step 3: Verify generated UI metadata**

Ensure `/home/jethro/.codex/skills/feature-isolation-analyzer/agents/openai.yaml` contains exactly:

```yaml
interface:
  display_name: "Feature Isolation Analyzer"
  short_description: "Trace and safely deconstruct existing features"
  default_prompt: "Use $feature-isolation-analyzer to analyze and break down this existing feature, map its dependencies and cascade risks, and write the findings to a Markdown report."
```

Do not add an explicit invocation policy; implicit invocation is the default.

- [ ] **Step 4: Run structural validation**

Run:

```bash
python3 /home/jethro/.codex/skills/.system/skill-creator/scripts/quick_validate.py /home/jethro/.codex/skills/feature-isolation-analyzer
wc -w /home/jethro/.codex/skills/feature-isolation-analyzer/SKILL.md
```

Expected: validator success and a concise skill near the 500-word target without losing demonstrated requirements.

---

### Task 3: Verify GREEN Behavior and Refine

**Files:**
- Modify only if a demonstrated gap remains: `/home/jethro/.codex/skills/feature-isolation-analyzer/SKILL.md`
- Create temporarily: `/tmp/feature-isolation-analyzer-fixture/reports/skill-small.md`
- Create temporarily: `/tmp/feature-isolation-analyzer-fixture/reports/skill-cross-system.md`

**Interfaces:**
- Consumes: The fixture and baseline ledger from Task 1 plus the installed skill from Task 2.
- Produces: Matched behavioral evidence that the skill improves coverage and preserves adaptive efficiency.

- [ ] **Step 1: Re-run the low-coupling scenario with the skill**

Use a fresh subagent with this prompt:

```text
Use $feature-isolation-analyzer at /home/jethro/.codex/skills/feature-isolation-analyzer to analyze the existing beta-banner feature in /tmp/feature-isolation-analyzer-fixture. Write only the canonical report to reports/skill-small.md.
```

Expected GREEN evidence: a bounded report with the required verdict and maps, no unrelated deep exploration, and no mutation outside the report.

- [ ] **Step 2: Re-run the cross-system scenario with the skill**

Use a separate fresh subagent with this prompt:

```text
Use $feature-isolation-analyzer at /home/jethro/.codex/skills/feature-isolation-analyzer to analyze the existing digest-notifications feature in /tmp/feature-isolation-analyzer-fixture. Write only the canonical report to reports/skill-cross-system.md.
```

Expected GREEN evidence: state, async, scheduled, dynamic, policy, operational, and consumer edges are handled when present; the removal sequence includes validation and rollback; uncertainty is bounded rather than hidden.

- [ ] **Step 3: Refactor only against observed failures**

If either GREEN report misses a design acceptance criterion, patch the smallest relevant instruction and rerun only the failing scenario. Do not add hypothetical rules, scripts, or references.

- [ ] **Step 4: Run final verification and clean the temporary fixture**

Run:

```bash
python3 /home/jethro/.codex/skills/.system/skill-creator/scripts/quick_validate.py /home/jethro/.codex/skills/feature-isolation-analyzer
wc -w /home/jethro/.codex/skills/feature-isolation-analyzer/SKILL.md
find /home/jethro/.codex/skills/feature-isolation-analyzer -maxdepth 3 -type f -print
```

Expected: validator success, only `SKILL.md` and `agents/openai.yaml`, and no scaffold placeholders. After reviewing all four reports and preserving the scored evidence, remove only the exact temporary fixture directory created in Task 1.

- [ ] **Step 5: Report installation evidence**

Provide the installed skill link, validator result, word count, behavior-test summary, remaining limitations, and whether `/home/jethro/.codex/skills` is version-controlled. Do not claim the skill was committed or pushed unless current git evidence proves it.
