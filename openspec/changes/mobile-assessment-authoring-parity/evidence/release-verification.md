# Assessment release verification — 2026-09-01

This follow-up verifies an isolated assessment-only snapshot based on `028f9dd3`. Unrelated authentication and roster changes in the original checkout are excluded. The previous verification report describes the earlier combined working tree and its emulator artifact; those fingerprints and test counts must not be used for this release.

## Fresh checks

| Check | Result |
| --- | --- |
| Backend unit tests | 111 suites / 1,238 tests passed |
| Backend end-to-end tests | 2 suites / 5 tests passed |
| PostgreSQL 18 integration, large fixture enabled | 2 suites / 53 tests passed, no skips |
| Web unit tests | 154 suites / 654 tests passed |
| Mobile unit tests after the final fix | 42 suites / 229 tests passed |
| AI service tests | 181 tests passed |
| Deployment status gate tests | 10 tests passed |
| Types / lint | Web and mobile standalone type checks passed; web lint passed; backend lint passed configured threshold (0 errors, 2,285 existing warnings) |
| Production builds | Two consecutive backend builds and the web production build passed |
| Fresh migration and replay | All 17 migrations applied; replay was a no-op |
| Legacy migration rehearsal | Exact Q4 grade, explicit zero, duplicate state and unknown roster preserved; no annual result fabricated |
| Backend production startup | `npm run start:prod` reached `/api/health/live` using disposable local services |
| Offline rich-text bundle | Rebuilt byte-for-byte identically from fresh locked dependencies |
| OpenSpec / diff / workflow | Strict OpenSpec validation, whitespace check and CI YAML parsing passed |

That is 2,360 application/database tests, plus 10 deployment-gate tests; reruns are not counted twice. Fresh `npm ci` completed for backend, web and mobile. Mobile has no lint script.

The mobile production-dependency audit matches the base commit exactly: 32 advisory entries (1 low, 12 moderate, 18 high, 1 critical), with no newly affected package. The critical entry is the existing `shell-quote` tooling dependency. No forced dependency upgrades were applied during this scoped release; these advisories remain follow-up work.

CI now includes the assessment-editor PostgreSQL suite and enables the large academic fixture in both database-version jobs and verifies that the committed offline editor bundle matches its source. An unrelated fourth constructor argument in the academic test fixture was excluded together with the pending roster implementation.

## Review defect and regression

A successful server save was incorrectly reported as uncertain if clearing the device recovery copy failed afterward. A real Save-button handler regression failed before the fix (the assessment list was not refreshed), then passed after separating cleanup warnings from the committed save. The full mobile suite and typecheck passed again. Failed cleanup now reports `Saved to server · device recovery cleanup unavailable`; it does not request another save or suppress query invalidation.

## Fresh authenticated runtime checks

A freshly built backend and the web production build ran against the separate synthetic authoring database. No real school record was mutated.

- The actual mobile request builder saved and reopened the six-question fixture and manual upload fixture without changing question/option rows, settings, images/positioning metadata, rubric fields, attachments or totals. Replaying each mutation returned the identical receipt; a new mutation at the stale revision returned the expected conflict.
- Previously applied Quiz, Exam and Assignment jobs reopened the same unpublished assessments. These are explicitly seeded completed jobs, not live model-generated results.
- Missing-period capabilities denied preparation and release. The fresh production web build also showed its administrator-repair guidance and disabled Save and Ready to give.
- The production web editor displayed all six types and retained the mobile rich-text description. Real Save, Preview, Ready to give + Save, and Draft + Save controls worked. Database confirmation showed published then draft, six points retained, and zero attempts created. The one setup checklist item was only a recommended due date (zero required issues).

`release-http-checks.json` contains the focused API results. The existing `verification.md` contains the earlier Android keyboard, offline recovery, restart, conflict and cross-platform UI matrix.

## Release artifact and limits

The local Java 17 build targets ARM64 and explicitly embeds the production backend API URL. Version is 0.1.10 / code 11. `release-artifact-manifest.json` records the final checksum, signing certificate, archive checks and source fingerprints. The downloadable APK is copied from that exact output only after validation.

The retained Android Debug certificate supports updates over the existing internal APK; this is not a store-signing release. The final ARM64 production-target artifact is not claimed to have authenticated physical-device coverage. Earlier device evidence is from the identified x86_64 local-API build.

Live model/provider generation, source indexing and worker restart/extraction end-to-end remain unverified because the local Ollama has no installed model and cloud credentials are absent. OpenSpec task 4.2 remains open for that gate; no production repair or historical remapping is performed. The committed local repair report omits school record identifiers; the full report stays in the original local checkout.

Pushing `developement` triggers CI and the existing Railway workflow. The default `master` version of that workflow deploys services in parallel; this release does not silently modify `master` or claim ordered deployment. Exact-commit CI and resulting deployment status are checked after the push and reported separately.

## Reproducibility

Release checks ran from `/tmp/nexora-assessment-release-20260901`; logs are `/tmp/nexora-release-*.log`. The database tests use disposable `nexora_academic_test_release_20260901`; the legacy rehearsal uses a separate `nexora_academic_test_release_upgrade_20260901`. Both are separate from the synthetic authoring UI database and school data.
