# Nexora iOS TestFlight Handoff

Use this guide for Nexora Mobile `0.1.55` build `56`.

## Fixed identifiers

- Expo owner: `jethro663`
- Expo project ID: `440f3e6f-ae69-495d-b391-4f4eab9d465e`
- TestFlight iOS bundle ID: `com.nexora.lms.mobile.7A4H2D888M`
- Default SideStore bundle ID: `com.nexora.lms.mobile`
- App Store Connect Apple ID: `6816592125`
- Production API: `https://capstone-backend-v2-production.up.railway.app/api`
- Minimum iOS version: iOS 15.1

The iPhone 11 on iOS 26.5 is inside the supported range.

## Who performs each part

### Nexora developer

- Supplies the exact tested Git revision.
- Confirms the default app config and production EAS override resolve the two identifiers above.
- Authenticates the existing Expo project without giving another person the Expo password.
- Reviews the EAS build and submission links.

### Apple Account Holder

- Uses the Apple Account that owns the Individual Apple Developer membership.
- Enters the Apple password and two-factor code directly into the first EAS credential setup.
- Allows creation or reuse of the distribution certificate, App Store provisioning profile, App Store Connect API key, and push-notification key when EAS asks.
- Accepts any pending Apple agreements and adds the TestFlight build to internal testing.

### iPhone tester

- Installs Apple's TestFlight app.
- Accepts the TestFlight invitation using the invited Apple Account.
- Installs Nexora, runs the checklist, and captures the required video and screenshots.

## Never share or commit

Do not send any of these through Messenger, email, screenshots, Git, or this repository:

- Apple Account password
- Apple two-factor authentication code
- Expo password or long-lived access token
- `.p8`, `.p12`, or provisioning-profile files
- Certificate private-key passwords
- App Store Connect API private keys

The Apple Account Holder should type Apple credentials personally. If the first setup is performed through screen sharing, pause screen recording and hide the screen whenever a password, verification code, or recovery information is entered.

## Part 1: Prepare the Windows or Linux computer

1. Install current Git and Node.js LTS.
2. Open PowerShell, Windows Terminal, or a Linux terminal.
3. Clone or update the Nexora repository to the approved revision.
4. Enter the mobile directory:

   ```bash
   cd capstone-nest-backend/mobile
   ```

5. Install the locked dependencies:

   ```bash
   npm ci
   ```

6. Run the local TestFlight readiness check:

   ```bash
   npm run test:ios-testflight
   ```

Expected result: six tests pass. Stop if any test fails.

No Mac, Xcode installation, iPhone cable, SideStore, or local macOS virtual machine is required. EAS performs the signed build on a remote macOS builder.

## Part 2: Give the runner access to the Expo project

The project currently belongs to the Expo account `jethro663`. Do not share that account's password.

Use one of these approaches:

1. **Joint first run:** The Nexora developer signs in to Expo on the Account Holder's computer, the Account Holder enters only the Apple credentials when Apple prompts appear, and the developer logs out of Expo after the run.
2. **Repeated releases:** Convert or transfer the Expo project to an Expo Organization and invite the Account Holder's Expo user with the Developer role. This is better when the same person will help with multiple releases.
3. **Short-lived token:** Use a newly created Expo access token only for the supervised run, remove it from the terminal afterward, and revoke it immediately in the Expo dashboard. Treat the token exactly like a password.

Confirm the Expo identity before building:

```bash
npx eas-cli@latest whoami
```

Expected result: `jethro663` or an authorized member of the account that owns project `440f3e6f-ae69-495d-b391-4f4eab9d465e`.

Stop if EAS says the project belongs to another account or asks to create a different Expo project.

## Part 3: First signed TestFlight build

Run from `capstone-nest-backend/mobile`:

```bash
npx testflight
```

This uses the repository's production build and submission configuration. If that command is unavailable, use the explicit equivalent:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

During the first run:

1. Confirm the existing Expo project; do not create a replacement project.
2. Confirm bundle ID `com.nexora.lms.mobile.7A4H2D888M`.
3. The Apple Account Holder signs in personally and completes two-factor authentication.
4. Allow EAS to generate or reuse the Apple distribution certificate and App Store provisioning profile.
5. Allow EAS to create or reuse the App Store Connect API key needed for submission.
6. If EAS detects `expo-notifications` and asks for an Apple Push Notifications key, allow it to create or reuse the key.
7. Save the EAS build URL and submission URL shown by the command. These URLs are not Apple credentials.

Stop instead of guessing if any of these appear:

- The Apple team shown is not the Individual membership that owns Apple ID `6816592125`.
- The bundle ID differs by even one character.
- Apple says an agreement must be accepted. The Account Holder must open App Store Connect, accept it, and rerun the command.
- EAS proposes creating a new App Store Connect application instead of using Apple ID `6816592125`.
- Apple reports that build `56` already exists for version `0.1.55`. The developer must use Nexora's release bump process before trying again.

Successful result:

- EAS Build status becomes **Finished**.
- EAS Submit status becomes **Finished**.
- App Store Connect shows version `0.1.55`, build `56`, under TestFlight after Apple finishes processing it.

Processing is an Apple server step and can continue after the EAS submission finishes. Do not rebuild merely because the build is still processing.

## Part 4: Enable internal TestFlight testing

The Account Holder completes these steps in App Store Connect:

1. Open **Apps → Nexora → TestFlight**.
2. Wait until build `0.1.55 (56)` no longer says **Processing**.
3. Answer the export-compliance question if Apple displays it. The app config declares no non-exempt encryption because Nexora uses system HTTPS and system secure storage rather than custom encryption.
4. Complete any missing **Test Information** fields, including beta description, feedback email, and contact information.
5. Open **Internal Testing** and create a group such as `Nexora Capstone Testers` if one does not exist.
6. Add build `0.1.55 (56)` to the group.
7. Add the Account Holder or another existing App Store Connect user as an internal tester.

Internal testing is the shortest capstone route. External public-link testing adds Apple's Beta App Review and should be used only when testers cannot be added as App Store Connect users.

## Part 5: Install on the iPhone 11

On the iPhone:

1. Open the App Store and install **TestFlight** by Apple.
2. Sign in with the Apple Account that received the internal-testing invitation.
3. Open the invitation email on the iPhone and tap **View in TestFlight**, or open TestFlight if the build already appears.
4. Tap **Install** beside Nexora.
5. Wait for installation, then tap **Open**.
6. Accept notification, camera, or photo permissions only when the corresponding Nexora feature requests them.

Expected result: Nexora opens as a normal signed iOS application without Developer Mode, SideStore, LocalDevVPN, weekly refreshes, or a connected computer.

## Part 6: Physical-device test checklist

Record one continuous test video where practical and capture separate screenshots for failures.

1. **Installation evidence**
   - Show TestFlight listing Nexora `0.1.55 (56)`.
   - Show Nexora launching from the iPhone Home Screen.
2. **Authentication and backend**
   - Log in with a designated test account.
   - Confirm the correct role dashboard loads from the production backend.
   - Sign out and sign back in once to test secure session storage.
3. **Primary capstone workflow**
   - Complete the main student or teacher workflow required by the defense.
   - Confirm created or edited data appears on web and mobile when applicable.
4. **iOS-specific functions**
   - Trigger notification permission and verify a real push notification if the backend test path is available.
   - Select a photo, take a camera photo, and upload or attach a document where those actions exist.
   - Test opening and sharing a generated or downloaded file.
5. **Stability evidence**
   - Background Nexora, reopen it, and confirm the session remains usable.
   - Force-close and reopen the app.
   - Rotate the device on a screen that supports rotation.
   - Record any crash, blank screen, clipped control, keyboard obstruction, or safe-area issue with the exact screen and action.

Use test accounts and non-sensitive sample files. Do not record real student passwords, private grades, notification tokens, or Apple/Expo credentials.

## Part 7: After the first successful build

Once EAS has valid Apple credentials stored for this Expo project, the Nexora developer can normally trigger later builds without receiving the Account Holder's Apple password:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

Before every later submission:

1. Increase the shared Nexora version/build through the repository's release process.
2. Run `npm run test:ios-testflight`.
3. Commit and push the exact revision being built.
4. Save the EAS build and submission links with the capstone evidence.

The Account Holder is still required when Apple agreements change, signing credentials expire or are revoked, the Apple team changes, or App Store Connect requires new compliance information.

## Troubleshooting

### Bundle ID does not match

Expected value: `com.nexora.lms.mobile.7A4H2D888M`.

Do not create another identifier. Stop and verify that the Apple Account Holder selected the correct team and that App Store Connect Apple ID `6816592125` is visible in that account.

### No access to Expo project

Confirm the runner is authenticated to the account that owns Expo project `440f3e6f-ae69-495d-b391-4f4eab9d465e`. Do not run `eas init` or create a duplicate project.

### Apple agreement error

The Account Holder opens App Store Connect **Business** and accepts the current agreement. Retry only after Apple shows the agreement as active.

### Build succeeds but TestFlight is empty

Open the EAS submission URL. A successful build does not prove submission succeeded. If submission failed, correct that specific error and run:

```bash
npx eas-cli@latest submit --platform ios --profile production
```

Select the already completed EAS build instead of rebuilding it.

### Push notifications do not arrive

Confirm an Apple Push Notifications key exists in EAS credentials for the same Apple team and confirm the device granted notification permission. An Android notification success does not prove APNs is configured.

### A newer build is rejected as duplicate

Apple requires a new build number for every uploaded build. Do not manually change only the iOS build number because Nexora keeps Android and iOS release numbers aligned; use the repository's release bump process.
