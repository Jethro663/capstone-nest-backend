import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Updates from "expo-updates";
import { publicClient } from "../../api/client";
import { unwrapEnvelope } from "../../api/http";
import type { ApiEnvelope } from "../../types/api";
import type { AppVersionDecision } from "./update.types";

const UPDATE_DIR = `${FileSystem.cacheDirectory ?? ""}updates/`;

export function getClientVersionInfo() {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const currentNativeVersion = Application.nativeApplicationVersion ?? "0.1.0";
  const currentVersionCode = Number(Application.nativeBuildVersion ?? 1) || 1;
  // Expo runtimeVersion represents the native compatibility boundary, NOT an OTA release counter.
  const currentRuntimeVersion = Constants.default?.expoConfig?.runtimeVersion
    ? String(Constants.default.expoConfig.runtimeVersion)
    : "1";

  return {
    platform,
    currentNativeVersion,
    currentVersionCode,
    currentRuntimeVersion,
  };
}

export async function checkUpdatePolicy(): Promise<AppVersionDecision> {
  const { platform, currentNativeVersion, currentVersionCode, currentRuntimeVersion } = getClientVersionInfo();
  const response = await publicClient.get<ApiEnvelope<AppVersionDecision>>("/app-version/check", {
    params: {
      platform,
      currentNativeVersion,
      currentVersionCode,
      currentOtaVersion: currentRuntimeVersion,
    },
  });
  return unwrapEnvelope(response.data);
}

export async function triggerOtaUpdate(): Promise<boolean> {
  try {
    if (__DEV__ || !Updates.isEnabled) {
      return false;
    }
    const checkResult = await Updates.checkForUpdateAsync();
    if (checkResult.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function cleanOldApkFiles(currentInstalledVersionCode: number): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(UPDATE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(UPDATE_DIR, { intermediates: true });
      return;
    }
    const files = await FileSystem.readDirectoryAsync(UPDATE_DIR);
    for (const filename of files) {
      const match = filename.match(/^nexora-update-(\d+)\.apk$/);
      if (match) {
        const fileVersionCode = parseInt(match[1], 10);
        if (!isNaN(fileVersionCode) && fileVersionCode <= currentInstalledVersionCode) {
          await FileSystem.deleteAsync(`${UPDATE_DIR}${filename}`, { idempotent: true });
        }
      }
    }
  } catch {
    // Ignore cleanup errors on platforms without filesystem access
  }
}

export async function downloadApk(
  url: string,
  targetVersionCode: number,
  onProgress?: (downloadedBytes: number, totalBytes: number, progress: number) => void
): Promise<string> {
  const { currentVersionCode } = getClientVersionInfo();
  await cleanOldApkFiles(currentVersionCode);

  const localPath = `${UPDATE_DIR}nexora-update-${targetVersionCode}.apk`;
  await FileSystem.deleteAsync(localPath, { idempotent: true });

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    localPath,
    {},
    (downloadProgress) => {
      const downloaded = downloadProgress.totalBytesWritten;
      const total = downloadProgress.totalBytesExpectedToWrite;
      const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      if (onProgress) {
        onProgress(downloaded, total, pct);
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error("Failed to download APK file.");
  }

  return result.uri;
}

export async function verifyApkIntegrity(
  fileUri: string,
  expectedSizeBytes: number | null,
  _expectedSha256: string | null
): Promise<boolean> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error("Downloaded APK file does not exist.");
  }

  if (expectedSizeBytes && fileInfo.size !== expectedSizeBytes) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    throw new Error(`APK size mismatch. Expected ${expectedSizeBytes} bytes but downloaded ${fileInfo.size} bytes.`);
  }

  return true;
}

export async function installApk(fileUri: string): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("APK installation is only supported on Android devices.");
  }

  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: "application/vnd.android.package-archive",
  });
}

export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  const appId = Application.applicationId ?? "com.nexora.lms";
  await IntentLauncher.startActivityAsync("android.settings.MANAGE_UNKNOWN_APP_SOURCES", {
    data: `package:${appId}`,
  });
}
