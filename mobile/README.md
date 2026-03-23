# Nexora LMS Mobile App

React Native Expo application for the Nexora LMS platform. Supports iOS and Android.

## Features

- **Authentication**: Login, Sign Up, Email Verification, Password Recovery
- **Student Dashboard**: View courses, assignments, and progress
- **Teacher Dashboard**: Manage classes and student assignments
- **Admin Dashboard**: User management, subject and section management
- **Messaging**: Real-time messaging between users
- **Notifications**: Push notifications for important updates
- **Profile Management**: Edit user profile information

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Bottom Tab + Native Stack)
- **UI Components**: React Native Paper
- **State Management**: Context API (Auth)
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons

## Prerequisites

- Node.js 16+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)
- Expo Go app (for testing on devices)

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
# or
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the mobile directory:

```bash
cp .env.example .env
```

Edit `.env` with your backend API URL:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For physical devices, use your machine's IP address instead of localhost:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
```

### 3. Run the Application

#### Start Expo Server
```bash
npm start
# or
yarn start
```

#### Run on iOS Simulator
```bash
npm run ios
# or
expo start --ios
```

#### Run on Android Emulator
```bash
npm run android
# or
expo start --android
```

#### Run on Physical Device
1. Install Expo Go app on your device
2. Scan the QR code from the terminal with Expo Go
3. The app will start on your device

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # Context API providers
│   │   └── AuthContext.js   # Authentication context
│   ├── navigation/          # Navigation configuration
│   │   └── RootNavigator.js
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── student/        # Student screens
│   │   ├── teacher/        # Teacher screens
│   │   ├── admin/          # Admin screens
│   │   └── common/         # Common screens (Profile, Messages, etc)
│   ├── services/           # API services
│   │   ├── api.js          # Axios instance
│   │   ├── index.js        # Service methods
│   │   └── storage.js      # AsyncStorage wrapper
│   └── utils/              # Utility functions
├── App.js                  # Root component
├── app.json                # Expo configuration
├── package.json            # Dependencies
└── .env                    # Environment variables (create locally)
```

## Available Scripts

```bash
npm start           # Start Expo server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm run web         # Run on web (requires web preset)
npm test            # Run tests
npm run eject       # Eject from Expo
```

## Building for Production

### iOS Build
```bash
eas build --platform ios
```

### Android Build
```bash
eas build --platform android
```

### Signed APK/IPA
```bash
eas build --platform all
```

## Environment Variables

- `EXPO_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:3000/api)

## API Integration

The app connects to the NestJS backend. Ensure the backend is running and accessible at the configured API URL.

### Authentication Flow
1. User logs in with email/password
2. Backend returns JWT token
3. Token stored in AsyncStorage
4. Token included in all subsequent requests
5. Auto-refresh on token expiration

## Common Issues

### Build Issues
- Clear cache: `expo prebuild --clean`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### API Connection Issues
- Check backend is running on configured port
- For physical devices, ensure using correct IP address (not localhost)
- Check firewall isn't blocking connections

### Simulator/Emulator Issues
- iOS: Ensure Xcode Command Line Tools installed (`xcode-select --install`)
- Android: Ensure Android Virtual Device is running
- Restart the simulator/emulator if experiencing issues

## Troubleshooting

### Hot Reload Not Working
- Press `r` to reload the app
- Use `Ctrl+C` to stop and restart Expo

### Port Already in Use
```bash
expo start --clear
```

### Clear All Data
```bash
expo start -c
```

## Contributing

1. Create a feature branch
2. Commit changes
3. Push to branch
4. Create Pull Request

## Documentation

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [React Native Paper Docs](https://callstack.github.io/react-native-paper/)

## License

MIT
