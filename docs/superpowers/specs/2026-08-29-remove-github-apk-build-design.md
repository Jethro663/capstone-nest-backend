# Remove GitHub APK Build Design

## Goal

Stop GitHub Actions from building Android APKs. APK releases will be built locally with Java 17 and the repository's Gradle wrapper.

## Approaches Considered

1. Delete the dedicated APK workflow. This fully removes automatic and manual GitHub APK builds and is the selected approach.
2. Keep the workflow with only `workflow_dispatch`. This still permits GitHub-hosted APK builds and does not meet the requirement to remove them entirely.
3. Disable the workflow with an always-false condition. This leaves dead configuration in the repository and can be accidentally re-enabled.

## Change

Delete `.github/workflows/build-mobile-apk.yml`. Do not modify `.github/workflows/ci.yml` or other deployment workflows because they do not build Android APKs.

Deleting the workflow also removes its APK copy, bot commit, and backend app-version registration steps. Those release tasks become part of the local release process when needed.

## Preserved Behavior

- Local builds from `mobile/android` continue to use `./gradlew assembleRelease` with Java 17.
- Mobile source code, Gradle configuration, and the APK currently stored under `next-frontend/public/downloads/` remain unchanged.
- Existing backend, frontend, mobile test, and deployment jobs remain unchanged.

## Verification

- Confirm the deleted workflow is the only GitHub Actions file containing `assembleRelease` or APK build/sync steps.
- Parse every remaining workflow as YAML.
- Review the final Git diff to confirm only the workflow deletion and this design record are present.
