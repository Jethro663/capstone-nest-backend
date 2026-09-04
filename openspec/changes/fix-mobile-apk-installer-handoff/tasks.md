## 1. Regression Coverage

- [x] 1.1 Add a service test proving a cancelled Android installer result becomes a typed recoverable failure.
- [x] 1.2 Replace the provider loop expectation with success-dismissal and cancelled-or-blocked recovery expectations.
- [x] 1.3 Add release-tool tests that reject missing source and embedded installer permissions.
- [x] 1.4 Run the focused tests and record the expected red failures before changing production code.

## 2. Installer and Release-Gate Implementation

- [x] 2.1 Declare `android.permission.REQUEST_INSTALL_PACKAGES` in Expo and native Android configuration.
- [x] 2.2 Interpret `IntentLauncher.ResultCode` in `installApk` and throw a typed cancellation/blocking error for non-success results.
- [x] 2.3 Map cancellation/blocking to the provider's recoverable settings-and-retry state and remove the unconditional ready-state loop.
- [x] 2.4 Require installer permission in both `app.json` and built-APK `aapt` output during release verification.
- [x] 2.5 Run focused tests and typechecking to establish green behavior.

## 3. Android Release

- [x] 3.1 Bump native version to `0.1.15` and version code to `16` in both version sources.
- [x] 3.2 Build the ARM64 release APK with Java 17 and the explicit production API URL.
- [x] 3.3 Verify package/version, installer permission, signature, ABI, ZIP integrity, 16 KB alignment, and embedded API URL.
- [x] 3.4 Copy the APK into the frontend download path and generate an exact release manifest with size and SHA-256.

## 4. Safety and Delivery

- [x] 4.1 Run three complete mobile test rounds, typechecking, release tests, and release verification.
- [x] 4.2 Run backend and frontend safety gates plus OpenSpec validation and inspect the complete diff.
- [x] 4.3 Commit only reviewed paths, confirm divergence, push to `developement`, and watch exact-commit GitHub and Railway workflows to terminal state.
- [x] 4.4 Compare the live APK byte-for-byte with the committed artifact, register the exact manifest, and read back old/new production policy branches.
