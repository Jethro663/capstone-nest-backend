const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockGetContentUriAsync = jest.fn();
const mockStartActivityAsync = jest.fn();
const mockPublicGet = jest.fn();
const mockFileBytes = jest.fn();
jest.mock("expo-file-system", () => ({
  File: jest.fn(() => ({ bytes: mockFileBytes })),
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: jest.fn(async (_algorithm: string, bytes: Uint8Array) => {
    const result = require("node:crypto")
      .createHash("sha256")
      .update(bytes)
      .digest();
    return result.buffer.slice(
      result.byteOffset,
      result.byteOffset + result.byteLength,
    );
  }),
}));
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("expo-application", () => ({
  applicationId: "com.nexora.lms.mobile",
  nativeApplicationVersion: "0.1.13",
  nativeBuildVersion: "14",
}));

jest.mock("expo-constants", () => ({
  default: { expoConfig: { runtimeVersion: { policy: "appVersion" } } },
}));

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  createDownloadResumable: jest.fn(),
  deleteAsync: mockDeleteAsync,
  getContentUriAsync: mockGetContentUriAsync,
  getInfoAsync: mockGetInfoAsync,
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: mockStartActivityAsync,
  ResultCode: {
    Success: -1,
    Canceled: 0,
  },
}));

jest.mock("../../../api/client", () => ({
  publicClient: { get: mockPublicGet },
}));

import {
  checkUpdatePolicy,
  cleanOldApkFiles,
  downloadApk,
  getClientVersionInfo,
  installApk,
  verifyApkIntegrity,
} from "../update.service";

const noUpdatePolicy = {
  platform: "android",
  latestVersionCode: 14,
  minSupportedVersionCode: 1,
  latestNativeVersion: "0.1.13",
  otaRuntimeVersion: "0.1.13",
  artifactKind: "apk",
  artifactDownloadUrl: "https://example.com/app.apk",
  artifactSha256: null,
  artifactSizeBytes: null,
  sourceRevision: null,
  distributionChannel: "website",
  apkDownloadUrl: "https://example.com/app.apk",
  apkSha256: null,
  apkSizeBytes: null,
  isForceUpdate: false,
  requiresFullApk: false,
  releaseNotes: null,
  updateAction: "none",
  updateType: "none",
};

describe("client version identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock("react-native").Platform.OS = "android";
    mockPublicGet.mockResolvedValue({ data: noUpdatePolicy });
  });

  it("uses binary-only identity without advertising an OTA runtime", async () => {
    expect(getClientVersionInfo()).toMatchObject({
      currentNativeVersion: "0.1.13",
      currentVersionCode: 14,
      currentRuntimeVersion: undefined,
    });

    await checkUpdatePolicy();

    expect(mockPublicGet).toHaveBeenCalledWith("/app-version/check", {
      params: expect.objectContaining({
        currentOtaVersion: undefined,
      }),
    });
  });

  it("does not fabricate build 1 when the installed native build is unknown", async () => {
    const application = jest.requireMock("expo-application");
    application.nativeBuildVersion = null;
    try {
      expect(getClientVersionInfo().currentVersionCode).toBe(0);
      await expect(checkUpdatePolicy()).rejects.toThrow(
        "installed mobile build",
      );
      expect(mockPublicGet).not.toHaveBeenCalled();
    } finally {
      application.nativeBuildVersion = "14";
    }
  });

  it("checks iOS policy but never touches APK storage", async () => {
    jest.requireMock("react-native").Platform.OS = "ios";
    mockPublicGet.mockResolvedValue({
      data: {
        platform: "ios",
        latestVersionCode: 46,
        minSupportedVersionCode: 46,
        latestNativeVersion: "0.1.45",
        otaRuntimeVersion: "",
        artifactKind: "ipa",
        artifactDownloadUrl: "https://example.com/Nexora-iOS.ipa",
        artifactSha256: "b".repeat(64),
        artifactSizeBytes: 14_000_000,
        sourceRevision: "a".repeat(40),
        distributionChannel: "sidestore",
        apkDownloadUrl: "",
        apkSha256: null,
        apkSizeBytes: null,
        isForceUpdate: true,
        requiresFullApk: true,
        releaseNotes: "Current iPhone acceptance build.",
        updateAction: "binary_forced",
        updateType: "none",
      },
    });

    await expect(checkUpdatePolicy()).resolves.toMatchObject({
      platform: "ios",
      updateAction: "binary_forced",
      updateType: "none",
      artifactKind: "ipa",
    });
    await cleanOldApkFiles(3);
    await expect(
      downloadApk("https://example.com/app.apk", 20),
    ).rejects.toThrow("Android");
    expect(mockPublicGet).toHaveBeenCalledWith("/app-version/check", {
      params: expect.objectContaining({
        platform: "ios",
        currentVersionCode: 14,
      }),
    });
    expect(mockGetInfoAsync).not.toHaveBeenCalled();
    jest.requireMock("react-native").Platform.OS = "android";
  });

  it.each([
    { ...noUpdatePolicy, platform: "ios" },
    { ...noUpdatePolicy, minSupportedVersionCode: 20, latestVersionCode: 20 },
    { ...noUpdatePolicy, latestVersionCode: 0 },
    { ...noUpdatePolicy, minSupportedVersionCode: 15 },
  ])(
    "does not approve malformed or contradictory policy %j",
    async (policy) => {
      mockPublicGet.mockResolvedValue({ data: policy });
      await expect(checkUpdatePolicy()).rejects.toThrow();
    },
  );
});

describe("APK verification and installation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock("react-native").Platform.OS = "android";
    mockFileBytes.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    mockDeleteAsync.mockResolvedValue(undefined);
    mockGetContentUriAsync.mockResolvedValue(
      "content://com.nexora.lms.mobile/update.apk",
    );
    mockStartActivityAsync.mockResolvedValue({ resultCode: -1 });
  });

  it("rejects and deletes an APK with matching size but a wrong checksum", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 4 });
    await expect(
      (verifyApkIntegrity as any)("file:///update.apk", 4, "a".repeat(64)),
    ).rejects.toMatchObject({ reason: "checksum_mismatch" });
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///update.apk", {
      idempotent: true,
    });
  });

  it("accepts the exact expected APK bytes", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 4 });
    const digest = require("node:crypto")
      .createHash("sha256")
      .update(new Uint8Array([1, 2, 3, 4]))
      .digest("hex");
    await expect(
      (verifyApkIntegrity as any)("file:///update.apk", 4, digest),
    ).resolves.toBeUndefined();
    expect(mockFileBytes).toHaveBeenCalledTimes(1);
  });

  it("deletes and rejects a size-mismatched APK", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 40174571 });

    await expect(
      verifyApkIntegrity("file:///cache/update.apk", 40050811),
    ).rejects.toMatchObject({ reason: "size_mismatch" });
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/update.apk", {
      idempotent: true,
    });
  });

  it("does not delete a correctly sized APK", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 40174571 });

    await expect(
      verifyApkIntegrity("file:///cache/update.apk", 40174571),
    ).resolves.toBeUndefined();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it("rejects a missing APK during verification", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    await expect(
      verifyApkIntegrity("file:///cache/missing.apk", 40174571),
    ).rejects.toMatchObject({ reason: "missing_file" });
  });

  it("rejects a missing APK before Android installer launch", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    await expect(installApk("file:///cache/deleted.apk")).rejects.toMatchObject(
      { reason: "missing_file" },
    );
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
    expect(mockStartActivityAsync).not.toHaveBeenCalled();
  });

  it("launches Android only for an existing APK", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 40174571 });

    await installApk("file:///cache/update.apk");

    expect(mockGetContentUriAsync).toHaveBeenCalledWith(
      "file:///cache/update.apk",
    );
    expect(mockStartActivityAsync).toHaveBeenCalledWith(
      "android.intent.action.VIEW",
      {
        data: "content://com.nexora.lms.mobile/update.apk",
        flags: 1,
        type: "application/vnd.android.package-archive",
      },
    );
  });

  it("rejects when Android closes the installer without success", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 40177235 });
    mockStartActivityAsync.mockResolvedValue({ resultCode: 0 });

    await expect(installApk("file:///cache/update.apk")).rejects.toMatchObject({
      reason: "cancelled_or_blocked",
    });
  });
});
