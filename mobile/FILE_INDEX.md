# Mobile App - File Index & Reference

## 📑 Quick Navigation

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide (START HERE)
- **[README.md](README.md)** - Complete documentation
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Web-to-mobile conversion guide
- **[CONVERSION_SUMMARY.md](CONVERSION_SUMMARY.md)** - What was converted

---

## 📁 Directory Structure & File Reference

### Root Configuration Files
```
mobile/
├── App.js                 # Root component - wraps with Auth & Navigation
├── index.js              # Entry point - registers root component
├── app.json              # Expo configuration (app name, version, icons, etc)
├── package.json          # Dependencies and scripts
├── babel.config.js       # Babel transpiler configuration
├── metro.config.js       # Metro bundler configuration
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── README.md             # Full project documentation
```

---

## 🔐 Authentication System

### Context (`src/contexts/`)
```
AuthContext.js
├── AuthProvider          # Wrapper component for auth
├── useAuth()             # Hook to access auth state
├── State Management:
│   ├── user              # Current user object
│   ├── isLoading         # Loading state
│   ├── isSignedIn        # Boolean flag
│   └── error             # Error messages
├── Methods:
│   ├── login()           # Login with email/password
│   ├── signup()          # Create new account
│   ├── verifyEmail()     # Verify email with OTP
│   ├── resendOTP()       # Resend OTP code
│   ├── forgotPassword()  # Start password recovery
│   ├── resetPassword()   # Reset with OTP
│   ├── logout()          # Clear session
│   └── refreshUser()     # Fetch current user
└── Storage:
    └── Uses AsyncStorage for persistence
```

### Auth Screens (`src/screens/auth/`)
```
auth/
├── LoginScreen.js
│   ├── Email & password inputs
│   ├── Show/hide password toggle
│   ├── Remember me option
│   ├── Forgot password link
│   └── Sign up link
│
├── SignUpScreen.js
│   ├── First/last name inputs
│   ├── Email input
│   ├── Password confirmation
│   ├── Role selection (Student/Teacher)
│   └── Sign up button
│
├── EmailVerificationScreen.js
│   ├── OTP code input
│   ├── Verify button
│   ├── Resend OTP with countdown
│   └── Error handling
│
├── ForgotPasswordScreen.js
│   ├── Email input
│   ├── Send reset code button
│   └── Back to login link
│
└── ResetPasswordScreen.js
    ├── Reset code input
    ├── New password input
    ├── Confirm password input
    └── Reset button
```

---

## 📚 Student Module

### Dashboard (`src/screens/student/StudentDashboardScreen.js`)
```
StudentDashboardScreen
├── Header card with greeting
├── Quick stats:
│   ├── Enrolled courses count
│   ├── Pending assignments
│   └── Due assignments
├── Recent courses list (3 max)
├── Progress bars for each course
├── Logout button
└── Refresh control
```

### Courses (`src/screens/student/StudentCoursesScreen.js`)
```
StudentCoursesScreen
├── Course list header with count
├── Scrollable courses list
├── Course items with:
│   ├── Course name
│   ├── Instructor name
│   ├── Student count
│   ├── Progress percentage
│   └── Student count
└── Navigation to course details
```

### Course Details (`src/screens/student/CourseDetailsScreen.js`)
```
CourseDetailsScreen
├── Course header card
├── Course title and instructor
├── Description section
├── Course details:
│   ├── Student count
│   ├── Progress percentage
│   └── Status
└── Loading state
```

### Navigation
```
StudentStack
├── Tab Navigator (StudentTabs)
│   ├── StudentHome → StudentDashboard
│   ├── Courses → CoursesList
│   ├── Messages → MessagesScreen
│   └── Notifications → NotificationsScreen
│
└── Stack Navigator (additional screens)
    ├── CourseDetails
    ├── Profile
    └── Modal screens
```

---

## 🏫 Teacher Module

### Dashboard (`src/screens/teacher/TeacherDashboardScreen.js`)
```
TeacherDashboardScreen
├── Header card with greeting
├── Quick stats:
│   ├── Classes count
│   ├── Total students
│   └── Assignments count
├── Recent classes list (3 max)
├── Class info cards
├── Logout button
└── Refresh control
```

### Classes (`src/screens/teacher/TeacherClassesScreen.js`)
```
TeacherClassesScreen
├── Classes list header with count
├── Scrollable classes list
├── Class items with:
│   ├── Class name
│   ├── Subject name
│   ├── Student count
│   ├── Section info
│   └── Click to details
```

### Class Details (`src/screens/teacher/ClassDetailsScreen.js`)
```
ClassDetailsScreen
├── Class header card
├── Class title and subject
├── Class information:
│   ├── Section
│   ├── Student count
│   └── Semester
├── Description
└── Loading state
```

### Navigation
```
TeacherStack
├── Tab Navigator (TeacherTabs)
│   ├── TeacherHome → TeacherDashboard
│   ├── Classes → ClassesList
│   ├── Messages → MessagesScreen
│   └── Notifications → NotificationsScreen
│
└── Stack Navigator (additional screens)
    ├── ClassDetails
    ├── Profile
    └── Modal screens
```

---

## ⚙️ Admin Module

### Dashboard (`src/screens/admin/AdminDashboardScreen.js`)
```
AdminDashboardScreen
├── Admin greeting
├── System statistics:
│   ├── Total users
│   ├── Total subjects
│   └── Total sections
├── Management options:
│   ├── User Management
│   ├── Subject Management
│   └── Section Management
├── Each with icon and description
└── Logout button
```

### User Management (`src/screens/admin/UserManagementScreen.js`)
```
UserManagementScreen
├── Users list header with count
├── FlatList for performance
├── User items displaying:
│   ├── First and last name
│   ├── Email address
│   ├── Role badge (color-coded)
│   └── Delete button
└── Real-time deletion
```

### Subject Management (`src/screens/admin/SubjectManagementScreen.js`)
```
SubjectManagementScreen
├── Subjects count header
├── Add button to show form
├── Form (when visible):
│   ├── Subject name input
│   ├── Cancel button
│   └── Create button
├── Scrollable list of subjects
└── Subject cards with ID
```

### Section Management (`src/screens/admin/SectionManagementScreen.js`)
```
SectionManagementScreen
├── Sections count header
├── Add button to show form
├── Form (when visible):
│   ├── Section name input
│   ├── Cancel button
│   └── Create button
├── Scrollable list of sections
└── Section cards with ID
```

### Navigation
```
AdminStack
├── Tab Navigator (AdminTabs)
│   ├── AdminHome → AdminDashboard
│   ├── Users → UserManagement
│   ├── Subjects → SubjectManagement
│   └── Sections → SectionManagement
│
└── Stack Navigator (additional screens)
    ├── Profile
    └── Modal screens
```

---

## 👤 Common Screens

### Profile (`src/screens/common/ProfileScreen.js`)
```
ProfileScreen
├── Avatar and user name display
├── Edit mode toggle
├── Profile form (when editing):
│   ├── First name input
│   ├── Last name input
│   ├── Email (read-only)
│   └── Save button
├── Account details section:
│   ├── Role display
│   ├── Join date
│   └── Status indicator
└── Save functionality
```

### Notifications (`src/screens/common/NotificationsScreen.js`)
```
NotificationsScreen
├── FlatList with refresh control
├── Notification cards:
│   ├── Icon based on type
│   ├── Title
│   ├── Message
│   ├── Timestamp
│   ├── Read/unread styling
│   └── Dismiss button
├── Unread badge
└── Empty state message
```

### Messages (`src/screens/common/MessagesScreen.js`)
```
MessagesScreen
├── Messages list view:
│   ├── Sender avatar
│   ├── Sender name
│   ├── Message preview
│   ├── Timestamp
│   ├── Unread badge
│   └── Selection highlight
│
├── Conversation view (when selected):
│   ├── Back button
│   ├── Sender info header
│   ├── Message thread
│   ├── Received messages
│   ├── Sent messages
│   └── Reply input with send button
│
└── Tap to select, tap away to close
```

---

## 🌐 Navigation System

### Root Navigator (`src/navigation/RootNavigator.js`)
```
RootNavigator
├── Conditional rendering based on auth
│
├── Auth Stack (when not signed in)
│   ├── Login
│   ├── SignUp
│   ├── EmailVerification
│   ├── ForgotPassword
│   └── ResetPassword
│
└── App Stack (when signed in, based on role)
    ├── Student Stack
    │   ├── StudentTabs
    │   ├── CourseDetails
    │   └── Profile
    │
    ├── Teacher Stack
    │   ├── TeacherTabs
    │   ├── ClassDetails
    │   └── Profile
    │
    └── Admin Stack
        ├── AdminTabs
        └── Profile

Features:
├── Bottom Tab navigation for main screens
├── Native Stack for modals
├── Role-based routing
├── Deep linking ready
└── Smooth transitions
```

---

## 🔌 Services & API

### API Service (`src/services/api.js`)
```
api (Axios instance)
├── Base URL: from .env (REACT_APP_API_URL)
├── Timeout: 10 seconds
├── Request Interceptor:
│   └── Adds JWT token to headers
├── Response Interceptor:
│   └── Handles 401 (unauthorized)
└── Error handling: Built-in
```

### API Methods (`src/services/index.js`)
```
Authentication Service
├── login(email, password)
├── signup(userData)
├── verifyEmail(email, otp)
├── resendOTP(email)
├── forgotPassword(email)
├── resetPassword(email, otp, newPassword)
├── refreshToken()
└── logout()

User Service
├── getCurrentUser()
├── updateProfile(userData)
└── changePassword(oldPassword, newPassword)

Course Service (Student)
├── getStudentCourses()
├── getCourseDetails(courseId)
└── enrollCourse(courseId)

Teacher Service
├── getTeacherClasses()
├── getClassDetails(classId)
└── createClass(classData)

Admin Service
├── getUsers(filters)
├── deleteUser(userId)
├── getSubjects()
├── createSubject(subjectData)
├── getSections()
└── createSection(sectionData)
```

### Storage Service (`src/services/storage.js`)
```
AsyncStorage wrapper
├── setItem(key, value)        # Save JSON
├── getItem(key)               # Retrieve & parse
├── removeItem(key)            # Delete
└── clear()                    # Clear all

Error handling included for all operations
```

---

## 🛠️ Utilities

### Helpers (`src/utils/helpers.js`)
```
Date/Time Utilities
├── formatDate(date)           # "MM/DD/YYYY"
├── formatTime(date)           # "HH:MM AM/PM"
└── formatDateTime(date)       # Full datetime

Validation
├── isValidEmail(email)        # Email regex check

Formatting
└── getInitials(firstName, lastName)

Error Handling
└── handleApiError(error)      # User-friendly messages
```

---

## 📦 Dependencies

### Core Framework
```
expo: 51.0.0                    # Build system
react: 18.2.0                   # UI library
react-native: 0.74.0            # NativeCore
```

### Navigation
```
@react-navigation/native: 6.1.10
@react-navigation/bottom-tabs: 6.5.11
@react-navigation/native-stack: 6.9.19
react-native-screens: 3.31.1
react-native-safe-area-context: 4.8.2
react-native-gesture-handler: 2.14.2
```

### UI Components
```
react-native-paper: 5.11.0      # Material Design
@expo/vector-icons: 14.0.0      # Icons
```

### Data & Storage
```
@react-native-async-storage/async-storage: 1.21.0
axios: 1.13.4                   # HTTP client
react-hook-form: 7.55.0         # Forms
```

### Utilities
```
date-fns: 3.0.0                 # Date formatting
zustand: 4.4.0                  # State management
@tanstack/react-query: 5.22.2   # Query caching
```

---

## 🔧 Configuration Files

### `app.json`
```json
{
  "expo": {
    "name": "Nexora LMS",
    "slug": "nexora-lms",
    "version": "0.1.0",
    "platforms": ["ios", "android"],
    "ios": { "supportsTabletMode": true },
    "android": { "adaptiveIcon": {...} },
    "plugins": ["expo-font"]
  }
}
```

### `package.json`
```json
{
  "name": "nexora-lms-mobile",
  "version": "0.1.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

### `.env`
```
REACT_APP_API_URL=http://localhost:3000/api
```

---

## 📊 State Management

### AuthContext
```
State:
├── user                # User object with role
├── isLoading           # Loading during auth check
├── error               # Error messages
└── isSignedIn          # Boolean flag

Provides:
├── Functions for all auth operations
├── Persistent session
├── Automatic token management
└── Error handling
```

---

## 🎨 Styling Approach

### React Native StyleSheet
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  // ... more styles
});

use via: style={styles.container}
```

### React Native Paper Theme
```javascript
- Automatic light/dark mode support
- Pre-built components with theming
- Material Design colors
- Responsive typography
```

---

## 📱 Mobile-Specific Features

### Keyboard Handling
```
KeyboardAvoidingView
├── iOS: Uses paddingBottom
└── Android: Resizes view
```

### Platform Detection
```
Platform.OS === 'ios'  // or 'android'
Platform.select({
  ios: ...,
  android: ...
})
```

### Safe Area (Notch/hole punch)
```
SafeAreaView wrapper
- Handles safe area automatically
- Works with navigators
```

---

## 🚀 Scripts & Commands

### Development
```bash
npm start              # Start development server
npm start -c          # Start with cache clear
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
```

### Testing
```bash
npm test              # Run Jest tests
```

### Building
```bash
npm run eject         # Eject from Expo
eas build --platform ios
eas build --platform android
```

---

## 📝 Tips for Development

1. **Adding new screens:**
   - Create file in appropriate `src/screens/` folder
   - Add to navigation RootNavigator.js
   - Create or reuse navigation stack

2. **Adding new API endpoints:**
   - Add method to appropriate service in `src/services/index.js`
   - Use the api instance
   - Handle errors consistently

3. **Adding new dependencies:**
   - `npm install package-name`
   - Test on both platforms
   - Update documentation

4. **Debugging:**
   - Use Expo logs: `npm start` shows live logs
   - React Developer Tools: Pause/frame through code
   - Network tab: Inspect API calls in Axios

5. **Performance:**
   - Use FlatList for long lists
   - Memoize expensive components
   - Clean up async operations

---

## ✅ File Checklist

### Screens Created: 18
- [x] LoginScreen
- [x] SignUpScreen
- [x] EmailVerificationScreen
- [x] ForgotPasswordScreen
- [x] ResetPasswordScreen
- [x] StudentDashboardScreen
- [x] StudentCoursesScreen
- [x] CourseDetailsScreen
- [x] TeacherDashboardScreen
- [x] TeacherClassesScreen
- [x] ClassDetailsScreen
- [x] AdminDashboardScreen
- [x] UserManagementScreen
- [x] SubjectManagementScreen
- [x] SectionManagementScreen
- [x] ProfileScreen
- [x] NotificationsScreen
- [x] MessagesScreen

### Services Created: 4
- [x] api.js
- [x] index.js (API methods)
- [x] storage.js
- [x] AuthContext.js

### Navigation: 1
- [x] RootNavigator.js

### Config Files: 6
- [x] app.json
- [x] package.json
- [x] babel.config.js
- [x] metro.config.js
- [x] .env.example
- [x] .gitignore

### Documentation: 4
- [x] README.md
- [x] QUICKSTART.md
- [x] MIGRATION_GUIDE.md
- [x] CONVERSION_SUMMARY.md

---

**Total Files: 33+ components and configurations**

**Ready to use immediately!** 🎉
