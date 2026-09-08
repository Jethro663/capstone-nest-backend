## Why

New Assignment currently saves an empty quiz before teachers choose its format or understand its class-record destination. Guided setup should make those choices clear before creating durable records.

## What Changes

- Add one accessible, animated three-step dialog: format, class record, name and schedule.
- Allow skipping setup after format selection to create an unpublished, unplaced draft.
- Provide read-only creation context and use the existing atomic editor save with exact retry identity.
- Require valid class-record placement for publication; preserve incomplete draft saves.
- Explain file-upload revisions without offering an ineffective attempt limit.
- Make an assessment's selected format immutable after its first durable save.
- Bring the same guided creation, exact-slot selection, skip and retry behavior to the native mobile app.

## Capabilities

### New Capabilities
- `guided-assignment-creation`: Guided setup, atomic creation, recovery, placement and publication guarantees.

### Modified Capabilities
None.

## Impact

Backend assessment mutation rules; web and mobile class/assessment entry points, services, guided creation and editor confirmation. No schema or dependency changes. Mobile source changes require a new verified Android package and release manifest.
