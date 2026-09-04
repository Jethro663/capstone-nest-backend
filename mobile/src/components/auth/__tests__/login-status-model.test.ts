import type {
  AppVersionDecision,
  UpdateState,
} from "../../../services/update/update.types";
import {
  resolveLoginStatusTone,
  resolveLoginVersionStatus,
} from "../login-status-model";

const decision: AppVersionDecision = {
  platform: "android",
  latestVersionCode: 18,
  minSupportedVersionCode: 1,
  latestNativeVersion: "0.1.17",
  otaRuntimeVersion: "0.1.17",
  apkDownloadUrl: "https://example.com/nexora.apk",
  apkSha256: null,
  apkSizeBytes: null,
  isForceUpdate: false,
  requiresFullApk: true,
  releaseNotes: null,
  updateType: "none",
};

const baseState: UpdateState = {
  status: "idle",
  decision,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
  failureStage: null,
  verifiedApkUri: null,
};

const current = {
  currentNativeVersion: "0.1.17",
  currentVersionCode: 18,
};

describe("login version status", () => {
  it("reports checking while the update provider is checking", () => {
    expect(
      resolveLoginVersionStatus({ ...baseState, status: "checking" }, current),
    ).toMatchObject({ kind: "checking", headline: "Checking version" });
  });

  it("reports current only when installed code is at least the latest code", () => {
    expect(resolveLoginVersionStatus(baseState, current)).toMatchObject({
      kind: "current",
      headline: "Up to date",
      installedLabel: "Installed v0.1.17 (build 18)",
    });
  });

  it("reports supported without claiming latest for a lower accepted code", () => {
    expect(
      resolveLoginVersionStatus(baseState, {
        currentNativeVersion: "0.1.16",
        currentVersionCode: 17,
      }),
    ).toMatchObject({ kind: "supported", headline: "Supported version" });
  });

  it("reports optional and forced APK decisions separately", () => {
    expect(
      resolveLoginVersionStatus(
        {
          ...baseState,
          status: "apk_required",
          decision: { ...decision, updateType: "apk_optional" },
        },
        current,
      ),
    ).toMatchObject({ kind: "available", headline: "Update available" });

    expect(
      resolveLoginVersionStatus(
        {
          ...baseState,
          status: "apk_required",
          decision: {
            ...decision,
            updateType: "apk_forced",
            isForceUpdate: true,
          },
        },
        current,
      ),
    ).toMatchObject({ kind: "required", headline: "Update required" });
  });

  it("reports unverified when the provider check failed", () => {
    expect(
      resolveLoginVersionStatus(
        {
          ...baseState,
          decision: null,
          errorMessage: "Failed to check for updates.",
          failureStage: "check",
        },
        current,
      ),
    ).toMatchObject({
      kind: "unverified",
      headline: "Could not verify latest version",
    });
  });

  it("prioritizes neutral, red, amber, and green combined tones", () => {
    expect(resolveLoginStatusTone("checking", "current")).toBe("neutral");
    expect(resolveLoginStatusTone("online", "checking")).toBe("neutral");
    expect(resolveLoginStatusTone("offline", "current")).toBe("red");
    expect(resolveLoginStatusTone("unexpected", "supported")).toBe("red");
    expect(resolveLoginStatusTone("online", "required")).toBe("red");
    expect(resolveLoginStatusTone("limited", "current")).toBe("amber");
    expect(resolveLoginStatusTone("online", "available")).toBe("amber");
    expect(resolveLoginStatusTone("online", "unverified")).toBe("amber");
    expect(resolveLoginStatusTone("online", "current")).toBe("green");
    expect(resolveLoginStatusTone("online", "supported")).toBe("green");
  });
});
