# OpenSpec Verification Reconciliation — 2026-09-29

## Outcome

The six selected active changes contained **23 unchecked tasks** before this run. They are not 23 confirmed product defects. Most are stale or incomplete evidence ledgers; five still require device, authenticated, or live-provider execution that automated repository checks cannot honestly replace.

This report is evidence reconciliation only. It does not treat a newer build, green CI, or a successful deployment as physical-device proof.

## Evidence labels

- **Confirmed** — directly supported by a named repository, test, artifact, provider, or runtime result.
- **Inferred** — a newer release can supersede an older generic release gate only after the current exact-SHA evidence is recorded.
- **Unverified** — requires an environment or interaction that was not exercised.

Evidence classes stay separate: local static/test/build, signed package, GitHub CI, Railway deployment, public live HTTP, authenticated live flow, emulator, and physical device.

## Starting inventory

| # | Change / task | Classification | Current disposition |
|---:|---|---|---|
| 1 | `align-mobile-with-web-contracts` 11.2 backend build/lint/unit/integration/e2e | Confirmed automated portion; runtime prerequisite mixed | Keep open until this run's full backend gates finish; a green gate does not prove unavailable external services. |
| 2 | same 11.3 web lint/test/build/smoke/e2e | Confirmed automated portion; authenticated browser mixed | Keep open unless both repository gates and required authenticated smoke evidence are named. |
| 3 | same 11.4 mobile typecheck/test/build/device role flows | Mixed | Current automated/package evidence may supersede build checks; authenticated device flows remain unverified. |
| 4 | same 11.5 cross-client create/resume/grade/evaluate/AI/pagination/export | Unverified runtime matrix | Keep open; focused adapters and full suites are not a fresh authenticated cross-client execution. |
| 5 | same 12.8 authoring verification and Android 45/46 release evidence | Inferred superseded release | The version-specific package is historical; only annotate after the current release proves the same surviving contracts. Device evidence remains separate. |
| 6 | `admin-maintenance-gateway` 8.2 APK identity/version/ABI/signature/API/hash/registration/served bytes | Inferred superseded package evidence | Current signed APK verification can supersede the old package gate. |
| 7 | same 8.3 review/commit/push | Inferred superseded source release | Current scoped diff and exact outgoing SHA can supersede this procedural gate. |
| 8 | same 8.4 exact-SHA CI/Railway | Inferred superseded provider evidence | Current exact-SHA provider results can supersede it. |
| 9 | same 8.5 live health and non-destructive Maintenance/System Reset checks | Mixed live evidence | Public health can be refreshed; authenticated capability/status remains open without credentials. No Full Reset may be executed. |
| 10 | same 8.6 release evidence and physical/authenticated boundaries | Mixed | Current report can satisfy evidence recording while preserving unverified device/authenticated boundaries. |
| 11 | same 9.8 retention correction release verification | Inferred superseded release, physical mixed | Current exact-SHA release can supersede generic release proof; physical-device evidence cannot be inferred. |
| 12 | same 10.5 Android build 39 release | Inferred superseded version-specific package | Build 39 is historical; current signed package evidence is the relevant maintained artifact. |
| 13 | same 10.6 full release plus authenticated acceptance | Mixed | Automated, provider, health, and served-artifact proof may be refreshed; authenticated acceptance stays open without a valid session. |
| 14 | `stabilize-mobile-navigation-jahub` 5.3 role/JAHUB states at 320/360/412dp | Unverified device/fixture matrix | Keep open. Existing note confirms role/device coverage but zero/multiple lesson states were fixture-blocked. |
| 15 | `mobile-assessment-authoring-parity` 4.2 disposable/authenticated/device workflows | Unverified live AI provider portion | Keep open. Its own evidence names completed disposable/authenticated checks and explicitly excludes live generation/extraction. |
| 16 | `require-android-updates-exempt-ios` 3.4 Android updater flow matrix | Unverified emulator/device matrix | Keep open until old-to-new, offline, cancel, permission, restart, and current-version flows run on an install target. |
| 17 | same 3.5 installable iOS build and real-iPhone role flows | Unverified physical iPhone | Keep open; Android or source parity is not iPhone proof. |
| 18 | same 4.1 commit/push/full SHA | Inferred superseded source release | Current scoped release can supersede the old procedural gate. |
| 19 | same 4.2 exact-revision CI/deployment/live health | Inferred superseded provider evidence | Current exact-SHA evidence can supersede it. |
| 20 | same 4.3 public artifact then Android/iOS decisions | Mixed | Current public APK/policy checks can refresh Android evidence; iOS physical behavior remains separate. |
| 21 | same 4.4 final audit, limitations, clean state | Mixed | This report can reconcile limitations; clean state excludes the preserved unrelated user edit. |
| 22 | `admin-authority-cascade-erasure` 6.3 scoped release and exact-SHA CI | Inferred superseded source/provider release | Current full gates and exact-SHA release can supersede this generic release proof. |
| 23 | same 6.4 Railway/live security/authenticated preview/served APK | Mixed | Provider, public health/security, and served bytes can be refreshed; authenticated destructive preview remains open without credentials and no live deletion is authorized. |

## Confirmed starting evidence

- The inventory count is derived directly from the six `tasks.md` ledgers and excludes this reconciliation change itself.
- Baseline repository and remote were both `3944bd41e2857cd6cf05a124361872083d88ee28` at the start of implementation.
- The pre-run public Android manifest identifies `0.1.55` build `56`, source revision `c869b82d3e84c70df18c4e9815d057d97b547d1c`, SHA-256 `fdfba6ebb373212673cc940b2853dd581741bef6306bb0ed709290f4be7a36ff`, and 37,659,230 bytes.
- `mobile-assessment-authoring-parity/evidence/verification.md` and `release-verification.md` explicitly separate automated/disposable evidence from live AI-provider and physical-device evidence.
- No database mutation, Full Reset, erasure execution, or policy bypass is authorized by this reconciliation.

## Ledger update rule

Historical checkboxes are changed only when the final current-run evidence fully satisfies or explicitly supersedes the task. Mixed tasks remain unchecked and receive a short reconciliation note. Device/authenticated/provider requirements are never closed from tests, package inspection, CI, deployment, or unauthenticated HTTP alone.

## Current-run evidence

Pending final exact-SHA verification. This section will record local gates, Android package identity, commit/push equality, GitHub CI, Railway deployments, public health, route authorization, served artifact equality, updater-policy results, and explicit remaining limitations.
