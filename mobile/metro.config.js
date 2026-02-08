const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add web support and fix vector icons
config.resolver.sourceExts = ['web.js', 'web.jsx', 'web.ts', 'web.tsx', ...config.resolver.sourceExts];

module.exports = config;
