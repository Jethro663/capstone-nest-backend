# Validation before publication

- Backend: 121 suites / 1,314 unit tests; 2 suites / 5 e2e tests; build; lint (0 errors, 2,296 existing/test warnings). All passed.
- Mobile: 79 suites / 415 tests; TypeScript; 10 release-tool tests. All passed. iOS JavaScript export passed; this is not native iPhone execution.
- Frontend lint/build passed. OpenSpec strict validation and whitespace checks passed.
- Fresh disposable PostgreSQL database: all 18 migrations and production-start health smoke passed. The existing development database's unrelated post-seed data smoke lacks submitted attempts/intervention seed rows; it was not changed.
- Android 0.1.20 / build 21: ARM64 archive integrity, package/version, existing signing certificate, 16 KB ZIP alignment, production API URL, manifest size and SHA-256 verified. Embedded APK is byte-identical to the release output. Signing remains the existing internal/debug certificate.
- Android emulator: the current JavaScript running in the existing x86 debug build 20 passed mandatory-screen/Back, policy-outage/retry, native download SHA-256 verification, installer cancellation, settings return and supported-policy admission. A local policy fixture and runtime API override were used; no production policy was changed. A separate x86 release build 21 installed over build 20 successfully.
- ABI limit: the x86 emulator cannot execute the existing ARM-only React Native APK under translation. Emulator execution uses x86 variants; the downloadable artifact remains ARM64.

Publication still requires exact-revision CI/deployment success and public byte verification before strict registration. Real iPhone core-role flows remain an external acceptance gate; iOS testing access has been requested. Do not count bundle export or mocked platform tests as iPhone evidence.
