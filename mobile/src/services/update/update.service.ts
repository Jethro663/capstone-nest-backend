import { Platform } from "react-native";
import * as Application from "expo-application";
import * as FileSystem from "expo-file-system/legacy";
import * as Updates from "expo-updates";
import { publicClient } from "../../api/client";
import { unwrapEnvelope } from "../../api/http";
import type { ApiEnvelope } from "../../types/api";
import type { AppVersionDecision } from "./update.types";
import { getInstalledNativeVersionInfo } from "./version-identity";

const UPDATE_DIR = `${FileSystem.cacheDirectory ?? ""}updates/`;

export type ApkVerificationFailureReason =
  | "missing_file"
  | "size_mismatch"
  | "checksum_mismatch";
export type ApkInstallationFailureReason = "cancelled_or_blocked";

export class ApkVerificationError extends Error {
  constructor(
    readonly reason: ApkVerificationFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ApkVerificationError";
  }
}

export class ApkInstallationError extends Error {
  constructor(
    readonly reason: ApkInstallationFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ApkInstallationError";
  }
}

export function getClientVersionInfo() {
  const platform = Platform.OS;
  const { currentNativeVersion, currentVersionCode } =
    getInstalledNativeVersionInfo();
  const resolvedRuntimeVersion =
    Updates.isEnabled && typeof Updates.runtimeVersion === "string"
      ? Updates.runtimeVersion.trim()
      : "";
  const currentRuntimeVersion = resolvedRuntimeVersion || undefined;

  return {
    platform,
    currentNativeVersion,
    currentVersionCode,
    currentRuntimeVersion,
  };
}

export async function checkUpdatePolicy(): Promise<AppVersionDecision> {
  const {
    platform,
    currentNativeVersion,
    currentVersionCode,
    currentRuntimeVersion,
  } = getClientVersionInfo();
  if (platform !== "android") {
    return {
      platform,
      latestVersionCode: currentVersionCode,
      minSupportedVersionCode: 1,
      latestNativeVersion: currentNativeVersion,
      otaRuntimeVersion: currentRuntimeVersion ?? "",
      apkDownloadUrl: "",
      apkSha256: null,
      apkSizeBytes: null,
      isForceUpdate: false,
      requiresFullApk: false,
      releaseNotes: null,
      updateType: "none",
    };
  }
  if (!Number.isSafeInteger(currentVersionCode) || currentVersionCode < 1) {
    throw new Error(
      "Unable to verify the installed Android build. Reopen the installed Nexora app.",
    );
  }
  const response = await publicClient.get<ApiEnvelope<AppVersionDecision>>(
    "/app-version/check",
    {
      params: {
        platform,
        currentNativeVersion,
        currentVersionCode,
        currentOtaVersion: currentRuntimeVersion,
      },
    },
  );
  const decision = unwrapEnvelope(response.data);
  if (
    !decision ||
    decision.platform !== "android" ||
    !Number.isSafeInteger(decision.latestVersionCode) ||
    decision.latestVersionCode < 1 ||
    !Number.isSafeInteger(decision.minSupportedVersionCode) ||
    decision.minSupportedVersionCode < 1 ||
    decision.minSupportedVersionCode > decision.latestVersionCode ||
    !["none", "apk_optional", "apk_forced"].includes(decision.updateType) ||
    (decision.updateType === "none" &&
      (currentVersionCode < decision.minSupportedVersionCode ||
        decision.isForceUpdate)) ||
    (decision.updateType !== "none" &&
      currentVersionCode >= decision.latestVersionCode)
  ) {
    throw new Error(
      "The app version policy could not be verified. Please retry.",
    );
  }
  if (currentVersionCode < decision.minSupportedVersionCode) {
    decision.updateType = "apk_forced";
    decision.isForceUpdate = true;
  }
  if (
    decision.updateType !== "none" &&
    (!/^https:\/\//i.test(decision.apkDownloadUrl) ||
      !Number.isSafeInteger(decision.apkSizeBytes) ||
      (decision.apkSizeBytes ?? 0) < 1 ||
      !/^[a-f0-9]{64}$/i.test(decision.apkSha256 ?? ""))
  ) {
    throw new Error(
      "The Android update package is not ready. Please retry the version check.",
    );
  }
  return decision;
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

export async function cleanOldApkFiles(
  currentInstalledVersionCode: number,
): Promise<void> {
  if (Platform.OS !== "android") return;
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
        if (
          !isNaN(fileVersionCode) &&
          fileVersionCode <= currentInstalledVersionCode
        ) {
          await FileSystem.deleteAsync(`${UPDATE_DIR}${filename}`, {
            idempotent: true,
          });
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
  onProgress?: (
    downloadedBytes: number,
    totalBytes: number,
    progress: number,
  ) => void,
): Promise<string> {
  if (Platform.OS !== "android")
    throw new Error("APK downloads are only supported on Android.");
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
    },
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
  expectedSha256?: string | null,
): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new ApkVerificationError(
      "missing_file",
      "Downloaded APK file does not exist.",
    );
  }

  if (expectedSizeBytes !== null && fileInfo.size !== expectedSizeBytes) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    throw new ApkVerificationError(
      "size_mismatch",
      `APK size mismatch. Expected ${expectedSizeBytes} bytes but downloaded ${fileInfo.size} bytes.`,
    );
  }
  if (expectedSha256) {
    const { File } =
      require("expo-file-system") as typeof import("expo-file-system");
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");
    const bytes = await new File(fileUri).bytes();
    const digest = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytes,
    );
    const actual = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    if (actual !== expectedSha256.toLowerCase()) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      throw new ApkVerificationError(
        "checksum_mismatch",
        "The downloaded APK does not match the published update. Download it again.",
      );
    }
  }
}

export async function installApk(fileUri: string): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("APK installation is only supported on Android devices.");
  }

  const IntentLauncher =
    require("expo-intent-launcher") as typeof import("expo-intent-launcher");

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new ApkVerificationError(
      "missing_file",
      "The verified APK file is no longer available. Download it again.",
    );
  }

  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  const result = await IntentLauncher.startActivityAsync(
    "android.intent.action.VIEW",
    {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: "application/vnd.android.package-archive",
    },
  );
  if (result.resultCode !== IntentLauncher.ResultCode.Success) {
    throw new ApkInstallationError(
      "cancelled_or_blocked",
      "Android closed or blocked the package installer before installation completed.",
    );
  }
}

export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  const IntentLauncher =
    require("expo-intent-launcher") as typeof import("expo-intent-launcher");
  const appId = Application.applicationId ?? "com.nexora.lms";
  await IntentLauncher.startActivityAsync(
    "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
    {
      data: `package:${appId}`,
    },
  );
}
