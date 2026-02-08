# React to React Native Conversion Guide

## Overview

This document describes the migration from the web-based React LMS to a React Native mobile app using Expo.

## Key Differences

### 1. **UI Components**

**Web (Radix UI)**
```jsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
```

**Mobile (React Native Paper)**
```jsx
import { Button, TextInput } from 'react-native-paper';
import { Modal } from 'react-native-paper';
```

### 2. **Styling**

**Web (Tailwind CSS)**
```jsx
<div className="flex justify-center items-center bg-blue-500 p-4">
  Content
</div>
```

**Mobile (StyleSheet)**
```jsx
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
  },
});

<View style={styles.container}>
  Content
</View>
```

### 3. **Navigation**

**Web (React Router)**
```jsx
import { Outlet, Link } from 'react-router-dom';

<Link to="/dashboard">Dashboard</Link>
<Outlet />
```

**Mobile (React Navigation)**
```jsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

navigation.navigate('Dashboard');
```

### 4. **Storage**

**Web (localStorage/Context)**
```jsx
localStorage.setItem('token', value);
const token = localStorage.getItem('token');
```

**Mobile (AsyncStorage)**
```jsx
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('token', value);
const token = await AsyncStorage.getItem('token');
```

### 5. **Forms**

**Web (React Hook Form + Radix UI)**
```jsx
import { useForm } from 'react-hook-form';

const { register, handleSubmit } = useForm();
<input {...register('email')} />
```

**Mobile (React Hook Form + React Native Paper)**
```jsx
import { useForm, Controller } from 'react-hook-form';

<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <TextInput {...field} />
  )}
/>
```

### 6. **HTTP Requests**

Both use Axios, but error handling is similar:

```jsx
// Interceptors work the same way
api.interceptors.request.use(...)
api.interceptors.response.use(...)
```

### 7. **Icons**

**Web (lucide-react)**
```jsx
import { Mail } from 'lucide-react';
<Mail size={24} />
```

**Mobile (Expo Vector Icons)**
```jsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
<MaterialCommunityIcons name="mail" size={24} />
```

### 8. **Dialogs/Modals**

**Web (Radix Dialog)**
```jsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>Content</DialogContent>
</Dialog>
```

**Mobile (React Native Modal/Paper Dialog)**
```jsx
import { Modal } from 'react-native-paper';

<Modal visible={visible} onDismiss={() => setVisible(false)}>
  Content
</Modal>
```

## Component Mapping

| Web (React/Radix) | Mobile (React Native Paper) |
|---|---|
| `<div>` | `<View>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Button>` |
| `<button variant="outline">` | `<Button mode="outlined">` |
| `<Card>` | `<Card>` |
| `<Dialog>` | `<Modal>` |
| `<Select>` | `<Menu>` + custom |
| `<Tabs>` | `<Tab.Navigator>` |
| `<Toast>` | `<Snackbar>` |
| NavLink | Navigation params |

## Development Patterns

### 1. **Screen Structure**

Mobile apps use "screens" instead of pages:

```jsx
export default function CourseDetailsScreen({ route, navigation }) {
  const { courseId } = route.params;
  
  useEffect(() => {
    loadCourse();
  }, [courseId]);
  
  return (
    <ScrollView style={styles.container}>
      {/* Content */}
    </ScrollView>
  );
}
```

### 2. **Keyboard Handling**

Mobile-specific consideration:

```jsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  {/* Form content */}
</KeyboardAvoidingView>
```

### 3. **Platform-Specific Code**

```jsx
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific code
} else {
  // Android-specific code
}
```

### 4. **Safe Area Handling**

```jsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.container}>
  {/* Content */}
</SafeAreaView>
```

## Testing

### Web
```bash
npm test  # Jest with React Testing Library
```

### Mobile
```bash
npm test  # Jest with React Native Testing Library
```

Same testing approach, just different renderers.

## Performance Considerations

### Mobile-Specific Optimizations

1. **FlatList instead of map()** for long lists
```jsx
// Instead of:
{items.map(item => <ItemComponent key={item.id} />)}

// Use:
<FlatList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id.toString()}
/>
```

2. **Image optimization**
```jsx
import { Image } from 'react-native';

<Image
  source={{ uri: imageUrl }}
  style={{ width: 200, height: 200 }}
/>
```

3. **Memory management**
- Clean up subscriptions in useEffect cleanup
- Use React.memo for expensive components
- Lazy load screens with React Navigation

## Common Pitfalls

1. **Forget AsyncStorage is async**: Always use `await`
2. **Styling doesn't cascade**: Each component needs explicit styling
3. **Navigation params instead of URL**: Use `route.params` not URL query strings
4. **No direct DOM access**: Can't use `document` or DOM methods
5. **Network requests**: Always handle platform-specific issues (firewall, proxy)

## Migration Checklist

- [x] Convert project structure to Expo
- [x] Replace all UI components with React Native Paper
- [x] Convert all stylesheets to StyleSheet API
- [x] Update navigation to React Navigation
- [x] Replace localStorage with AsyncStorage
- [x] Update all forms with React Native inputs
- [x] Test on iOS simulator
- [x] Test on Android emulator
- [x] Test on physical devices
- [x] Update API error handling
- [x] Add proper keyboard handling
- [x] Optimize performance for mobile

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [React Native Paper Documentation](https://callstack.github.io/react-native-paper/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)

## Next Steps

1. Install dependencies: `npm install`
2. Create `.env` file with API URL
3. Start development: `npm start`
4. Test on simulator/emulator/device
5. Build for production when ready
