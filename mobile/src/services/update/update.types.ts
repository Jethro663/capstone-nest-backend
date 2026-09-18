export type UpdateType = "none" | "apk_optional" | "apk_forced";
export type UpdateAction = "none" | "binary_optional" | "binary_forced";

export interface AppVersionDecision {
  platform: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  latestNativeVersion: string;
  otaRuntimeVersion: string;
  artifactKind: "apk" | "ipa" | "store_link";
  artifactDownloadUrl: string;
  artifactSha256: string | null;
  artifactSizeBytes: number | null;
  sourceRevision: string | null;
  distributionChannel: "website" | "sidestore" | "store";
  apkDownloadUrl: string;
  apkSha256: string | null;
  apkSizeBytes: number | null;
  isForceUpdate: boolean;
  requiresFullApk: boolean;
  releaseNotes: string | null;
  updateAction: UpdateAction;
  updateType: UpdateType;
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "binary_required"
  | "apk_required"
  | "downloading_apk"
  | "verifying_apk"
  | "ready_to_install"
  | "installing"
  | "permission_denied"
  | "error";

export type UpdateFailureStage =
  | "check"
  | "download"
  | "verification"
  | "installation";

export interface UpdateState {
  access: "checking" | "allowed" | "blocked";
  status: UpdateStatus;
  decision: AppVersionDecision | null;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage: string | null;
  failureStage: UpdateFailureStage | null;
  verifiedApkUri: string | null;
}
