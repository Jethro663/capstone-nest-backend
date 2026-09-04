# Mobile APK Installer Handoff Design

The authoritative change design is [the OpenSpec design](../../../openspec/changes/fix-mobile-apk-installer-handoff/design.md), with testable requirements in [the capability spec](../../../openspec/changes/fix-mobile-apk-installer-handoff/specs/mobile-apk-installation/spec.md).

The selected approach declares Android's installer permission at both source boundaries, interprets Package Installer's returned result, preserves verified bytes across recoverable cancellation or blocking, and adds a release gate for the merged APK. It deliberately avoids a custom native module, a new dependency, or forcing every user through Settings.

Acceptance requires red/green regression evidence, three complete mobile test rounds, successful mobile typechecking, backend and frontend safety gates, an inspected ARM64 APK, exact embedded/downloaded artifact equality, exact-commit CI and deployment success, and production update-policy readback for both old and new clients.
