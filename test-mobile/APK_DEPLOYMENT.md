# Nexora Mobile APK Handoff

## Local Backend Target

- Emulator API URL: `http://10.0.2.2:3000/api`
- Start the backend locally before running the app.
- Seeded student smoke account: `jethrojosephfida@gmail.com` / `Test@123`
- Mobile calls the Nest backend only. JA and AI features must go through backend `/ai/student/ja/*` routes.

## Emulator Smoke

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd JNovel_API_35
npm run android:emulator
```

Smoke checklist:

- Login, refresh, and logout.
- Open Dashboard, Classes, Assessments, JA, Announcements, Profile.
- Open JA Ask, select a lesson, send a message, open an existing thread.
- Open a lesson and mark blocks as understood.
- Start a quiz, answer questions, background the app once, and confirm a violation is recorded.
- Open a file-upload assessment, attach camera/gallery/document files, and submit.

## Preview APK

```powershell
npx eas build --platform android --profile preview
```

Install the downloaded APK:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r path\to\nexora-preview.apk
```

For a deployed backend, override `EXPO_PUBLIC_API_URL` in the EAS profile before building.
