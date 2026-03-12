# Nexora LMS - Betamochi App

A beautiful, Duolingo-style learning application built with React Native and Expo for the Nexora LMS platform.

## Features

- 📚 **Lessons Tab**: Browse and start lessons with progress tracking
- 📋 **Assessments Tab**: View and take assessments with difficulty levels
- 👤 **Profile Tab**: View user stats, achievements, and profile information
- 🎨 **Modern Design**: Duolingo-inspired cards, progress indicators, and animations
- 📱 **Cross-Platform**: Works on iOS, Android, and web

## Tech Stack

- **Framework**: Expo (React Native)
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **Icons**: Expo Vector Icons (Material Community Icons)
- **Styling**: React Native StyleSheet

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

### Installation

1. **Install Dependencies**
   ```bash
   cd betamochi
   npm install
   ```

2. **Copy Environment Variables**
   ```bash
   cp .env.example .env
   ```

3. **Start the App**
   ```bash
   npm start
   ```

   - Press `w` for web (Expo Go for browser)
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with your phone to open in Expo Go

### File Structure

```
betamochi/
├── src/
│   ├── components/          # Reusable components (Cards, Progress rings, etc.)
│   ├── navigation/          # Navigation structure (Bottom tabs, stacks)
│   ├── screens/             # Screen components for each tab
│   │   ├── Assessments/
│   │   ├── Lessons/
│   │   └── Profile/
│   ├── services/            # API and data services
│   ├── styles/              # Color constants and common styles
│   └── utils/               # Utility functions
├── assets/                  # App icons and images
├── App.js                   # Root component
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── .env.example             # Environment variable template
```

## Color Scheme

- **Primary Active**: `#3b82f6` (Blue) - Tab active state
- **Secondary Inactive**: `#9ca3af` (Gray) - Tab inactive state
- **Accent**: `#dc2626` (Red) - Highlights and CTAs
- **Background**: `#ffffff` (White) - Main background
- **Text Primary**: `#1f2937` (Dark Gray) - Main text
- **Text Secondary**: `#6b7280` (Light Gray) - Secondary text

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run web` - Run in web browser
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm test` - Run Jest tests

## Features Walkthrough

### Assessments Tab
- View all available assessments
- See difficulty level (Easy, Medium, Hard)
- Track completion percentage
- View due dates
- Tap to start assessments

### Lessons Tab
- Featured "Continue Learning" section
- Browse all available lessons
- Visual progress indicators
- Filter by category/difficulty
- Tap to view and start lessons

### Profile Tab
- User profile information
- Statistics (lessons completed, streak, XP)
- Achievement badges
- Settings and logout

## Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Offline synchronization with AsyncStorage
- [ ] Push notifications
- [ ] Advanced progress analytics
- [ ] Lesson video playback
- [ ] Assessment result detailed analysis
- [ ] Social features (leaderboards, friend challenges)
- [ ] Native app deployment (TestFlight, Google Play)

## Development

### Adding a New Screen

1. Create screen file in `src/screens/[Tab]/[ScreenName].js`
2. Import in navigation file
3. Add to appropriate navigator

### Adding a New Component

1. Create component file in `src/components/[ComponentName].js`
2. Use common styles from `src/styles/commonStyles.ts`
3. Import colors from `src/styles/colors.ts`

### Updating Colors

Edit `src/styles/colors.ts` to maintain consistency across the app.

## License

MIT

## Support

For issues or questions, contact the Nexora team.
