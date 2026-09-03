const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockGetContentUriAsync = jest.fn();
const mockStartActivityAsync = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("expo-application", () => ({
  applicationId: "com.nexora.lms.mobile",
  nativeApplicationVersion: "0.1.13",
  nativeBuildVersion: "14",
}));

jest.mock("expo-constants", () => ({
  default: { expoConfig: { runtimeVersion: "0.1.13" } },
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
}));

jest.mock("expo-updates", () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  isEnabled: false,
  reloadAsync: jest.fn(),
}));

jest.mock("../../../api/client", () => ({
  publicClient: { get: jest.fn() },
}));

import { installApk, verifyApkIntegrity } from "../update.service";

describe("APK verification and installation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAsync.mockResolvedValue(undefined);
    mockGetContentUriAsync.mockResolvedValue(
      "content://com.nexora.lms.mobile/update.apk",
    );
    mockStartActivityAsync.mockResolvedValue(undefined);
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
});
