## Why

Android users can continue using old APKs because releases retain a low supported-version floor and the updater fails open. Nexora needs mandatory updates to each verified Android release while iOS remains usable and independently testable.

## What Changes

- Gate Android navigation and authenticated work until its installed build satisfies the published release policy; checking, failed checks, cancelled installs, and restart never bypass the gate.
- Explicitly exempt iOS from APK decisions and Android native updater operations.
- Enforce the published Android floor on API requests that identify themselves as Android; preserve unidentified legacy clients and web/iOS compatibility during migration.
- Recheck on foreground, reconnection/retry, and while active; verify installed native identity after installer return.
- Publish each Android release with its minimum supported build equal to the released build, after validating public artifact integrity.
- Prepare and verify Android packaging, platform regression coverage, available device flows, exact CI/deployment and public artifact evidence. Obtain real iPhone evidence before claiming cross-platform completion.

## Capabilities

### New Capabilities
- `mandatory-android-updates`: Platform-specific update admission, recovery, API enforcement and release activation.

### Modified Capabilities

None.

## Impact

Backend app-version policy/module and global guard; mobile API metadata, update provider/service/types, provider composition, tests and native release metadata; release scripts and hosted APK/manifest. The existing app-version response remains compatible with deployed APKs. No AI or academic contract changes. iOS signing/device availability remains a verification prerequisite, not evidence supplied by Android success.
