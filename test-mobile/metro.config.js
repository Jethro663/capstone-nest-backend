const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const metroBlockList = [
  /[\/\\]node_modules[\/\\]expo-modules-autolinking[\/\\]android[\/\\].*/,
];
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? existingBlockList.concat(metroBlockList)
  : existingBlockList
    ? [existingBlockList, ...metroBlockList]
    : metroBlockList;

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
});
