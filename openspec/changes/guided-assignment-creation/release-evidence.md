# Release evidence

Date: 2026-09-08

## Revision and automation

- Implementation revision: `10486e288b2f497cb0dfd570c9ce50e0e4edecbc`
- GitHub CI: [run 34201210861](https://github.com/Jethro663/capstone-nest-backend/actions/runs/34201210861) — success
- Railway workflow: [run 34201459838](https://github.com/Jethro663/capstone-nest-backend/actions/runs/34201459838) — success
- Railway project: `00b7dfa6-d938-4029-8119-0194a04b5795`
- Production environment: `21d66a59-ca91-46a4-b99b-1b436cc328d0`
- Backend service/deployment: `e1ee7080-f8ae-43b8-80c0-8c4cb4dba412` / `63007ee5-62e8-474b-9d41-d904ee4de219`
- Frontend service/deployment: `779666d8-a47e-46e3-be2c-e0b07c525866` / `e7156e4c-dc79-4040-879b-f6fddf08d1a3`
- AI service/deployment: `0273d0f2-a724-4dee-86fa-9aca54fd5393` / `4050eca5-ed14-495d-bb0a-89d4bdba5207`

The first implementation push, `d5b9937d261d31f75d0595f9a35681c549c58b7a`, exposed a stale release-identity assertion. Its CI run was superseded and cancelled after the assertion was corrected; it was not deployed.

## Live verification

- Backend `/api/health/live`: `status=ok` after the production deployment.
- Android release: native `0.1.22`, version code `23`, minimum supported code `23`.
- Live APK size: `40982387` bytes.
- Live APK SHA-256: `994c72fd8bcc3f717a467df801672739346f5d933ffa0198e48c30f36ddd8406`.
- Registration record: `167b3783-d57e-4749-b503-75010aff0177`.
- Build `22` read-back: `updateType=apk_forced`, with the registered URL, size, SHA-256 and version metadata.
- Build `23` read-back: `updateType=none`.

## Native evidence

- ARM64 APK passed package, version, installer-permission, signature-v2, 16 KiB zip-alignment, ABI and production API-target checks.
- A separate x86_64 release build installed and launched on the Android emulator; the Nexora login screen rendered without an app fatal exception.
- An authenticated device walkthrough was not run because teacher credentials were not available. Complete, skip, cancel, recovery and handoff behavior is covered by focused screen/model tests.
