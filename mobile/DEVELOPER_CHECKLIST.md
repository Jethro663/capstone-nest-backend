# Developer Checklist

## ✅ Pre-Launch Checklist

Use this checklist to ensure everything is ready before running the app locally.

### System Setup
- [ ] Node.js 16+ installed
- [ ] npm or yarn package manager ready
- [ ] Terminal/Command line access
- [ ] Text editor / IDE (VS Code recommended)

### Installation
```bash
cd capstone-nest-backend/mobile
npm install
```
- [ ] Dependencies installed successfully
- [ ] No critical warnings in installation
- [ ] `node_modules` folder created

### Configuration
- [ ] `.env` file created (copy from `.env.example`)
- [ ] `REACT_APP_API_URL` set correctly
- [ ] Backend server URL verified
- [ ] IP address correct for physical devices (not localhost)

### Backend Setup
- [ ] NestJS backend running
- [ ] Backend accessible at configured URL
- [ ] Test endpoint working (e.g., `/auth/login`)

### Simulator/Emulator Setup

**For iOS:**
- [ ] Xcode installed (macOS only)
- [ ] iOS simulator operational
- [ ] Command: `xcode-select --install` (if needed)

**For Android:**
- [ ] Android Studio installed
- [ ] Android Virtual Device (AVD) created
- [ ] Android emulator runs without issues
- [ ] ANDROID_HOME environment variable set

**For Physical Device:**
- [ ] Expo Go app installed on device
- [ ] Device on same WiFi as computer
- [ ] USB debugging enabled (Android)
- [ ] Trust computer certificate (iOS)

---

## 🚀 First Run

### Step 1: Start Development Server
```bash
npm start
```
- [ ] Terminal shows "Press q to quit"
- [ ] Metro bundler started
- [ ] QR code displayed in terminal
- [ ] Local URL available

### Step 2: Choose Platform

**iOS Simulator:**
```bash
npm run ios
# OR press 'i' in terminal
```
- [ ] Simulator opens
- [ ] App begins loading
- [ ] Loading spinner visible
- [ ] Splash screen appears
- [ ] Login screen loads

**Android Emulator:**
```bash
npm run android
# OR press 'a' in terminal
```
- [ ] Emulator opens
- [ ] App begins loading
- [ ] Loading spinner visible
- [ ] Splash screen appears
- [ ] Login screen loads

**Physical Device:**
1. Run `npm start`
2. Scan QR code with camera app (iOS) or Expo Go (Android)
3. - [ ] App opens in Expo Go
   - [ ] Loading animation visible
   - [ ] Login screen displayed

### Step 3: Test Login
- [ ] Login screen displays without errors
- [ ] Email input works
- [ ] Password input works
- [ ] Show/hide password toggle works
- [ ] "Forgot Password?" link clickable
- [ ] "Sign Up" link clickable

### Step 4: Navigate App
After successful login:
- [ ] Dashboard loads
- [ ] Tabs at bottom responsive
- [ ] Pull-down refresh works
- [ ] Cards display content
- [ ] Buttons are clickable
- [ ] No console errors

---

## 🔧 Troubleshooting Checklist

### App Won't Start
- [ ] Cleared cache: `npm start -c`
- [ ] Restarted terminal
- [ ] Checked node version: `node -v`
- [ ] Checked npm version: `npm -v`
- [ ] Reinstalled dependencies: `rm -rf node_modules && npm install`

### Can't connect to Backend
- [ ] Backend is running
- [ ] API URL in `.env` is correct
- [ ] Using IP address (not localhost) for devices
- [ ] Firewall not blocking port
- [ ] Same WiFi network for device
- [ ] Test with curl: `curl http://api-url/api/auth/login`

### Simulator/Emulator Issues
- [ ] Closed and reopened simulator
- [ ] Cleared Expo cache: `expo start --clear`
- [ ] Restarted computer
- [ ] Checked disk space (>1GB free)
- [ ] Updated Xcode (macOS): `softwareupdate -i -a`
- [ ] Updated Android Studio

### Build Issues
- [ ] Node version compatible (16+)
- [ ] No syntax errors in code
- [ ] All imports valid paths
- [ ] Checked error messages carefully
- [ ] Cleaned build: `expo start -c`
- [ ] Reinstalled: `npm install`

### Hot Reload Not Working
- [ ] Pressed 'r' in terminal to reload
- [ ] Checked Expo DevTools (press 'd')
- [ ] Enabled "Fast Refresh"
- [ ] Restart app: `Ctrl+C` and `npm start`

---

## 📝 Feature Testing Checklist

### Authentication ✅
- [ ] Login with valid credentials
- [ ] Login error with invalid email
- [ ] Login error with wrong password
- [ ] Email verification shows OTP input
- [ ] Forgot password flow works
- [ ] Reset password with OTP works
- [ ] Logout clears user data
- [ ] Session persists on app restart

### Navigation ✅
- [ ] Bottom tabs visible and clickable
- [ ] Tab icons display correctly
- [ ] Active tab highlighted
- [ ] Tab names display below icons
- [ ] Deep linking works (if implemented)
- [ ] Back button navigates correctly
- [ ] Modal screens slide in properly

### Student Features ✅
- [ ] Dashboard displays
- [ ] Statistics cards show data
- [ ] Courses list loads
- [ ] Course details screen opens
- [ ] Progress bars display
- [ ] Refresh works
- [ ] Pull-to-refresh updates data

### Teacher Features ✅
- [ ] Teacher dashboard loads
- [ ] Class statistics display
- [ ] Classes list shows data
- [ ] Class details screen works
- [ ] Student counts correct
- [ ] Section info displays

### Admin Features ✅
- [ ] Admin dashboard accessible
- [ ] User management opens
- [ ] Users list displays
- [ ] Delete user works
- [ ] Subject management works
- [ ] Can add subjects
- [ ] Section management works
- [ ] Can add sections

### Common Features ✅
- [ ] Profile screen loads
- [ ] User info displays
- [ ] Edit mode toggles
- [ ] Profile updates successfully
- [ ] Notifications screen loads
- [ ] Notifications dismiss properly
- [ ] Messages screen loads
- [ ] Messages list displays

---

## 📊 Code Quality Checklist

### Code Style
- [ ] No console.log() left in production code
- [ ] Consistent indentation (2 or 4 spaces)
- [ ] Semicolons consistent
- [ ] Variable names meaningful
- [ ] Comments where needed

### Performance
- [ ] No performance warnings in console
- [ ] FlatList used for long lists
- [ ] Memoization applied to expensive components
- [ ] Images properly sized
- [ ] Network requests debounced/throttled

### Error Handling
- [ ] All try/catch blocks functional
- [ ] Error messages user-friendly
- [ ] Loading states display
- [ ] Empty states handled
- [ ] Network errors caught

### Security
- [ ] No hardcoded API keys
- [ ] Sensitive data in .env
- [ ] JWT tokens handled securely
- [ ] XSS protection (N/A for RN)
- [ ] CSRF protection (if applicable)

---

## 📦 Deployment Preparation Checklist

### Pre-Deployment
- [ ] Version bumped in `package.json`
- [ ] Version bumped in `app.json`
- [ ] All features tested
- [ ] No console errors
- [ ] No console warnings (or suppressed)
- [ ] App icon/splash created

### iOS Deployment
- [ ] Apple Developer account created
- [ ] Certificates generated
- [ ] Provisioning profiles created
- [ ] Bundle ID set correctly
- [ ] Privacy manifest included

### Android Deployment
- [ ] Google Play Developer account created
- [ ] Keystore file generated
- [ ] App signing configured
- [ ] Package name set correctly
- [ ] Version code incremented

### Submission
- [ ] Screenshots captured for stores
- [ ] App description written
- [ ] Privacy policy linked
- [ ] Terms of service linked
- [ ] App category selected

---

## 📚 Documentation Checklist

### Code Documentation
- [ ] All components have comments
- [ ] Complex functions explained
- [ ] API methods documented
- [ ] Constants defined and explained
- [ ] Error codes documented

### User Documentation
- [ ] README.md complete
- [ ] QUICKSTART.md accurate
- [ ] MIGRATION_GUIDE.md accurate
- [ ] Troubleshooting section added
- [ ] Screenshots included (optional)

### Maintenance
- [ ] Dependency versions locked
- [ ] Breaking changes documented
- [ ] Upgrade path clear
- [ ] Known issues listed
- [ ] Support contacts provided

---

## 🎓 Learning Resources Checklist

- [ ] Read QUICKSTART.md
- [ ] Read README.md
- [ ] Read MIGRATION_GUIDE.md
- [ ] Reviewed File structure
- [ ] Understood authentication flow
- [ ] Explored service layer
- [ ] Reviewed navigation setup
- [ ] Checked styling approach

---

## 👥 Team Checklist

If working in a team:

- [ ] Git repository initialized
- [ ] Main branch protected
- [ ] Develop branch created
- [ ] Feature branches rules defined
- [ ] Commit message conventions set
- [ ] Code review process defined
- [ ] Deployment process documented
- [ ] Team access configured

---

## 🚀 Ready to Launch?

Before launching to production:

- [ ] All checklists completed
- [ ] Testing completed on all devices
- [ ] Performance tested
- [ ] Security review done
- [ ] User acceptance testing passed
- [ ] Analytics setup complete
- [ ] Error tracking setup (Sentry, etc)
- [ ] Monitoring configured

---

## 🔍 Final Verification

```bash
# Run this before deployment:
npm start            # App starts correctly
npm run ios          # iOS build successful
npm run android      # Android build successful
```

- [ ] No errors in build
- [ ] App launches without crashes
- [ ] Core features work
- [ ] All screens load
- [ ] Navigation smooth
- [ ] Performance acceptable

---

## 📞 Support & Help

If something doesn't work:

1. Check [QUICKSTART.md](QUICKSTART.md)
2. Review [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
3. Check [FILE_INDEX.md](FILE_INDEX.md)
4. Review console errors carefully
5. Search GitHub issues
6. Ask on Stack Overflow
7. Contact development team

---

## ✨ You're All Set!

Your React Native app is ready to use. Good luck with your LMS mobile app! 🎉

**Print this checklist and keep it handy during development.**
