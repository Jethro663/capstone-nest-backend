## Context

The class page creates an empty draft immediately. The editor endpoint already accepts all setup fields in an academic transaction with request receipts. The current period policy must be read live; labels can differ from older analysis.

## Goals / Non-Goals

Goals: understandable format choice, visible slot destination, optional schedule, safe skip, no writes on dismissal, accurate recovery and accessible animation.
Non-goals: new assessment engine, AI authoring redesign, file-upload attempt caps, changing legacy assessment types.

## Decisions

- Use one persistent Radix dialog and three internally animated panels, with Back, progress announcements, reduced motion and a full-height mobile layout.
- Use the existing theme tokens and restrained form controls. Remove the toolbar period selector.
- Read creation context from a teacher-owned backend endpoint, including policy periods, capabilities and existing slot inventories. Read-only fallback policy/state calculations must not insert workbooks or academic records.
- Default to the next available slot with manual override. Send the displayed exact slot ID when a workbook exists. Missing workbooks are generated only on final atomic creation.
- Use the existing editor POST for one unpublished draft, preserving exact payload and mutation ID for uncertain retries. Scope recovery to actor and class; resolve an uncertain request before permitting different creation input.
- Skip keeps format and a valid default period but discards optional placement/schedule. Publish requires actual placement; draft saves remain incomplete-friendly.
- The editor reloads backend truth and displays a creation confirmation; only a transient created flag travels in the URL.
- Once an assessment exists, the backend rejects a different `type`. Clients omit `type` from update requests and expose no post-creation format switcher; pre-creation AI setup remains able to choose its supported format.
- Reuse the native `TeacherCreateAssessment` route as a modal three-step wizard. Every mobile New action enters it, and completion replaces it with the editor using the new assessment ID and a transient created flag.
- Mobile stores the exact pending editor request in actor-and-class-scoped AsyncStorage before transmission. An uncertain response can only retry that request; a definite slot conflict clears it, refreshes context and returns to placement with other inputs retained.
- Native panels use teacher design tokens, 44-point controls, screen-reader state and a 180ms opacity/translation transition disabled when reduced motion is enabled.

## Risks / Trade-offs

- Slot races → structured conflict, retained values and refreshed context.
- Lost response → explicit retry of the same receipt identity, including reload recovery.
- Shared readiness changes → verify mobile error rendering and existing editor publication tests.
- A read-only context can become stale → revalidate every write through existing academic transactions.
- Legacy clients still submit the existing type → accept an unchanged value for backward compatibility while rejecting a change.
- Mobile process loss after transmission → persist before sending and navigate only from the server response or idempotent replay.

## Migration Plan

Deploy backend and web through the configured development release. No database migration. Existing assessments retain their current formats. Build and publish the next Android version with production API configuration, verified manifest bytes and app-version registration. Revert the scoped source commit for rollback; published APK bytes remain an immutable release artifact.

## Open Questions

None blocking implementation; use the approved automatic slot with manual override.
