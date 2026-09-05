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
let mockUpdatesEnabled = false;
let mockRuntimeVersion: string | null = null;

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

jest.mock("expo-updates", () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  get isEnabled() {
    return mockUpdatesEnabled;
  },
  reloadAsync: jest.fn(),
  get runtimeVersion() {
    return mockRuntimeVersion;
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
  apkDownloadUrl: "https://example.com/app.apk",
  apkSha256: null,
  apkSizeBytes: null,
  isForceUpdate: false,
  requiresFullApk: false,
  releaseNotes: null,
  updateType: "none",
};

describe("client version identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock("react-native").Platform.OS = "android";
    mockUpdatesEnabled = false;
    mockRuntimeVersion = null;
    mockPublicGet.mockResolvedValue({ data: noUpdatePolicy });
  });

  it("omits OTA runtime when native Expo Updates is disabled", async () => {
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
        "installed Android build",
      );
      expect(mockPublicGet).not.toHaveBeenCalled();
    } finally {
      application.nativeBuildVersion = "14";
    }
  });

  it("reports the exact Expo Updates runtime when OTA is enabled", async () => {
    mockUpdatesEnabled = true;
    mockRuntimeVersion = "0.1.13";

    expect(getClientVersionInfo().currentRuntimeVersion).toBe("0.1.13");

    await checkUpdatePolicy();

    expect(mockPublicGet).toHaveBeenCalledWith("/app-version/check", {
      params: expect.objectContaining({
        currentOtaVersion: "0.1.13",
      }),
    });
  });

  it("never requests Android policy or touches APK storage on iOS", async () => {
    jest.requireMock("react-native").Platform.OS = "ios";
    await expect(checkUpdatePolicy()).resolves.toMatchObject({
      platform: "ios",
      updateType: "none",
      apkDownloadUrl: "",
    });
    await cleanOldApkFiles(3);
    await expect(
      downloadApk("https://example.com/app.apk", 20),
    ).rejects.toThrow("Android");
    expect(mockPublicGet).not.toHaveBeenCalled();
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
    mockUpdatesEnabled = false;
    mockRuntimeVersion = null;
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
