export type UpdateType = "none" | "apk_optional" | "apk_forced";

export interface AppVersionDecision {
  platform: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  latestNativeVersion: string;
  otaRuntimeVersion: string;
  apkDownloadUrl: string;
  apkSha256: string | null;
  apkSizeBytes: number | null;
  isForceUpdate: boolean;
  requiresFullApk: boolean;
  releaseNotes: string | null;
  updateType: UpdateType;
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "ota_updating"
  | "apk_required"
  | "downloading_apk"
  | "verifying_apk"
  | "ready_to_install"
  | "installing"
  | "permission_denied"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  decision: AppVersionDecision | null;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage: string | null;
  localApkUri: string | null;
}
