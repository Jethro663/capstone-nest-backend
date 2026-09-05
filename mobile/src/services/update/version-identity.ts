import * as Application from "expo-application";

export function getInstalledNativeVersionInfo() {
  const build = Number(Application.nativeBuildVersion);
  return {
    currentNativeVersion: Application.nativeApplicationVersion ?? "0.1.0",
    currentVersionCode: Number.isSafeInteger(build) && build > 0 ? build : 0,
  };
}
