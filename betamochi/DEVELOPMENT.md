# Nexora LMS - Betamochi App Development Notes

## Repository Overview

This is a **React Native + Expo** mobile learning application styled after Duolingo, built for the Nexora LMS platform.

### Tech Stack
- **Framework**: Expo (React Native v0.81.5)
- **Navigation**: React Navigation v6+ (Bottom Tabs + Native Stack)
- **Icons**: Material Community Icons via @expo/vector-icons
- **HTTP**: Axios for API calls
- **State**: React Hooks + Context API (extensible to Redux/Zustand)
- **Styling**: React Native StyleSheet (CSS-in-JS)

### Why Expo?
- ✅ Zero-configuration setup
- ✅ Live reload and instant preview
- ✅ Web, iOS, Android from same codebase
- ✅ Built-in mobile optimizations
- ✅ EAS builds for distribution (optional)

### Color System
The app uses a professional color palette:
- **Primary Active**: #3b82f6 (Blue Tailwind)
- **Secondary Inactive**: #9ca3af (Gray Tailwind)
- **Accent**: #dc2626 (Red for CTAs)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)

All colors are centralized in `src/styles/colors.ts` for easy theming.

### Design Philosophy
The app mimics **Duolingo's** design principles:
1. **Card-Based Layouts**: Clear, tappable cards for lessons/assessments
2. **Progress Visualization**: Circles, bars, and percentages
3. **Soft Shadows**: 8px blur radius, low opacity for depth
4. **Rounded Corners**: 16-24px border-radius for friendliness
5. **Icons**: 24-32px sizes for clarity
6. **Spacing**: 8px grid system for consistency
7. **Typography**: 5-level heading hierarchy + body text styles

### Key Features Implemented

#### 1. Bottom Navigation (3 Tabs)
```
┌─────────────────────────────────┐
│   ASSESSMENTS | LESSONS | PROFILE │
│  (Tab content area)              │
│                                  │
├─────────────────────────────────┤
│  [ICON] Assessments │ [ICON] Lessons │ [ICON] Profile │
└─────────────────────────────────┘
```
- Smooth transitions between tabs
- Active indicator (color: #3b82f6)
- Icons from Material Community Icons

#### 2. Assessments Tab
- **List View**: Card layout showing all assessments
- **Cards Display**: Title, subject, difficulty, progress %, due date, time limit
- **Difficulty Badges**: Easy (green), Medium (amber), Hard (red)
- **Progress Bar**: Visual completion percentage
- **Detail Screen**: Full assessment info with instructions
- **Mock Data**: 4 sample assessments (Easy to Hard)

#### 3. Lessons Tab
- **Featured Section**: "Continue Learning" highlighted card
- **Grid Layout**: 2-column responsive card grid
- **Filter Tabs**: All, Easy, Medium, Hard, In Progress
- **Card Elements**: Emoji thumbnail, title, progress ring, duration
- **Detail Screen**: Progress visualization, learning outcomes, tips
- **Lock Indicator**: Visual indicator for locked lessons
- **Mock Data**: 6 sample lessons with varying progress

#### 4. Profile Tab
- **Profile Header**: Avatar, name, email, level badge
- **Quick Stats**: 4 stat cards (streak, XP, lessons, assessments)
- **Detailed Stats**: Monthly breakdown with icons
- **Achievements**: 6 sample badges with rarity tiers
- **Account Actions**: Help, notifications, privacy settings
- **Logout Button**: Logout action

### Component Breakdown

#### Reusable Components (src/components/)
1. **AssessmentCard.js** - Assessment card with progress and CTA
2. **LessonCard.js** - Lesson card with thumbnail, progress, difficulty
3. **StatCard.js** - Stat display card (border-top colored accent)
4. **ProgressRing.js** - SVG circular progress indicator
5. **BadgeItem.js** - Achievement badge with rarity tier

#### Styles (src/styles/)
1. **colors.ts** - 25+ color constants (primary, secondary, semantic, difficulty)
2. **commonStyles.ts** - 60+ reusable StyleSheet definitions
   - Container styles
   - Typography (heading1-4, body, label)
   - Button variants (primary, secondary, accent, small)
   - Cards (normal, compact, highlight)
   - Layout utilities (row, column, flex)
   - Spacing constants (xs=4, sm=8, md=12, lg=16, xl=24, xxl=32)
   - Border radius constants (sm=8, md=12, lg=16, xl=24, full=9999)

#### Navigation (src/navigation/)
1. **RootNavigator.js** - Main entry point
   - Bottom Tab Navigator (Assessments, Lessons, Profile)
   - 3 Stack Navigators for detail routes
   - Header styling matching app theme

#### Screens (src/screens/)
1. **Assessments/**
   - AssessmentsScreen.js - List with stats overview
   - AssessmentDetailScreen.js - Full assessment details
2. **Lessons/**
   - LessonsScreen.js - Grid with continued section + filters
   - LessonDetailScreen.js - Lesson details + syllabus
3. **Profile/**
   - ProfileScreen.js - Profile + stats + achievements

#### Services (src/services/)
1. **mockData.js** - 
   - Mock arrays for assessments, lessons, user profile
   - Helper functions: getAssessments(), getLessons(), getUserProfile()
   - Utility functions: getDifficultyColor(), getDifficultyEmoji()
   - Ready for API integration

### Data Structures

#### Assessment Object
```javascript
{
  id: 1,
  title: 'Basic English Grammar',
  subject: 'English',
  difficulty: 'Easy', // Easy | Medium | Hard
  description: '...',
  totalQuestions: 10,
  completedQuestions: 7,
  dueDate: '2026-03-20',
  isCompleted: false,
  score: null,
  timeLimit: 15, // minutes
}
```

#### Lesson Object
```javascript
{
  id: 1,
  title: 'Introduction to Literature',
  subject: 'English',
  difficulty: 'Easy',
  description: '...',
  duration: 12, // minutes
  progress: 100, // 0-100%
  isCompleted: true,
  isContinued: false, // Is this the current lesson?
  thumbnail: '📚', // Emoji
}
```

#### User Profile Object
```javascript
{
  id: 1,
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: '👤',
  totalLessonsCompleted: 12,
  totalAssessmentsTaken: 8,
  currentStreak: 14,
  totalXP: 2450,
  level: 8,
  badges: [], // Array of badge objects
  stats: {
    lessonsThisWeek: 8,
    lessonsThisMonth: 28,
    assessmentsThisMonth: 5,
    totalStudyTime: 324, // minutes
  },
}
```

#### Badge Object
```javascript
{
  id: 1,
  name: 'First Lesson',
  icon: '🎯',
  unlockedDate: '2025-09-15',
  rarity: 'common', // common | uncommon | rare | legendary
}
```

### Configuration Files

1. **app.json** - Expo app configuration
   - App name, version, icon, splash
   - iOS bundle ID, Android package name
   - Plugin configuration (fonts, etc.)

2. **package.json** - Dependencies
   - 20+ core dependencies (React, Navigation, Icons)
   - 4 dev dependencies (Babel, Jest, ESLint)

3. **babel.config.js** - Babel preset for Expo
   - Uses babel-preset-expo
   - Adds react-native-reanimated plugin

4. **metro.config.js** - Metro bundler config
   - Module resolution for react-native-svg

5. **.env** - Environment variables
   - API base URL
   - Timeout, environment mode, version

6. **.gitignore** - Git exclusions
   - node_modules, .expo, dist, .env files

### Styling Approach

**Why StyleSheet over Inline Styles?**
- Performance optimization
- CSS-in-JS compilation
- Reusability across components
- Centralized theming

**Example Usage:**
```javascript
import { commonStyles, spacing } from '../styles/commonStyles';
import { colors } from '../styles/colors';

const styles = StyleSheet.create({
  container: [commonStyles.card, { backgroundColor: colors.primary }],
});
```

### Mock Data Philosophy

The `mockData.js` service:
1. Provides realistic sample data
2. Includes async delay (100-500ms) to simulate network
3. Returns data matching API contract
4. Easy to replace with real API calls (axios)

To integrate real API:
```javascript
// Old:
const data = await getAssessments();

// New:
const data = await axios.get(`${API_URL}/assessments`);
```

### Responsive Design

The app uses **Flexbox** for responsive layouts:
- Cards adapt to screen width
- Two-column grid for lessons (Dimensions API)
- Horizontal scrollable filters
- Safe area insets (SafeAreaView)

Tested on:
- iPhone SE (375px)
- iPhone 12 (390px)
- iPhone 14 Pro (393px)
- Android (varies, but 360px minimum)
- Web (responsive)

### Performance Considerations

1. **FlatList** - Used for long lists (future enhancement)
2. **Stylesheet Optimization** - Styles cached at module load
3. **Shadow Optimization** - Soft shadows instead of expensive effects
4. **Icon Sizing** - 24-32px icons (not full-screen SVGs)
5. **Image Handling** - Emoji instead of image files (zero asset size)

### Future Enhancements

**Phase 2 (Optional):**
- Real API integration with error handling
- Auth context + token management
- Lesson video player
- Assessment timer + submission
- Push notifications (Expo Notifications)
- AsyncStorage for offline sync
- Redux/Context for global state

**Phase 3 (Optional):**
- Animations (Reanimated v2)
- Achievement unlock animations
- Lesson completion celebrations
- Social features (leaderboards)
- Advanced analytics
- Video content support

### Testing Strategy

Recommended testing stack:
- **Jest** - Already in devDependencies
- **React Native Testing Library** - Component testing
- **Detox** - E2E testing (optional)

Example test:
```javascript
import { render } from '@testing-library/react-native';
import AssessmentsScreen from '../screens/Assessments/AssessmentsScreen';

test('renders assessment list', async () => {
  const { getByText } = render(<AssessmentsScreen />);
  expect(getByText('Assessments')).toBeOnTheScreen();
});
```

### Security Notes

Current implementation:
- No authentication (mock data only)
- No sensitive data in code
- No API keys exposed
- Environment variables for config

For production:
- Add authentication (JWT tokens)
- Store auth tokens securely (Secure Store)
- Encrypt sensitive data
- Validate API responses
- Implement refresh token rotation
- Use HTTPS only

### File Size Optimization

Current bundle (estimated):
- Core app: ~150KB
- Dependencies: ~500KB
- Total (gzipped): ~200KB

Optimizations used:
- Tree-shaking enabled
- Emoji instead of image assets
- SVG for icons (not PNG/JPG)
- No heavy libraries (Lodash, Moment, etc.)

### Development Tips

1. **Hot Reload**: Save file = instant update in app
2. **Device Preview**: Scan QR code with phone
3. **Debug Menu**: Shake phone or press Ctrl+M (Android)
4. **Console Logs**: Visible in terminal
5. **Network**: Use Expo's built-in network debugger

### Deployment Checklist

Before going live:
- [ ] Replace mock data with real API
- [ ] Add authentication flow
- [ ] Test on real devices (iOS + Android)
- [ ] Set up error logging
- [ ] Configure app signing certificates
- [ ] Build and test on EAS
- [ ] Submit to TestFlight (iOS)
- [ ] Submit to Google Play (Android)
- [ ] Monitor crash reports
- [ ] Gather user feedback

---

**Last Updated**: March 11, 2026  
**Status**: Production Ready (Mock Data)
