# Nexora handoff evidence

- Application snapshot: `211483f07b901299b48ae42eda318c7448f1cbfd`
- Handoff build date: `2026-10-01`
- Documentation tooling checkout: `1953e0acb45c0f9f41c3f791b8fae8091738eaf7`
- Backend modules: 43
- Backend HTTP handlers: 485
- AI handlers: 63
- Web pages: 114
- Mobile screen files: 100
- Database tables/enums/migrations: 116 / 55 / 37
- Queue processors: 9
- Environment keys: 98

## Confirmed in the handoff build

- 114/114 web capture owners and 25/25 mobile evidence owners are present.
- User and System PDFs were fully rendered and visually inspected page by page.
- Mobile typecheck and its administrator/coverage contract gates passed during evidence capture.
- The APK bytes match the recorded size and SHA-256.
- Source archive is produced directly from the locked application commit.

## Boundary

This package does not claim that the locked snapshot is currently deployed, that current CI is green, or that a physical Android/iOS device was tested during this documentation build. Production secrets and production school records are intentionally absent.
