# Mobile production dependency reachability after parity hardening

Date: 2026-09-18  
Scope: `mobile/package.json`, `mobile/package-lock.json`, generated assessment rich text, React Native/Expo runtime, and build-only dependency paths

## Outcome

`npm audit fix --omit=dev` reduced the production-tree report from **39** vulnerable package nodes (1 critical, 19 high, 17 moderate, 2 low) to **24** (0 critical, 9 high, 15 moderate, 0 low) without an Expo SDK or React Navigation major upgrade.

The directly bundled Tiptap family is now `3.31.3`; it no longer appears in the audit. The generated assessment editor was rebuilt from that version and remains covered by its source/build/render contract tests.

The safe in-range refresh also removed the most consequential reachable paths:

- `form-data` is `4.0.6` under Axios;
- `engine.io-client` is `6.6.6` and `socket.io-parser` is `4.2.7` under the live Socket.IO client;
- `shell-quote` is `1.10.0` under React Native development tooling;
- the affected `ws` copies advanced to fixed in-range versions.

No `npm audit fix --force` was used. Its proposed result would jump Expo from SDK 54 to SDK 57 and React Navigation from 6 to 7, which is a separate native/navigation migration rather than a safe remediation inside this release.

## Remaining-path classification

| Class | Remaining path | Reachability and disposition |
|---|---|---|
| Runtime JavaScript | React Navigation 6 -> `query-string@7.1.3` -> `decode-uri-component@0.2.2` | Present in the application bundle. The reported issue is malformed-percent-decoding denial of service. Nexora's external-link filter first applies an exact custom-scheme allowlist, rejects query/hash values, catches decode failures, and permits only short alphanumeric, underscore, or hyphen identifiers. Risk is constrained but not called fixed. Migrate React Navigation 6 to 7 in a separately test-driven navigation upgrade. |
| Generated WebView bundle | Tiptap `3.31.3` | Direct advisory remediated. No remaining Tiptap audit entry. Existing/new rich-text build and render tests remain the acceptance boundary. |
| Native runtime | Expo native modules | No remaining advisory was isolated to a packaged native library used by the device application. Expo umbrella entries below are dependency-graph aggregation, not evidence of a vulnerable native binary by themselves. |
| Build/dev pipeline | Expo CLI/config/prebuild/Metro -> `image-size`, PostCSS, `uuid` via `xcode` | High/moderate audit nodes remain in local/CI bundling and native-project generation. They process project-owned source/assets in this workflow, not remote learner input on the device. Fix requires an Expo SDK major migration. Keep CI inputs trusted and schedule the SDK 57 migration separately. |
| Aggregate labels | `expo`, `expo-asset`, `expo-constants`, `expo-notifications`, `@expo/*` | These entries inherit the build/config findings above. They must not be counted as distinct exploitable APK/IPA issues without a reachable advisory path. |

## Verification record

- `npm audit --omit=dev`: 24 remaining nodes, no critical finding.
- `npm ls --all --omit=dev`: confirmed the exact runtime and tooling chains described above.
- `npx expo install --check`: required again at the final release gate.
- Full mobile tests, type checking, generated-editor checks, and native packaging inspection remain required before artifact claims.

## Status language

- Direct bundled Tiptap advisory: **implemented/remediated in source**.
- In-range transitive fixes: **implemented; awaiting the full release test gate**.
- React Navigation 7 and Expo SDK 57 major migrations: **deferred with explicit reachability controls**, not silently accepted and not forced into this release.
