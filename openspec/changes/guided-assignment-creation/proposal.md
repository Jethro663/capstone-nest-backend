## Why

New Assignment currently saves an empty quiz before teachers choose its format or understand its class-record destination. Guided setup should make those choices clear before creating durable records.

## What Changes

- Add one accessible, animated three-step dialog: format, class record, name and schedule.
- Allow skipping setup after format selection to create an unpublished, unplaced draft.
- Provide read-only creation context and use the existing atomic editor save with exact retry identity.
- Require valid class-record placement for publication; preserve incomplete draft saves.
- Explain file-upload revisions without offering an ineffective attempt limit.

## Capabilities

### New Capabilities
- `guided-assignment-creation`: Guided setup, atomic creation, recovery, placement and publication guarantees.

### Modified Capabilities
None.

## Impact

Backend assessments context, readiness and placement errors; frontend class assignments, service, wizard and editor confirmation. Verify mobile compatibility with shared readiness errors. No planned schema or dependency changes. Package Android only if mobile build inputs change.
