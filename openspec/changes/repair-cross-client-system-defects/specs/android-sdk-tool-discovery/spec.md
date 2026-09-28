## ADDED Requirements

### Requirement: Release verification follows deterministic Android SDK discovery
Android release verification SHALL resolve `aapt` and `apksigner` from explicit tool paths first, Android SDK environment variables second, and Gradle `android/local.properties` third before returning a clear missing-tool error.

#### Scenario: Valid Gradle local SDK path
- **WHEN** no SDK environment variable is set and `android/local.properties` contains a valid `sdk.dir`
- **THEN** release verification locates build tools under that SDK and proceeds

#### Scenario: Explicit environment and local properties both exist
- **WHEN** an Android SDK environment variable and `local.properties` both specify paths
- **THEN** the environment path takes precedence

#### Scenario: Escaped Windows SDK path
- **WHEN** Gradle local properties contains an escaped Windows path
- **THEN** the resolver decodes the path before locating build tools

#### Scenario: No usable SDK configuration
- **WHEN** explicit paths, environment roots, and local properties are absent or invalid
- **THEN** release verification fails with an actionable discovery error
