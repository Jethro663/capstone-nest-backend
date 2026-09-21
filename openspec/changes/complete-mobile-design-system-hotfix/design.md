## Context

The prior mobile redesign established shared primitives and a navy/red/neutral direction, but only part of the app migrated. Shared role navigation can currently render a white icon on a white control, the Student Home screenshot contradicts the intended follow-up-row layout, hundreds of active color literals bypass the brand authority, local main-action controls remain, and Android startup/system chrome uses legacy colors. The change spans shared UI, all three role surfaces, native resources, generated rich text, and release delivery while functional backend/mobile contracts must remain fixed.

## Goals / Non-Goals

**Goals:**

- Make every shared header/drawer action visible and accessible on the navy frame.
- Make Student Home follow-up records render predictably in interactive and informational states.
- Centralize active presentation color/action ownership and enforce the boundary automatically.
- Align in-app, generated WebView, and Android-native surfaces.
- publish a new Android artifact with source, signer, CI, deployment, public-byte, and policy evidence.

**Non-Goals:**

- No backend, schema, DTO, route, RBAC, academic, grading, query, mutation, or notification-delivery change.
- No full dark mode or navy reading canvas.
- No mechanical replacement of rows, cards, or option selectors merely because they use `Pressable`.
- No weakening of update thresholds or signer migration.

## Decisions

### Semantic roles remain layered over compatibility themes

`mobileBrand.ts` owns literal palette and semantic roles. Existing role themes consume those roles so migration does not force a high-risk component rewrite. Active UI consumers may not define numeric color literals. This was selected over deleting compatibility themes because it gives one palette authority without changing existing component interfaces.

### Header actions use a shared inverse variant

`MobileAction` owns an inverse header variant with a translucent light surface, white foreground, minimum 44 px target, and explicit accessibility label. `MobileAppBar`, role menu/Back controls, drawer close, and header right actions consume the same contract. This was selected over caller-supplied color props because callers produced the confirmed white-on-white failure.

### The drawer keeps behavior and changes presentation only

`RoleDrawerProvider`, route groups, destinations, source-aware Back behavior, profile, and logout callbacks remain unchanged. The drawer receives a navy identity header, neutral body, semantic active row, and inverse close action.

### Student next moves become an exported rendered primitive

An optional `onPress` controls semantics: `Pressable` for navigation and `View` for information. Both share a full-width horizontal layout, fixed 44 px icon slot, flexible copy with `minWidth: 0`, bounded compact scaling, and optional trailing affordance. Render tests replace source-regex layout proof.

### Drift is prevented at source boundaries

A deterministic Node audit rejects numeric hex/rgb/rgba literals in active UI files, generic React Native `Button`, legacy `TouchableOpacity` main actions, and unsupported local main-action abstractions. Literal values remain allowed in named token/native-generation authorities; generated output and historical UI dumps are excluded explicitly. The audit also verifies native resource and rich-text source roles.

### Release evidence is layered

The version/build bump happens once after all source inputs pass. The final evidence distinguishes local tests, signed APK inspection, exact-SHA CI, Railway source deployment, public manifest/APK byte identity, backend policy, and physical-device acceptance. Automated evidence never implies device success.

## Risks / Trade-offs

- **Broad token migration could change semantic emphasis** → migrate by status/intent role, inspect by subsystem, and retain state-focused tests.
- **Control convergence could break callbacks or form state** → keep interfaces/callbacks stable and migrate only action semantics, not navigable rows/cards/options.
- **Static audit could overfit repository syntax** → unit-test allowed and rejected fixtures, produce sorted file/line diagnostics, and keep exceptions narrow and documented.
- **Rendered Jest styles do not prove every device pixel** → cover structure/accessibility automatically and report physical-device acceptance separately.
- **Native colors can drift from TypeScript tokens** → assert exact expected roles in the audit and review native changes during release verification.
- **A premature bump can package stale source** → bump/build only after complete pre-release verification and inspect the final bundle/artifact.

## Migration Plan

1. Add red tests for header contrast, Student next-move rendering, and design ownership.
2. Extend semantic roles and repair shared header/drawer primitives.
3. Replace Student Home local move tile with the tested primitive.
4. Migrate shared/auth/provider/student consumers, then teacher/admin/state/class presets.
5. Align Android resources, root status bar, and rich-text generator; regenerate output.
6. Run audit, typecheck, full Jest, release tests, and production Expo export.
7. Bump to 0.1.48/build 49 once, build with the existing production signer, validate, package, commit, and push.
8. Verify exact-SHA CI/Railway, live manifest/APK byte equality, and backend update policy.

Rollback uses normal revert commits and a newly verified release. Published artifacts and Git history are never overwritten.

## Open Questions

No implementation decision is open. The reporter device build, font/display scale, OEM system chrome, and physical update result remain acceptance evidence to gather separately.
