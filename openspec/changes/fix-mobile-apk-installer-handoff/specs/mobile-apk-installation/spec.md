## ADDED Requirements

### Requirement: Android installer permission is embedded
The Android source configuration and every published Nexora APK SHALL declare `android.permission.REQUEST_INSTALL_PACKAGES` before the APK is eligible for release.

#### Scenario: Release APK contains installer permission
- **WHEN** release verification inspects Expo configuration and `aapt` metadata for the built APK
- **THEN** both sources contain `android.permission.REQUEST_INSTALL_PACKAGES`

#### Scenario: Permission is missing from either boundary
- **WHEN** Expo configuration or the built APK omits the installer permission
- **THEN** release verification fails before publication

### Requirement: Installer activity results are authoritative
The mobile updater MUST accept only Android Package Installer's success result as a completed handoff and MUST NOT convert a cancelled or blocked result back into an unqualified ready-to-install state.

#### Scenario: Android accepts installation
- **WHEN** Package Installer returns `ResultCode.Success`
- **THEN** the update modal closes and the provider does not redisplay **Install Now**

#### Scenario: Android cancels or blocks installation
- **WHEN** Package Installer returns any non-success result
- **THEN** the updater displays a recoverable installation-blocked state instead of silently looping

### Requirement: Verified APK survives recoverable installer failure
The updater SHALL preserve the verified APK URI when Package Installer is cancelled, blocked, or raises an installation-stage security error.

#### Scenario: User enables Unknown Apps access
- **WHEN** installation is blocked and the user opens Nexora's Unknown Apps settings
- **THEN** the user can return and retry installation without downloading or re-verifying the APK

#### Scenario: APK disappears before retry
- **WHEN** the verified APK no longer exists at retry time
- **THEN** the updater clears the URI and requires a fresh verified download

### Requirement: Installation errors remain stage-specific
The updater MUST distinguish installation cancellation or source restriction from connectivity, download, and APK-integrity failures.

#### Scenario: Installer returns cancellation
- **WHEN** Android closes Package Installer without success
- **THEN** the message describes cancellation or source restriction and does not advise checking the network
