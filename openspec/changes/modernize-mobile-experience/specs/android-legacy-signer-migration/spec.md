## ADDED Requirements

### Requirement: Detect the Android signer migration boundary
Mobile SHALL identify an update from version code 46 or earlier to version code 47 or later as a one-time signer migration rather than an ordinary in-place update.

#### Scenario: Legacy build finds the production-signed release
- **WHEN** the installed version code is at most 46 and the available release version code is at least 47
- **THEN** the updater SHALL present the legacy migration workflow and SHALL NOT invoke the ordinary in-app download-and-install path

### Requirement: Preserve the reinstall artifact outside app-private storage
The legacy migration SHALL open the immutable HTTPS APK artifact in the system browser or download manager before directing the user to uninstall the old app.

#### Scenario: User starts the legacy migration
- **WHEN** the user confirms that work is synced and activates the migration download
- **THEN** mobile SHALL open the release artifact URL externally and SHALL explain that the downloaded file must remain available after the old app is uninstalled

### Requirement: Explicit legacy migration guidance
The legacy workflow SHALL explain the signer mismatch, local-data risk, credential prerequisite, and ordered download, uninstall, install, sign-in, and version-confirmation steps.

#### Scenario: User has unsynced or unknown local work
- **WHEN** the migration warning is shown
- **THEN** the app SHALL tell the user to stop and sync or verify important work before uninstalling and SHALL not describe the update as automatic

### Requirement: Preserve normal production-signed updates
Mobile builds at version code 47 or later SHALL retain the checksum-verified in-app update flow for later releases.

#### Scenario: Production-signed build downloads a newer release
- **WHEN** the installed and target releases are both on the production signer lineage
- **THEN** the updater SHALL continue to download, verify, and request installation through the existing in-app path

### Requirement: Release verification preserves signer continuity
Every published Android release SHALL be checked for expected package name, version metadata, SHA-256 artifact digest, and the established production certificate before its manifest is made available.

#### Scenario: Prepared APK has an unexpected signer
- **WHEN** release verification finds a certificate digest different from the established production certificate
- **THEN** publication SHALL fail and the manifest SHALL not advertise that APK as an update
