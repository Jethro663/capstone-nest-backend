## Context

The approved discussion requires strict Android update admission and an explicit iOS exemption. Starting checkout is clean `developement` at `ce2380e0`. The current backend publishes Android build 20 with minimum 1. The modal does not gate initial mount, fails open on check errors, and trusts installer return. Source is shared with iOS.

## Goals / Non-Goals

**Goals:** latest verified Android release required; equal/newer installed builds admitted; no access on unknown policy; recoverable installation; iOS APK exemption on both boundaries; backend rejection of identified outdated Android clients; complete packaging and delivery evidence.

**Non-Goals:** silent OS installation, anti-tampering security, forcing iOS updates, changing academic APIs, or pretending old APK source can be patched remotely. No new worktree or delegated workers.

## Decisions

- Preserve the current response shape and minimum-supported policy as the activation/recovery control. Release tooling defaults the floor to the released Android build and rejects accidental optional release manifests unless an explicit recovery override is used. Backend rejects floors above the target, makes iOS always nonblocking, and treats an unknown Android build as requiring verification rather than supported. Publishing new APK bytes precedes raising the floor.
- Move the update provider outside authentication/role providers. On Android, maintain access state separately from download/install state; initially do not mount children until verified. On later policy checks retain the mounted app beneath a blocking surface to preserve drafts, but pause its interaction and API admission. Block on check failures; do not discard known forced decisions. Every access restoration requires a fresh valid Android policy and installed native identity. iOS renders children without entering APK code.
- Deduplicate concurrent checks/download/install actions. Recheck on foreground, periodically while active (also recovers after reconnection), manual retry, and Android API policy errors. Rechecks during download/verification/installation are deferred to avoid wiping the verified file or racing installer handoff. Installer completion is followed by installed-build and policy verification.
- Add `X-App-Platform` and `X-App-Version-Code` to mobile HTTP clients. A global backend guard evaluates identified Android requests using the same policy and returns `APP_UPDATE_REQUIRED` (HTTP 403) or `APP_UPDATE_CHECK_FAILED` (503). Update registration/checks, health and logout recovery remain reachable. iOS/web and legacy requests without explicit platform metadata preserve compatibility; never infer Android merely from a missing header. This is compatibility enforcement, not an auth authority. Public update checks remain unauthenticated.
- Keep APK native operations platform guarded and separately test iOS without calling the policy endpoint. OTA remains separate and cannot satisfy an Android binary requirement.
- Retain the package identity/signing certificate, verify byte size and SHA-256 before publication, and use the existing Android release pipeline. Prepare iOS build configuration if required by available iPhone testing; real iPhone flows remain a separate acceptance gate.

## Risks / Trade-offs

- Strict checks make policy outages block Android → clear retry UI and recovery policy; no fake success from cached approval.
- Legacy clients omit metadata and have old UI behavior → prompt them through the existing force-update contract, document the migration limitation, never block unrelated iOS/web clients by guessing identity.
- Activation during assessments can disrupt work → retain app memory while blocking interaction and activate only after release validation; no hidden automatic submission or answer discard.
- Unknown iOS signing/device access → ask early, continue independent Android work, never equate mocked platform tests with iPhone evidence.
- Broken or mismatched public APK can lock users out → verify hosted bytes before policy activation and preserve explicit administrative floor recovery.

## Migration Plan

1. Add red regression tests, implement policy/guard and mobile gate, then run focused and full affected checks.
2. Build the next monotonic Android version, validate upgrade/cancel/failure/restart/current-version behavior on emulator/device, and embed exact bytes and manifest.
3. Commit/push scoped changes, watch exact CI and deployments, then verify public APK/manifest and register the strict policy.
4. Check old/current/newer Android and iOS live policy/API responses. Verify real iPhone core flows before declaring full completion.
5. For a bad release, use the guarded registration endpoint to lower that policy's minimum while delivering a corrective higher-build APK. Never advertise an APK downgrade; recheck clients use authoritative revised policy.

## Open Questions

iPhone/Mac/Apple Developer access is requested from the user and remains an external verification prerequisite.
