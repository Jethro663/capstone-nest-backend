## ADDED Requirements

### Requirement: Final-source Android package
The Android release SHALL be versioned and built only after final source, audit, typecheck, tests, and production export pass.

#### Scenario: Release build begins
- **WHEN** pre-release verification is complete
- **THEN** the version/build is bumped once and all version-sensitive checks are rerun before packaging

### Requirement: Production artifact validation
The Android release SHALL preserve the production package ID and signer lineage and SHALL pass version, ABI, API, archive, 16-KB alignment, size, and SHA-256 validation.

#### Scenario: APK is accepted for publication
- **WHEN** the final release APK is inspected
- **THEN** all required package, signer, version, ABI, API, alignment, size, and hash checks pass against the recorded manifest

### Requirement: Exact delivery evidence
Release completion SHALL require the exact pushed source SHA to pass CI and deploy, and the live manifest and APK bytes to match the locally verified artifact.

#### Scenario: Public release is verified
- **WHEN** CI and Railway complete for the pushed SHA
- **THEN** the public manifest metadata, public APK byte count and SHA-256, and backend update policy all identify the same verified release

#### Scenario: Device evidence is unavailable
- **WHEN** no authenticated physical-device traversal or update installation has been performed
- **THEN** release reporting marks physical-device acceptance unverified instead of inferring it from source, CI, or archive evidence
