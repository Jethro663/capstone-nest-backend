## ADDED Requirements

### Requirement: Platform-specific admission
Android SHALL require the minimum build of the verified published release; normal releases SHALL set that minimum equal to the latest build. Equal or newer installed builds SHALL pass. iOS SHALL never receive an APK requirement.

#### Scenario: Android release activation
- **WHEN** a verified release becomes mandatory
- **THEN** older Android builds receive `apk_forced`, current/newer builds receive `none`, and iOS receives a nonblocking response with no APK action

### Requirement: Strict and recoverable Android gate
The Android app MUST verify policy before mounting authenticated navigation and MUST block interaction when a later check is pending, fails, or requires updating. It MUST preserve mounted session drafts during later checks and SHALL offer retry/recovery without a skip action.

#### Scenario: Offline launch or failed recheck
- **WHEN** policy verification fails on launch or while an old build is blocked
- **THEN** the app remains blocked with a verification/retry message and does not silently admit the client

#### Scenario: Installation cancellation and success
- **WHEN** installation is cancelled, denied, or returns while the installed build is still outdated
- **THEN** access remains blocked and verified-file retry or permission guidance remains available
- **WHEN** the installed build satisfies a fresh policy
- **THEN** access is restored

### Requirement: Lifecycle enforcement
Android SHALL recheck on foreground, manual retry, periodic active checks and API policy rejection, deduplicating work and deferring lifecycle checks during active package operations.

#### Scenario: Resume and concurrent events
- **WHEN** the app resumes after release activation or simultaneous check triggers occur
- **THEN** one policy evaluation blocks outdated access without duplicate downloads/installers or loss of recovery state

### Requirement: API compatibility enforcement
Mobile requests SHALL identify their platform and installed build. Backend SHALL reject identified unsupported Android requests with a structured update-required error while keeping policy/recovery endpoints reachable. iOS, web and unidentified legacy clients SHALL retain existing auth/RBAC behavior.

#### Scenario: Supported platform boundaries
- **WHEN** outdated Android, current Android, iOS and unidentified clients request the same protected resource
- **THEN** only identified outdated Android is refused by update policy, and ordinary auth/RBAC still applies to every client

### Requirement: iOS isolation and evidence
iOS SHALL never invoke the APK check/download/install/permission flow, even if Android policy is forced or unavailable. Completion SHALL include separate real iPhone core-flow evidence.

#### Scenario: Android enforcement active during iPhone use
- **WHEN** iOS launches with a lower independent build number while Android requires updating
- **THEN** iOS can log in and perform its core role flows without an APK gate

### Requirement: Verified release delivery
Each Android release SHALL use a higher version code, matching package/signature, verified artifact bytes and public metadata. Strict activation SHALL follow public delivery verification. Deployment completion SHALL be tied to the pushed source revision.

#### Scenario: Publication and activation
- **WHEN** an Android release is activated
- **THEN** its public APK matches the built size/hash and manifest, the previous APK upgrades successfully, the new APK admits access, and applicable CI/deployments are successful
