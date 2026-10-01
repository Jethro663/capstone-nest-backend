const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../..');
const mobileRoot = path.join(repoRoot, 'mobile');
const { getDefaultConfig } = require(
  path.join(mobileRoot, 'node_modules', 'expo', 'metro-config'),
);

const config = getDefaultConfig(__dirname);
config.watchFolders = [repoRoot, mobileRoot];
config.resolver.nodeModulesPaths = [
  path.join(mobileRoot, 'node_modules'),
  path.join(mobileRoot, 'node_modules', 'react-native', 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
