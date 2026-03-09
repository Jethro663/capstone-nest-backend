const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo's default config already handles platform-specific file resolution
// correctly (e.g., .android.js, .ios.js, .web.js based on the target platform).
// Do NOT prepend web.* extensions here — it forces web code to load on native,
// causing crashes like "View config getter callback for component `style`".

module.exports = withNativeWind(config, {
  input: './global.css',
});
