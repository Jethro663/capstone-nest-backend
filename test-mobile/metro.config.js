const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Windows fallback watching can trip over generated Gradle/Kotlin cache folders
// that appear and disappear while Expo is starting. Keep Metro focused on real
// app/package files and away from volatile native build outputs.
const metroBlockList = [
  /[\/\\]android[\/\\]\.gradle[\/\\].*/,
  /[\/\\]android[\/\\](?:app[\/\\])?build[\/\\].*/,
  /[\/\\]node_modules[\/\\]expo-modules-autolinking[\/\\]android[\/\\].*/,
  /[\/\\]node_modules[\/\\].*[\/\\]android[\/\\].*[\/\\]build[\/\\].*/,
  /[\/\\]node_modules[\/\\].*[\/\\]\.gradle[\/\\].*/,
  /[\/\\]node_modules[\/\\].*[\/\\]build[\/\\]kotlin[\/\\].*/,
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? existingBlockList.concat(metroBlockList)
  : existingBlockList
    ? [existingBlockList, ...metroBlockList]
    : metroBlockList;

// Resolve packages from this app's own node_modules instead of walking up to
// another checkout. This keeps the Downloads repo isolated from OneDrive copies.
config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "node_modules/react-native/node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

const svgSourceEntry = path.resolve(
  __dirname,
  "node_modules/react-native-svg/src/index.ts",
);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-svg") {
    return {
      type: "sourceFile",
      filePath: svgSourceEntry,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // NativeWind 4's virtual-module patch can crash on Metro 0.83 when watch mode
  // starts slowly on Windows. Disk output is more stable for local APK work.
  forceWriteFileSystem: true,
});
