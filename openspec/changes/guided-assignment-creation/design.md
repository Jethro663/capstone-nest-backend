## Context

The class page creates an empty draft immediately. The editor endpoint already accepts all setup fields in an academic transaction with request receipts. The current period policy must be read live; labels can differ from older analysis.

## Goals / Non-Goals

Goals: understandable format choice, visible slot destination, optional schedule, safe skip, no writes on dismissal, accurate recovery and accessible animation.
Non-goals: new assessment engine, AI authoring redesign, file-upload attempt caps, mobile wizard.

## Decisions

- Use one persistent Radix dialog and three internally animated panels, with Back, progress announcements, reduced motion and a full-height mobile layout.
- Use the existing theme tokens and restrained form controls. Remove the toolbar period selector.
- Read creation context from a teacher-owned backend endpoint, including policy periods, capabilities and existing slot inventories. Read-only fallback policy/state calculations must not insert workbooks or academic records.
- Default to the next available slot with manual override. Send the displayed exact slot ID when a workbook exists. Missing workbooks are generated only on final atomic creation.
- Use the existing editor POST for one unpublished draft, preserving exact payload and mutation ID for uncertain retries. Scope recovery to actor and class; resolve an uncertain request before permitting different creation input.
- Skip keeps format and a valid default period but discards optional placement/schedule. Publish requires actual placement; draft saves remain incomplete-friendly.
- The editor reloads backend truth and displays a creation confirmation; only a transient created flag travels in the URL.

## Risks / Trade-offs

- Slot races → structured conflict, retained values and refreshed context.
- Lost response → explicit retry of the same receipt identity, including reload recovery.
- Shared readiness changes → verify mobile error rendering and existing editor publication tests.
- A read-only context can become stale → revalidate every write through existing academic transactions.

## Migration Plan

Deploy backend and web through the configured development release. No database migration. Existing assessments remain intact; unplaced drafts must be placed before publication. Revert the scoped commit for rollback. APK packaging applies only if mobile inputs change.

## Open Questions

None blocking implementation; use the approved automatic slot with manual override.
