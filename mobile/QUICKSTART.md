# Quick Start Guide

## Installation & Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd mobile
npm install
```

### Step 2: Create .env File
```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
```
REACT_APP_API_URL=http://localhost:3000/api
```

### Step 3: Start the App

**For iOS Simulator:**
```bash
npm start
# Press 'i' to open iOS simulator
```

**For Android Emulator:**
```bash
npm start
# Press 'a' to open Android emulator
```

**For Physical Device:**
1. Install Expo Go app on your phone
2. Run: `npm start`
3. Scan the QR code with Expo Go
4. App opens on your device

### Step 4: Test Login

Use these credentials to test:
- **Email**: test@example.com
- **Password**: password123

## Important Notes

⚠️ **For Physical Device Connection:**
- Replace `localhost` in `.env` with your machine's IP:
  ```
  REACT_APP_API_URL=http://192.168.1.100:3000/api
  ```
- Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Both phone and computer must be on same WiFi

## File Structure Overview

```
mobile/
├── src/
│   ├── screens/        ← Add/modify screen components here
│   ├── services/       ← API calls and async logic
│   ├── contexts/       ← Global state (auth, etc)
│   └── navigation/     ← Navigation setup
├── App.js              ← Root component
├── app.json            ← Expo config
└── package.json        ← Dependencies
```

## Common Commands

```bash
# Start development server
npm start

# Clear cache and restart
npm start -c

# Run tests
npm test

# Format code
npm run lint

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `expo start --clear` |
| Hot reload not working | Press `r` in terminal |
| Can't connect to API | Check IP address in `.env` |
| Simulator won't start | Restart Xcode or Android Studio |
| Black screen on app | Check console in Expo logs |

## Next Steps

1. Open `README.md` for full documentation
2. Check `MIGRATION_GUIDE.md` for web-to-mobile differences
3. Start building!

## Support

- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/
