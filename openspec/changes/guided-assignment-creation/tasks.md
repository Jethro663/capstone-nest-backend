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

## 4. Immutable assessment format

- [x] 4.1 Add a backend regression test and reject changes to an existing assessment type with a structured immutable-format error.
- [x] 4.2 Remove the web editor format switcher and stale switch-copy; omit type from existing web saves and cover the behavior.
- [x] 4.3 Remove the post-creation mobile type selector while retaining pre-creation AI choices; omit type from existing mobile saves and cover the behavior.

## 5. Native mobile creation parity

- [x] 5.1 Add mobile creation-context types, payload conversion and actor/class-scoped exact-request recovery with red-green unit coverage.
- [x] 5.2 Replace the compatibility create screen with the accessible animated three-step wizard, conflict rollback and backend-derived handoff confirmation.
- [x] 5.3 Route teacher class, teacher assessment and admin New actions through the wizard and cover navigation plus complete/skip/cancel/retry flows.

## 6. Follow-up verification and release

- [x] 6.1 Run focused and full backend, web and mobile checks plus native flow evidence.
- [x] 6.2 Build the next production Android APK, validate package/version/ABI/signature/alignment/API target, prepare and verify its delivery manifest.
- [ ] 6.3 Review the complete scoped diff, commit and push `developement`, observe exact CI/Railway success, verify live health/APK bytes and register/read back the Android update contract.
