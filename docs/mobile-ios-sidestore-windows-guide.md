# Install and Test Nexora on iPhone with SideStore

This guide is for the designated Nexora tester using:

- an iPhone 11 running iOS 26.5;
- a 64-bit Windows computer;
- a USB data cable; and
- Wi-Fi with working internet access.

Follow the parts in order. Do not skip the first SideStore refresh.

## What this installs

The Nexora team builds the iPhone application on GitHub's macOS builder. The downloaded file is named `Nexora-iOS-latest-unsigned.ipa`. It does not contain an Apple signing certificate.

SideStore signs that IPA on your iPhone with your own free Apple development certificate. The signature normally lasts seven days. Refreshing the app through SideStore before it expires renews the signature without rebuilding Nexora.

This method provides a real Nexora Release application on a physical iPhone. It is not an App Store or TestFlight installation. Do not claim that it proves App Store review, TestFlight distribution, or remote Apple Push Notification service delivery.

Use these three official sources if a screen has changed since this guide was written:

- [SideStore prerequisites](https://docs.sidestore.io/docs/installation/prerequisites)
- [SideStore installation](https://docs.sidestore.io/docs/installation/install)
- [SideStore FAQ](https://docs.sidestore.io/docs/faq)

## Before starting

Prepare all of these items before installing anything:

1. Ask the iPhone owner to remain present. The owner must approve Face ID, the device passcode, computer trust, VPN configuration, profile trust, and Developer Mode when iOS requests them.
2. Charge the iPhone to at least 50% and keep at least 2 GB of free storage. Check storage at **Settings → General → iPhone Storage**.
3. Connect the Windows computer and iPhone to normal Wi-Fi. A cellular-only connection is not sufficient for SideStore installation and refresh.
4. Use a cable that transfers data. A working cable causes Windows/iTunes to detect the iPhone and causes **Trust This Computer?** to appear on the phone.
5. Prepare an Apple Account that the tester controls. A separate account used only for sideload testing is recommended. It does not have to be the Apple Account already signed into the iPhone.
6. Prepare Nexora student, teacher, and administrator test accounts. Receive those credentials privately from the project owner; they are not included in the IPA or this guide.
7. Confirm the Apple Account has room for Nexora. A free account allows three active sideloaded apps at once, including SideStore, and ten different App IDs in a seven-day period. SideStore plus Nexora use two of the three active-app slots.

### Privacy rule

Do not send anyone your Apple Account password, two-factor authentication code, iPhone passcode, pairing file, or Nexora passwords. Do not upload screenshots or videos containing real student names, grades, messages, email addresses, access tokens, or notification content. Use demonstration accounts and demonstration records for capstone evidence.

## Part 1 — Verify 64-bit Windows

Current iLoader releases do not support 32-bit Windows. Verify the computer before downloading it.

1. Press **Windows + I** to open Settings.
2. Select **System**.
3. Scroll down and select **About**.
4. Find **System type** under Device specifications.
5. Continue only when it says **64-bit operating system**.

Expected result: Windows reports a 64-bit operating system, normally with an x64-based processor.

If it says **32-bit operating system**, stop. Use another 64-bit Windows computer. If it is Windows 10 on an ARM processor, stop and use another computer because that combination is not supported by the current SideStore prerequisite guide.

## Part 2 — Install LocalDevVPN

LocalDevVPN creates an on-device connection that SideStore needs while installing or refreshing apps. It does not replace a normal internet connection.

1. On the iPhone, open this official App Store link: [LocalDevVPN](https://apps.apple.com/app/localdevvpn/id6755608044).
2. Confirm the app name is **LocalDevVPN** and the developer is **Coxson Engineering LLC**.
3. Tap **Get**.
4. Let the iPhone owner approve Face ID or enter the required App Store credentials.
5. Open LocalDevVPN after installation.
6. Tap **Connect**.
7. When iOS asks to add a VPN configuration, tap **Allow**.
8. Let the owner approve the requested passcode or Face ID.
9. Confirm that LocalDevVPN shows a connected state or that a VPN indicator appears in Control Center.
10. Leave LocalDevVPN connected for the remaining setup steps. If an iPhone restart disconnects it later, reconnect it before the first SideStore refresh.

Expected result: LocalDevVPN is installed and shows a connected state.

If no VPN prompt appears, open **Settings → General → VPN & Device Management → VPN** and check whether LocalDevVPN is listed. If it is missing, reopen LocalDevVPN and tap Connect again. Do not install a similarly named VPN from an unofficial website.

## Part 3 — Install iTunes and iLoader

Perform this part on the Windows computer.

### Install Apple's device components

1. Open the official [SideStore prerequisites page](https://docs.sidestore.io/docs/installation/prerequisites).
2. Expand or scroll to the Windows instructions.
3. Use its official iTunes link. SideStore currently recommends the version downloaded directly from Apple; the Microsoft Store version is an allowed fallback.
4. Install iTunes and every included Apple device-support component using the default settings.
5. Restart Windows after installation.
6. Open iTunes once and accept its first-launch prompts.

Expected result: iTunes opens without an installation error.

If iTunes will not install or later cannot see the iPhone, uninstall only iTunes and its Apple device-support components, restart Windows, and try the alternate official iTunes source shown in the SideStore prerequisites. Do not download modified iTunes packages.

### Install iLoader

1. Download the official stable 64-bit Windows MSI: [iLoader Windows x64](https://github.com/nab138/iloader/releases/latest/download/iloader-windows-x64.msi).
2. Confirm the browser address begins with `https://github.com/nab138/iloader/`.
3. Open the downloaded MSI.
4. Follow the installer using its default destination and options.
5. Do not disable Windows Defender or another antivirus program to force installation. If security software identifies the file as malware rather than merely showing an unknown-publisher warning, stop and compare the link with the SideStore prerequisites page.
6. Finish the installation and open iLoader.

Expected result: iLoader opens and shows its device/installation interface.

If the MSI is unavailable, return to the SideStore prerequisites page and use its current **MSI (recommended)** link. Do not use a mirror, chat attachment, or repackaged installer.

## Part 4 — Install SideStore Stable

The iPhone owner must be present for this part.

1. Unlock the iPhone and leave it on the Home Screen.
2. Confirm LocalDevVPN still says **Connected**. Leave it connected.
3. Connect the iPhone to Windows with the USB data cable.
4. If the iPhone asks **Trust This Computer?**, tap **Trust** and enter the device passcode.
5. Open iTunes and wait for the small iPhone/device button to appear.
6. If iTunes asks whether to trust or continue with this iPhone, approve it on Windows and approve the matching prompt on the iPhone.
7. Close iTunes after the iPhone appears successfully. Leave the cable connected.
8. Open iLoader.
9. Sign in inside iLoader with the dedicated sideload-testing Apple Account. Apple Account text is case-sensitive. Type the credentials yourself; do not send them to the Nexora team.
10. Enter the Apple two-factor authentication code if Apple sends one.
11. Select the connected iPhone. Check that the displayed device is the intended iPhone 11.
12. Select **Install SideStore (Stable)**. Do not choose a nightly or experimental build.
13. Keep the iPhone unlocked and connected until iLoader reports completion.
14. Check the iPhone Home Screen or App Library for **SideStore**.

Expected result: iLoader reports a successful installation and SideStore appears on the iPhone.

If iLoader does not list the phone, return to iTunes and confirm that iTunes can see it. Try another USB port, unlock and reconnect the iPhone, and approve Trust again. Do not continue until iLoader shows the correct device.

If Apple rejects the login, verify the account by signing in at [account.apple.com](https://account.apple.com/) in a normal browser. Complete any account-verification prompt, then retry iLoader. Never paste the credentials into a third-party support chat.

## Part 5 — Trust SideStore and Enable Developer Mode

Do these steps on the iPhone immediately after iLoader finishes.

### Trust the personal developer profile

1. Open **Settings**.
2. Select **General**.
3. Select **VPN & Device Management**.
4. Under **Developer App**, tap the entry showing the Apple Account used in iLoader.
5. Because this iPhone runs iOS 26.5, tap **Allow & Restart**.
6. Enter the iPhone passcode to confirm. There is no legitimate bypass for this owner-controlled approval.
7. Wait for the iPhone to restart, then let the owner unlock it.

Expected result: the Apple Account profile is shown as trusted and SideStore no longer displays an Untrusted Developer message.

### Enable Developer Mode

1. Open **Settings**.
2. Select **Privacy & Security**.
3. Scroll to the bottom and select **Developer Mode**.
4. Turn **Developer Mode** on.
5. Tap **Restart** when requested.
6. After the restart, unlock the phone.
7. When iOS asks to confirm Developer Mode, tap **Turn On**.
8. Let the owner approve Face ID or enter the passcode.

Expected result: **Settings → Privacy & Security → Developer Mode** is on, and SideStore can open.

If Developer Mode is missing, confirm that SideStore was installed first, reconnect the iPhone to Windows, open iLoader, and reinstall SideStore Stable. Restart the iPhone and check the setting again.

## Part 6 — First SideStore refresh

This refresh is mandatory. Do it before importing Nexora.

1. Confirm the iPhone is connected to Wi-Fi, not cellular data alone.
2. Open LocalDevVPN.
3. Tap **Connect** and leave it connected.
4. Open SideStore.
5. Sign in with the same Apple Account used in iLoader.
6. Enter an Apple two-factor code if requested.
7. Open **My Apps**.
8. Find SideStore and tap the **7 DAYS** counter beside it.
9. If SideStore asks to revoke an old signing certificate or create a new one, choose **Yes**, **Refresh Now**, or the affirmative option.
10. Wait without closing SideStore or LocalDevVPN.
11. Confirm SideStore returns to **7 DAYS** remaining.

Expected result: SideStore opens normally and shows seven days remaining after the refresh.

Do not install Nexora until this result appears. If the refresh fails, read the exact error, keep LocalDevVPN connected, and retry once. If the same error repeats, use the matching item in Troubleshooting below.

## Part 7 — Install Nexora

Keep LocalDevVPN connected during installation.

1. On the iPhone, open Safari.
2. Open the stable release page: [Nexora iOS SideStore release](https://github.com/Jethro663/capstone-nest-backend/releases/tag/ios-sidestore-latest).
3. Read the release title and confirm it names **Nexora iOS SideStore**.
4. Under **Assets**, tap `Nexora-iOS-latest-unsigned.ipa`.
5. If Safari asks whether to download the file, tap **Download**.
6. Wait for Safari's download indicator to finish.
7. Open the Files app.
8. Select **Browse → Downloads**. Depending on Safari settings, Downloads may be under **iCloud Drive** or **On My iPhone**.
9. Confirm the filename still ends in `.ipa`. Do not extract it; an IPA is intentionally a ZIP-formatted package internally.
10. Open SideStore and select **My Apps**.
11. Tap the **+** button.
12. Browse to Downloads and select `Nexora-iOS-latest-unsigned.ipa`.
13. Keep SideStore in the foreground. Keep LocalDevVPN connected. Do not lock the phone during signing and installation.
14. Approve the installation if SideStore asks.
15. Wait until **Nexora Mobile** appears in My Apps with **7 DAYS** remaining.
16. Return to the Home Screen and confirm the Nexora icon appears.

Expected result: Nexora Mobile appears both in SideStore My Apps and on the iPhone Home Screen, with seven days remaining.

If Safari downloads a ZIP instead of an IPA, confirm it came from the exact release link. In Files, long-press the file, select **Rename**, and restore the final extension from `.zip` to `.ipa`; do not decompress it. If the downloaded name or source is uncertain, delete that download and download the IPA again from the release page.

## Part 8 — First launch checks

These checks prove that Nexora is standalone and does not depend on the development computer.

1. Disconnect the USB cable from the iPhone.
2. Disconnect LocalDevVPN. Nexora does not need it during ordinary use.
3. Keep ordinary Wi-Fi or cellular internet enabled.
4. Tap **Nexora Mobile** on the Home Screen.
5. Allow up to 30 seconds for the first cold launch.
6. Confirm that Nexora reaches its login/campus screen without showing a Metro, development-server, or JavaScript-bundle error.
7. Confirm that the campus/server status becomes available.
8. Sign in with one designated demonstration account.
9. Grant photo, camera, document, or notification permissions only when the matching test reaches that feature.
10. Record the app version and build shown by Nexora. Compare it with `Nexora-iOS-latest-metadata.txt` on the GitHub release.

Expected result: Nexora starts while disconnected from Windows and reaches the production service over HTTPS.

If Nexora reports a server problem, open [the public backend liveness endpoint](https://capstone-backend-v2-production.up.railway.app/api/health/live) in Safari. If that page also fails, record the time and report a backend/connectivity problem. If Safari succeeds but Nexora fails, record the Nexora screen and reproduction steps.

## Part 9 — Physical-device test checklist

Use demonstration data. Mark every row Pass, Fail, Blocked, or Not Applicable. A failure needs a screen recording or screenshot plus exact reproduction steps.

### Installation and startup

- [ ] Nexora installs through SideStore without a Mac or paid Apple Developer membership.
- [ ] SideStore and Nexora each show seven days remaining.
- [ ] Nexora cold-launches with Windows disconnected and LocalDevVPN off.
- [ ] The Nexora icon, launch screen, status bar, and first screen render correctly.
- [ ] The app reports the expected semantic version and iOS build number.
- [ ] No Android APK installer, unknown-source permission, or Android update gate appears on iOS.

### Authentication and session

- [ ] A student account can sign in and reaches the student workspace.
- [ ] A teacher account can sign in and reaches the teacher workspace.
- [ ] An administrator account can sign in and reaches the administrator workspace.
- [ ] Wrong credentials show a clear error without closing the app.
- [ ] Moving the app to the background and returning preserves the signed-in session.
- [ ] Force-closing and reopening restores the session appropriately.
- [ ] Logout removes the session and returns to login.

### Navigation and layout

- [ ] Every visible bottom tab opens for each role.
- [ ] Back buttons return to the expected previous screen.
- [ ] No button or text is hidden beneath the notch, status bar, Home indicator, keyboard, or bottom tabs.
- [ ] Long pages scroll to their final control or record.
- [ ] Portrait and landscape orientations do not trap the user or hide required controls.
- [ ] Larger text under **Settings → Accessibility → Display & Text Size → Larger Text** remains readable without blocking required actions.

### Data-backed role flows

- [ ] Student: open a current class and one real assignment or assessment record.
- [ ] Student: view notifications/profile and return without stale or blank data.
- [ ] Teacher: open a class, roster/class record, and one assessment or content workflow.
- [ ] Teacher: perform one safe demonstration mutation and confirm the updated data appears.
- [ ] Administrator: open the mobile operations workspace and one data-backed administrative screen.
- [ ] Administrator: perform one safe demonstration action permitted by the project owner and verify its result.

### Native and content behavior

- [ ] The keyboard opens, Next/Done controls work, entered text remains visible, and submitting dismisses the keyboard when expected.
- [ ] Date/time pickers and other iOS modals open, confirm, and cancel correctly.
- [ ] Photo selection requests permission and returns the selected demonstration image.
- [ ] Camera capture requests permission and returns a demonstration image when the tested flow supports camera capture.
- [ ] Document selection opens Files and returns a harmless demonstration document.
- [ ] Share opens the iOS share sheet without crashing.
- [ ] Rich text, assessment content, and WebView content render without raw HTML or blank regions.
- [ ] Local notification permission and in-app notification behavior work when the relevant feature triggers them.
- [ ] Remote APNs delivery is marked **Not Tested — unavailable with this free personal-signing path**.

### Lifecycle and resilience

- [ ] Turn Airplane Mode on while viewing data; Nexora shows a recoverable network state rather than crashing.
- [ ] Turn Airplane Mode off; retry and confirm data loads without reinstalling.
- [ ] Send Nexora to the background for two minutes; return and confirm navigation/session state remains usable.
- [ ] Lock and unlock the iPhone while Nexora is open; confirm the app resumes safely.
- [ ] Force-close Nexora and reopen it; confirm the embedded Release bundle starts without Metro.

### Assessment security

- [ ] Open an assessment-taking screen and start iOS screen recording.
- [ ] Confirm Nexora's intended screen-capture protection blocks or obscures protected assessment content.
- [ ] Record this protected flow using a second camera pointed at the iPhone.
- [ ] Exit the assessment and confirm ordinary screen capture becomes available again where allowed.

## Part 10 — Record capstone evidence

### Record ordinary flows on the iPhone

1. Open **Settings → Control Center**.
2. Add **Screen Recording** if it is not already present.
3. Open Control Center by swiping down from the upper-right corner.
4. Press and hold the Screen Recording button.
5. Turn the microphone on only when spoken narration is required and the room contains no private conversation.
6. Tap **Start Recording** and wait for the countdown.
7. Perform one bounded flow. Keep each video focused on one role or feature.
8. Stop recording from the red recording indicator or Control Center.
9. Open Photos and play the video once to confirm it is readable and complete.

### Record protected assessment flows

Nexora intentionally prevents capture on assessment-taking screens. Use a second phone or camera to record the physical iPhone, including the attempt to start screen recording and the protected result. This is evidence that the control works; do not remove or bypass it.

### Name and log evidence

Use filenames like:

```text
2026-09-12_iPhone11_iOS26.5_Nexora-0.1.34-b3_student-login.mov
2026-09-12_iPhone11_iOS26.5_Nexora-0.1.34-b3_teacher-class.mov
2026-09-12_iPhone11_iOS26.5_Nexora-0.1.34-b3_assessment-capture-protection.mov
```

Use the real version/build shown in the current release instead of copying the example when it changes.

Maintain this evidence table:

| Timestamp | Device | iOS | Nexora version/build | Source SHA | Role | Flow | Result | Evidence filename |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD HH:MM PHT | iPhone 11 | 26.5 | Copy from metadata | Copy from metadata | student/teacher/admin | Exact flow | Pass/Fail/Blocked | Filename |

Before sharing a recording, pause on every frame containing user data and crop, blur, or repeat the test with demonstration data if private information is visible.

## Part 11 — Refresh before seven days

Refresh at least once every six days. Do not wait until both apps have expired.

1. Connect the iPhone to Wi-Fi.
2. Open LocalDevVPN and tap **Connect**.
3. Open SideStore.
4. Select **My Apps**.
5. Tap **Refresh All**, or tap the remaining-days counter beside SideStore and then Nexora.
6. Keep SideStore and LocalDevVPN open until both operations finish.
7. Confirm both SideStore and Nexora return to **7 DAYS**.
8. Disconnect LocalDevVPN after refresh.
9. Launch Nexora once to confirm it still opens and retained its session/data.

Expected result: both counters return to seven days without reinstalling Nexora.

If SideStore has already expired and will not open, reconnect the phone to the Windows computer and use iLoader to install SideStore Stable again with the same Apple Account. Do not delete Nexora first. After SideStore opens, connect LocalDevVPN and refresh SideStore and Nexora.

## Troubleshooting

### “Trust This Computer?” does not appear

1. Unlock the iPhone and leave it on the Home Screen.
2. Disconnect and reconnect the cable.
3. Try a different USB port and avoid an unpowered USB hub.
4. Confirm the phone charges and appears in iTunes.
5. If the phone previously rejected this computer, ask the owner before using **Settings → General → Transfer or Reset iPhone → Reset → Reset Location & Privacy**. This resets privacy prompts for applications; it does not erase the phone, but the owner must approve it.

### iPhone is absent in iLoader

1. Close iLoader.
2. Open iTunes and confirm the device button appears.
3. Approve trust prompts on both Windows and iPhone.
4. Close iTunes and reopen iLoader.
5. Restart Windows if Apple Mobile Device support still does not detect the phone.

### SideStore is absent after iLoader says complete

1. Search the iPhone App Library for SideStore.
2. Wait 30 seconds and check again.
3. Check **Settings → General → VPN & Device Management** for the developer profile.
4. If neither app nor profile exists, reconnect to iLoader and repeat **Install SideStore (Stable)**.

### “Untrusted Developer” appears

Open **Settings → General → VPN & Device Management → Developer App → [Apple Account]**, then choose Trust or Allow & Restart. The owner must approve the action.

### Developer Mode is absent

Install SideStore first. Reconnect the phone to iLoader, reinstall Stable, restart the iPhone, and check **Settings → Privacy & Security** again.

### Apple Account or anisette login fails

1. Verify the Apple Account at `account.apple.com`.
2. Complete any Apple security prompt.
3. Confirm date/time are automatic on Windows and iPhone.
4. Retry after 10 minutes if SideStore reports temporary anisette downtime.
5. Use only an official anisette server offered by the stable SideStore build. Do not paste credentials into a support message or use a random server URL.

### Three-app or ten-App-ID limit appears

A free Apple Account permits only three active sideloaded apps, including SideStore, and ten different App IDs per seven-day period. Remove an unused sideloaded application—not an ordinary App Store app—or wait for old App IDs to expire. Do not use exploit-based limit bypasses on the test device.

### LocalDevVPN will not connect

1. Confirm Wi-Fi is connected.
2. Force-close and reopen LocalDevVPN.
3. Open **Settings → General → VPN & Device Management → VPN** and confirm its configuration exists.
4. Restart the iPhone and connect LocalDevVPN again.
5. Do not continue installation while it reports disconnected.

### Pairing file expired

This can happen after an iOS update, reset, or unexpected invalidation. Connect the iPhone to Windows again, approve Trust, open iLoader, and reinstall SideStore Stable. Then repeat the first SideStore refresh.

### IPA integrity or download problem

The Nexora team verifies the public bytes before handoff. If you need to verify them independently on Windows:

1. Download the IPA and its `.sha256` file from the release page.
2. Open Command Prompt in the download folder.
3. Run:

```bat
certutil -hashfile Nexora-iOS-latest-unsigned.ipa SHA256
```

4. Compare the displayed hash with the first value in `Nexora-iOS-latest-unsigned.ipa.sha256`.
5. If any character differs, delete the IPA and download it again. Do not install mismatched bytes.

### SideStore cannot install the IPA

1. Confirm LocalDevVPN is connected.
2. Confirm SideStore itself shows seven days remaining.
3. Confirm the file ends in `.ipa` and was not decompressed.
4. Confirm a free app slot remains.
5. Delete only the failed download, download it again, and retry once.
6. Record the exact SideStore error code if the retry fails.

### Nexora closes immediately

1. Do not delete the app.
2. Record the version/build and SideStore days remaining.
3. Restart the iPhone and launch Nexora again.
4. Record the screen and the exact action that precedes the close.
5. Send only that sanitized evidence to the Nexora team.

### Nexora cannot reach the production service

1. Confirm ordinary Wi-Fi or cellular internet works in Safari.
2. Disconnect LocalDevVPN; it is unnecessary for ordinary Nexora usage.
3. Open the [backend liveness endpoint](https://capstone-backend-v2-production.up.railway.app/api/health/live).
4. If it fails in Safari, record the time and network name and retry on another network.
5. If it works in Safari but not Nexora, capture the Nexora campus-status details and reproduction steps.

### Certificate expired

If SideStore opens, connect LocalDevVPN and refresh SideStore and Nexora. If SideStore does not open, reinstall SideStore Stable through iLoader with the same Apple Account, then refresh both apps. Do not delete Nexora before attempting recovery.

## Update to a newer Nexora build

The release page and filename remain the same while the version/build metadata changes.

1. Refresh SideStore and confirm it shows seven days.
2. Connect LocalDevVPN.
3. Open the [stable Nexora release page](https://github.com/Jethro663/capstone-nest-backend/releases/tag/ios-sidestore-latest) in Safari.
4. Read the new version/build in the release title.
5. Download `Nexora-iOS-latest-unsigned.ipa` again.
6. Import the IPA through SideStore without deleting the existing Nexora installation.
7. Wait until SideStore finishes replacing the application.
8. Open Nexora and confirm the new version/build.
9. Repeat the installation/startup, authentication/session, and one data-backed flow for every role.

Expected result: Nexora updates under the same app identity and retains local app data. If the update fails, keep the existing app and report the SideStore error before deleting anything.

## Remove SideStore and Nexora

Deleting Nexora removes its local secure storage, cached content, and session data. Upload or preserve only approved, non-private evidence before cleanup.

1. On the iPhone Home Screen, press and hold Nexora Mobile.
2. Choose **Remove App → Delete App**.
3. Press and hold SideStore and choose **Remove App → Delete App**.
4. Delete LocalDevVPN if the owner no longer needs it.
5. Open **Settings → General → VPN & Device Management**.
6. Select the personal developer profile and remove it if it is used only for this test.
7. Remove the LocalDevVPN configuration if iOS did not remove it with the app.
8. On Windows, delete any pairing file that was manually exported or saved for this SideStore setup.
9. Uninstall iLoader from **Settings → Apps → Installed apps** if it is no longer needed.
10. Keep or uninstall iTunes according to the owner's preference.
11. Review the dedicated Apple Account at `account.apple.com` and sign out of sessions the owner does not recognize. Do not change the password solely because normal SideStore signing created a temporary development session.

Expected result: Nexora, SideStore, their personal developer profile, LocalDevVPN configuration, and any saved pairing material are removed from the tester's devices.
