## 1. Backend contract

- [x] 1.1 Add read-only ownership-checked creation context with policy, capabilities and slot inventories; cover missing and locked workbooks.
- [x] 1.2 Enforce publication placement and return structured slot conflicts; test incomplete saves and publish rejection.

## 2. Teacher creation experience

- [x] 2.1 Implement typed creation model, exact request recovery and service contract; test skip, retries and payload conversion.
- [x] 2.2 Implement accessible animated wizard, format explanations, placement preview/manual choice, schedule and format-specific attempts.
- [x] 2.3 Wire class toolbar and backend-derived editor confirmation/focus; remove immediate creation and toolbar period selector.

## 3. Verification and release

- [x] 3.1 Verify backend/web unit tests, lint, types, builds, backend E2E and mobile compatibility.
- [x] 3.2 Run real browser flows for complete/skip/cancel/back/retry/conflict plus mobile viewport and reduced motion.
- [x] 3.3 Review requirements, scoped diff and packaging applicability; prepare the release handoff.

## Release gates

The execution record must capture the pushed development revision, exact CI run, configured deployment IDs and successful live checks. These gates remain required for finish-and-ship completion and are recorded after publication, outside the commit being verified. APK packaging applies only if mobile build inputs change.
