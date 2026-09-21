# Mobile Design-System Completion Hotfix — Feature Impact Plan

**Date:** 2026-09-22
**Decision status:** approved for implementation by the requesting user
**Inputs:** supplied Student Home and Student Classes screenshots, current mobile source, committed build-48 APK, focused Jest results, and the 2026-09-22 isolation/design reports

## 1. Executive summary

Complete the existing mobile redesign rather than introducing a third visual direction. The hotfix makes navy the shared structural frame, red the shared intent color, and semantic state tones the only other accents. It fixes the confirmed white-on-white drawer trigger, replaces the screenshot-broken Student Home follow-up tile with a rendered/tested row, migrates active UI color and main-action drift to shared owners, aligns Android startup/system chrome, and ships a new production-signed updater artifact.

The change is presentation and packaging only. Backend APIs, schemas, DTOs, routes, role guards, academic rules, grading behavior, query keys, mutations, and update-policy semantics are frozen.

## 2. Current behavior and evidence

| Area | Confirmed current state | Evidence | Planned outcome |
|---|---|---|---|
| App-bar drawer/Back action | Shared role wrapper can pair a white surface with a white icon | `RoleNavigationDrawer.tsx` and role wrapper callers | Shared inverse action: translucent-white surface, white foreground, 44 px target |
| Student Home next moves | Screenshot shows legacy-looking vertical geometry despite current row-like source | supplied screenshot; source-only layout test; build-48 bundle string inspection | Stable full-width rendered row for interactive and informational states |
| Color ownership | 64 active non-theme UI files contain 439 direct color literals | production-source inventory | Zero direct UI literals outside named token/native-generation authorities |
| Main actions | Six production files import `MobileAction`; local action abstractions remain | source inventory | Primary/secondary/tertiary/icon actions delegate to shared action system |
| Filters | Record-list filters already use the compact shared filter sheet | current components and focused tests | Preserve; do not confuse persistent segmented modes with record filters |
| Android shell | Black adaptive background, white status bar/splash, legacy blue resource | `app.json`, Android `colors.xml`, `styles.xml` | Navy/canvas native shell consistent with in-app frame |
| Update artifact | Current release is 0.1.47 / build 48 | `mobile/app.json` | Build 49 produced only after final source inputs and verified end to end |

## 3. Impact and consumer map

```text
mobileBrand semantic roles
  -> role compatibility themes
  -> MobileAction / MobileAppBar / shared filters and state primitives
  -> StudentScreen / TeacherScreen / AdminScreen wrappers
  -> RoleNavigationDrawer and every role navigator
  -> student / teacher / admin / auth / provider / modal UI consumers
  -> app.json + Android resource roles + generated rich-text CSS
  -> Expo bundle -> signed APK -> frontend manifest -> backend update policy
```

### Direct owners

- `mobile/src/theme/mobileBrand.ts` and compatibility theme modules.
- `mobile/src/components/ui/MobileAction.tsx` and `MobileAppBar.tsx`.
- `mobile/src/components/navigation/RoleNavigationDrawer.tsx`.
- Role primitive adapters for student, teacher, and admin.
- `mobile/src/screens/student-home/StudentHomeView.tsx` and a shared/exported follow-up-row primitive.
- Every active presentation file listed in the isolation inventory.
- `mobile/scripts/build-assessment-rich-text.cjs`, `mobile/app.json`, and Android `values` resources.
- Mobile release version/manifest inputs and the frontend/backend release registration flow.

### Indirect consumers

- All student, teacher, and admin navigator roots.
- JA, assessment, class, module, notification, auth, profile, dialog, and offline/update surfaces.
- CI mobile job, Railway frontend deployment, live download manifest, and backend update-policy endpoint.

## 4. Conflicts, invariants, and risks

### Preserved invariants

1. Backend remains authoritative for auth, RBAC, official academic state, grading, audit history, and update policy.
2. Existing route names, navigation params, drawer destinations, Back fallbacks, and deep-link behavior remain unchanged.
3. Existing React Query calls, keys, invalidation, mutations, loading/error semantics, and role guards remain unchanged.
4. Record filters continue to use the compact shared filter sheet; Current/Completed and similar persistent modes may remain segmented controls.
5. Reading surfaces stay neutral. This is not a full dark mode or navy content-canvas conversion.
6. Rows/cards/options may remain `Pressable`; only action semantics converge on `MobileAction`.

### Principal risks and controls

| Risk | Likelihood / impact | Control |
|---|---|---|
| Broad token migration changes state meaning | Medium / High | Map by semantic role, keep focused state tests, review direct-literal diff by subsystem |
| Mechanical control replacement breaks navigation or form state | Medium / High | Replace named main-action abstractions only; preserve rows/options and callbacks |
| Header action stays invisible in one role | Medium / High | Render shared menu/Back plus all role wrappers; assert distinct semantic surface/foreground |
| Student row clips at narrow width or large text | Medium / High | Explicit icon slot, flexible copy with `minWidth: 0`, bounded compact scaling, rendered tests |
| Android resource or generated output drifts | Medium / Medium | Source audit with explicit native/generated assertions; rebuild generated rich text |
| Release artifact does not contain final source | Low / High | Bump/build only after final tests; inspect bundle marker/version; hash and compare live bytes |
| Signer/update failure repeats | Low / High | Use owner-only production credential file, verify signer lineage, package, ABI, API, 16-KB alignment, and policy read-back |

## 5. Options considered

### Option A — complete and enforce the current system (selected)

Use the existing shared components and role adapters as migration seams, centralize presentation roles, add regression guards, and ship one release. This gives comprehensive visual consistency without rewriting functional flows.

### Option B — patch only the two screenshot defects

Lowest immediate effort, but it leaves hundreds of bypasses and the user-visible inconsistency returns. Rejected.

### Option C — delete compatibility themes and rewrite all screens

Architecturally clean in isolation, but unnecessarily expands behavioral risk. Rejected; compatibility themes can consume the single brand authority while callers migrate safely.

## 6. Recommended architecture, state, and error behavior

### Presentation architecture

- `mobileBrand.ts` owns literal palette values plus semantic state, overlay, and inverse roles.
- Compatibility themes expose existing property shapes by referencing those roles; they do not invent new literals.
- `MobileAction` owns primary, secondary, tertiary, icon, and inverse-header variants.
- `MobileAppBar` and `RoleNavigationDrawer` consume the same inverse-header variant.
- Shared state-tone helpers own success, warning, danger, and info presentation.
- An automated audit rejects numeric hex/rgb/rgba literals in active UI source outside approved authorities.

### Student rendering

- A shared/exported follow-up row receives icon, title, subtitle, tone, and optional `onPress`.
- Interactive state renders `Pressable`; informational state renders `View`.
- Both states use the same horizontal geometry and are mounted in Jest.
- Existing agenda data selection and navigation callbacks remain untouched.

### Error and accessibility behavior

- Existing network/API errors and retries are preserved.
- Warning, danger, success, and offline states use semantic tokens without changing copy or control behavior.
- Every icon-only action keeps an explicit accessibility label and a minimum 44 px target.
- Disabled actions use shared disabled state and remain visible against their surface.

### Security and data

- No new data collection, storage, permission, API, or secret is introduced.
- Release signing continues through the owner-only credential file; secret values are never logged.
- No production data is created during acceptance.

## 7. Contract and schema compatibility

| Contract | Change |
|---|---|
| Backend REST / DTO / schema | None |
| Mobile route names and params | None |
| React Query keys and mutations | None |
| Auth/session storage | None |
| Role/RBAC behavior | None |
| Assessment/grading semantics | None |
| Notification delivery | None |
| Android package ID | None |
| APK signer lineage | None; verify existing production signer |
| App version/build | Expected bump from 0.1.47/48 to 0.1.48/49 |
| Release manifest/policy | Normal registration of the new verified artifact only |

## 8. Ordered implementation phases

1. **Regression harness:** add failing render tests for the inverse header action and both Student Home follow-up-row states; add a failing design-system audit.
2. **Shared foundation:** extend semantic roles and `MobileAction`; repair menu/Back/header action contrast; restyle the shared drawer without touching navigation behavior.
3. **Student hotfix:** extract the stable follow-up row and replace the local Student Home tile; retain data and navigation callbacks.
4. **Active-source convergence:** migrate shared/auth/providers, student, teacher, admin, dialogs, state tones, and class presets; remove local main-action abstractions while preserving rows/options.
5. **Native/generated convergence:** align `app.json`, Android resources, root `StatusBar`, and rich-text source; rebuild generated output.
6. **Verification:** run focused tests, source audit, typecheck, full Jest, release tests, and production Expo export.
7. **Release:** bump to 0.1.48/build 49, build with the existing production signer, validate package/signature/ABI/API/16-KB alignment, publish, and verify exact SHA/bytes/policy.

## 9. Verification matrix

| Layer | Check | Required result |
|---|---|---|
| Shared header | Jest render/style/accessibility tests | No white-on-white role; 44 px labeled target |
| Drawer | Student/teacher/admin render and route tests | Same palette and unchanged destinations/behavior |
| Student Home | Render informational and interactive follow-up rows | Icon and copy share a horizontal row; interactive callback fires |
| Source ownership | design-system audit | No unapproved direct UI colors or legacy generic main-action controls |
| Filters | existing focused tests | Shared record filter remains; segmented modes remain valid |
| Static | `npm run typecheck` | Pass |
| Regression | full `npm test -- --runInBand` | Pass |
| Release scripts | `npm run test:release` and `npm run release:verify` | Version/manifest consistency passes |
| Bundle | production Expo export and string inspection | Final hotfix marker/version present |
| Android artifact | package/version/signature/ABI/API/16-KB checks | Production-signed ARM64 artifact passes all checks |
| Delivery | exact pushed SHA, GitHub CI, Railway, live manifest/APK hash, update policy | All refer to the same release inputs and artifact bytes |
| Device | manual authenticated traversal/update | Report separately; never infer from automated evidence |

## 10. Rollout, rollback, observability, and cleanup

- Commit the analysis/spec/plan/OpenSpec artifacts before code so the implementation baseline is inspectable.
- Keep implementation commits small enough to revert by foundation, screen migration, native, and release layers.
- Push only the verified branch head; correlate GitHub runs and Railway deployment with the exact SHA.
- Register build 49 only after the final APK hash is known. Verify public manifest metadata, public APK bytes, and backend policy response.
- If a regression appears, revert the relevant code commit and publish a new verified build. Do not overwrite APK history, rewrite Git history, or weaken signer/update policy.
- Remove temporary export/build directories only when they are untracked and explicitly identified; retain release evidence and immutable public artifacts.
- Physical-device rendering and update installation remain an explicit post-automation acceptance item because the supplied screenshots do not identify build/font/display settings.

## Unverified items

- Exact device build, Android/OEM version, font scale, and display size in the supplied screenshots.
- Authenticated traversal of every route on a physical device.
- OEM-specific status/navigation-bar rendering.
- Legacy installed-signer migration behavior on the reporter’s exact device.
