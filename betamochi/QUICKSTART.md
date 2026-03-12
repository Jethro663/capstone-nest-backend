# Nexora LMS - Betamochi App - Quick Start Guide

## 🚀 Getting Started

This is a beautiful, Duolingo-style React Native learning app built with Expo. Follow these steps to get up and running!

### Step 1: Install Dependencies

```bash
cd betamochi
npm install
```

This will install all required packages including:
- React Navigation (bottom tabs + stack navigation)
- Expo and React Native
- Material Community Icons
- And more!

### Step 2: Start the Development Server

```bash
npm start
```

You'll see a QR code in the terminal. Choose how you want to view the app:

**Option A: Web Browser (Easiest)**
- Press `w` to open in web browser
- On Windows/Mac, this opens Expo Go in your browser automatically
- You'll see the app running with full navigation!

**Option B: Mobile Device**
- Download **Expo Go** from App Store (iOS) or Google Play (Android)
- Press `a` for Android emulator or `i` for iOS simulator
- Or scan the QR code with your phone to open in Expo Go

**Option C: Android Emulator**
- Press `a` (requires Android Studio and emulator setup)

### Step 3: Navigate the App

Once running, explore the three main tabs:

1. **Assessments Tab** 📋
   - View all assessments with difficulty levels
   - Track your progress on each assessment
   - See completion percentages and due dates
   - Tap a card to view detailed assessment info

2. **Lessons Tab** 📚
   - Browse lessons by difficulty (Easy, Medium, Hard)
   - See "Continue Learning" featured section
   - Track your progress on each lesson
   - Filter by difficulty or "In Progress"

3. **Profile Tab** 👤
   - View your stats (streak, XP, lessons completed)
   - See your achievements and badges
   - Access account settings and help
   - Logout option

## 📱 Features

✨ **Duolingo-Inspired Design**
- Beautiful card-based layouts
- Smooth progress indicators
- Color-coded difficulty levels
- Polished shadows and rounded corners

🎨 **Color Scheme**
- Primary (Active): `#3b82f6` (Blue)
- Secondary (Inactive): `#9ca3af` (Gray)
- Accent: `#dc2626` (Red for CTAs)
- Success: `#10b981` (Green)

📊 **Mock Data Included**
- 4 sample assessments
- 6 sample lessons
- Complete user profile with stats and badges
- Ready to replace with real API data

## 🔧 Development

### Project Structure

```
betamochi/
├── src/
│   ├── components/          # Reusable components
│   │   ├── AssessmentCard.js
│   │   ├── LessonCard.js
│   │   ├── StatCard.js
│   │   ├── ProgressRing.js
│   │   └── BadgeItem.js
│   ├── navigation/
│   │   └── RootNavigator.js # Bottom tabs + stacks
│   ├── screens/
│   │   ├── Assessments/
│   │   ├── Lessons/
│   │   └── Profile/
│   ├── services/
│   │   └── mockData.js      # Mock data + API functions
│   └── styles/
│       ├── colors.ts        # Color constants
│       └── commonStyles.ts  # Reusable styles
├── App.js                   # Root component
├── app.json                 # Expo config
└── package.json             # Dependencies
```

### Customizing Colors

Edit `src/styles/colors.ts`:

```javascript
export const colors = {
  primary: '#3b82f6',      // Change active tab color here
  secondary: '#9ca3af',    // Change inactive tab color here
  accent: '#dc2626',       // Change button/CTA color here
  // ... more colors
};
```

All components will automatically use the new colors!

### Connecting to Real API

Replace mock data calls in screens with real API calls:

**In AssessmentsScreen.js:**
```javascript
// Instead of:
const data = await getAssessments();

// Use:
const data = await axios.get('/api/assessments');
```

The mock data service (`src/services/mockData.js`) provides the expected data structure to guide your API integration.

### Adding New Screens

1. Create screen file: `src/screens/[Tab]/[ScreenName].js`
2. Import in navigation: `src/navigation/RootNavigator.js`
3. Add to appropriate stack navigator

Example:
```javascript
import YourNewScreen from '../screens/Assessments/YourNewScreen';

// In AssessmentsStackNavigator:
<AssessmentsStack.Screen
  name="YourNewScreen"
  component={YourNewScreen}
  options={{ title: 'Your Screen Title' }}
/>
```

## 🎯 Next Steps

1. **API Integration**: Replace mock data with actual backend API calls
2. **Authentication**: Add login/logout functionality
3. **Offline Sync**: Add AsyncStorage for offline lesson caching
4. **Push Notifications**: Set up notifications for due assessments
5. **Analytics**: Track user engagement and progress
6. **Testing**: Add Jest + React Native Testing Library tests
7. **Deployment**: Build and publish to TestFlight (iOS) and Google Play (Android)

## 📚 Useful Resources

- **React Navigation Docs**: https://reactnavigation.org/
- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **Material Community Icons**: https://materialdesignicons.com/

## 🐛 Troubleshooting

**"Module not found" error?**
- Try: `npm install` again
- Clear cache: `expo start --clear`

**Hot reload not working?**
- Disable Fast Refresh: Menu → Disable Fast Refresh
- Or restart with `npm start`

**Colors not updating?**
- Restart the development server
- Hard reload: Press `r` in the terminal

**Port 8081 already in use?**
- Kill process: `npx kill-port 8081`
- Or use different port: `expo start --port 8082`

## 📞 Support

For issues or questions:
1. Check the React Navigation docs
2. Search Expo Community Slack
3. Review the code comments in this app
4. Ask in the Nexora team chat

---

**Happy Learning! 🎉**

Made with ❤️ for Nexora LMS
