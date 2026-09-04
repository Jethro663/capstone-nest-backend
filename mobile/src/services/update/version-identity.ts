import * as Application from "expo-application";

export function getInstalledNativeVersionInfo() {
  return {
    currentNativeVersion: Application.nativeApplicationVersion ?? "0.1.0",
    currentVersionCode: Number(Application.nativeBuildVersion ?? 1) || 1,
  };
}
