## ADDED Requirements

### Requirement: APK decisions are monotonic
The backend MUST NOT offer an APK when the installed version code is equal to or greater than the latest registered APK version code.

#### Scenario: Latest build reports a mismatched runtime
- **WHEN** a client reports the latest registered version code and a non-matching OTA runtime value
- **THEN** the backend returns update type `none`

#### Scenario: Client is behind a newer full APK
- **WHEN** a supported client reports a version code below the latest release and that release requires a full APK
- **THEN** the backend returns update type `apk_optional`

#### Scenario: Client is below the support floor
- **WHEN** a client reports a positive version code below `minSupportedVersionCode`
- **THEN** the backend returns update type `apk_forced`

### Requirement: Mobile reports only authoritative runtime identity
The mobile client MUST report OTA runtime only when Expo Updates is enabled and supplies a non-empty runtime string, and MUST NOT serialize Expo configuration policy objects as runtime identifiers.

#### Scenario: OTA is disabled
- **WHEN** the native Expo Updates module is disabled
- **THEN** the version-check request omits `currentOtaVersion`

#### Scenario: OTA runtime is available
- **WHEN** Expo Updates is enabled and exposes a non-empty runtime version
- **THEN** the version-check request sends that exact runtime string

### Requirement: Update dialog identifies both builds
The APK update dialog SHALL show the installed native version/build and the available native version/build whenever an APK update is offered.

#### Scenario: Older APK receives an update
- **WHEN** the backend returns `apk_optional` or `apk_forced`
- **THEN** the dialog displays both installed and available version identities

#### Scenario: Client is current
- **WHEN** the backend returns update type `none`
- **THEN** no APK update dialog is rendered

### Requirement: Every mobile role can identify the installed APK
The student, teacher, and administrator Profile surfaces SHALL display a subdued information indicator containing the installed native version and Android build code.

#### Scenario: User opens Profile
- **WHEN** an authenticated student, teacher, or administrator opens the Profile tab
- **THEN** the screen displays `Nexora Mobile · v<version> (build <code>)` with an information icon without covering navigation or primary actions

### Requirement: Published repair artifact is internally consistent
The repaired Android release SHALL use native version `0.1.16` and version code `17`, and its source metadata, compiled APK metadata, hosted bytes, and registered backend policy MUST agree.

#### Scenario: Release verification completes
- **WHEN** the code-17 APK is prepared for publication
- **THEN** package identity, version, installer permission, signature continuity, ARM64 ABI, ZIP integrity, 16 KB alignment, embedded production API URL, byte size, and SHA-256 all pass verification
