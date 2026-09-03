import React from "react";
import { Text } from "react-native";
import type { AppVersionDecision } from "../../services/update/update.types";
import { UpdateProvider } from "../UpdateProvider";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    ActivityIndicator: component("ActivityIndicator"),
    Modal: ({ visible, children }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", null, children) : null,
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("../../services/update/update.service", () => ({
  checkUpdatePolicy: jest.fn(),
  cleanOldApkFiles: jest.fn(),
  downloadApk: jest.fn(),
  getClientVersionInfo: jest.fn(),
  installApk: jest.fn(),
  openUnknownSourcesSettings: jest.fn(),
  triggerOtaUpdate: jest.fn(),
  verifyApkIntegrity: jest.fn(),
}));

const mockedUpdateService = jest.requireMock(
  "../../services/update/update.service",
) as Record<string, jest.Mock>;
const mockCheckUpdatePolicy = mockedUpdateService.checkUpdatePolicy;
const mockCleanOldApkFiles = mockedUpdateService.cleanOldApkFiles;
const mockDownloadApk = mockedUpdateService.downloadApk;
const mockGetClientVersionInfo = mockedUpdateService.getClientVersionInfo;
const mockInstallApk = mockedUpdateService.installApk;
const mockOpenUnknownSourcesSettings =
  mockedUpdateService.openUnknownSourcesSettings;
const mockTriggerOtaUpdate = mockedUpdateService.triggerOtaUpdate;
const mockVerifyApkIntegrity = mockedUpdateService.verifyApkIntegrity;

const TestRenderer = require("react-test-renderer");
const act = TestRenderer.act;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const policy12: AppVersionDecision = {
  platform: "android",
  latestVersionCode: 12,
  minSupportedVersionCode: 1,
  latestNativeVersion: "0.1.11",
  otaRuntimeVersion: "0.1.11",
  apkDownloadUrl:
    "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk",
  apkSha256: "0184bfc3ffcbbed8cbc0596769c77a81075931757b743132fcb0bc50bd83124f",
  apkSizeBytes: 40050811,
  isForceUpdate: false,
  requiresFullApk: true,
  releaseNotes: "Four-quarter assessment filters.",
  updateType: "apk_optional",
};

const policy14: AppVersionDecision = {
  ...policy12,
  latestVersionCode: 14,
  latestNativeVersion: "0.1.13",
  otaRuntimeVersion: "0.1.13",
  apkSha256: "a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf",
  apkSizeBytes: 40174571,
  releaseNotes: "Navigation stability and JAHUB mobile updates.",
};

function flattenText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  const children = Array.isArray(node.children)
    ? node.children
        .map((child: any) =>
          typeof child === "string" ? child : flattenText(child),
        )
        .join(" ")
    : "";
  return children;
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderProvider() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <UpdateProvider>
        <Text>Child content</Text>
      </UpdateProvider>,
    );
  });
  await flushPromises();
  return renderer;
}

function findButton(renderer: any, label: string) {
  return renderer.root
    .findAllByType("Pressable")
    .find((node: any) => flattenText(node).includes(label));
}

async function press(renderer: any, label: string) {
  const button = findButton(renderer, label);
  expect(button).toBeDefined();
  await act(async () => {
    await button.props.onPress();
  });
  await flushPromises();
}

function verificationFailure() {
  return Object.assign(new Error("APK size mismatch."), {
    reason: "size_mismatch",
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("UpdateProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckUpdatePolicy.mockResolvedValue(policy14);
    mockCleanOldApkFiles.mockResolvedValue(undefined);
    mockDownloadApk.mockResolvedValue("file:///cache/update-14.apk");
    mockGetClientVersionInfo.mockReturnValue({ currentVersionCode: 13 });
    mockInstallApk.mockResolvedValue(undefined);
    mockOpenUnknownSourcesSettings.mockResolvedValue(undefined);
    mockTriggerOtaUpdate.mockResolvedValue(false);
    mockVerifyApkIntegrity.mockResolvedValue(undefined);
  });

  it("does not offer installation after verification deletes the APK", async () => {
    mockVerifyApkIntegrity.mockRejectedValue(verificationFailure());

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Retry Download");
    expect(text).not.toContain("Retry Installation");
    expect(text).not.toContain("Please check your connection");
  });

  it("refreshes policy before retrying a failed download", async () => {
    mockCheckUpdatePolicy
      .mockResolvedValueOnce(policy12)
      .mockResolvedValueOnce(policy14);
    mockDownloadApk
      .mockResolvedValueOnce("file:///cache/update-12.apk")
      .mockResolvedValueOnce("file:///cache/update-14.apk");
    mockVerifyApkIntegrity
      .mockRejectedValueOnce(verificationFailure())
      .mockResolvedValueOnce(undefined);

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Retry Download");

    expect(mockCheckUpdatePolicy).toHaveBeenCalledTimes(2);
    expect(mockDownloadApk).toHaveBeenLastCalledWith(
      policy14.apkDownloadUrl,
      policy14.latestVersionCode,
      expect.any(Function),
    );
    expect(flattenText(renderer.toJSON())).toContain("Ready to Install");
  });

  it("hides duplicate install actions while the Android intent is pending", async () => {
    const installer = deferred<void>();
    mockInstallApk.mockReturnValue(installer.promise);

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");

    const button = findButton(renderer, "Install Now");
    expect(button).toBeDefined();
    let installPromise: Promise<void>;
    act(() => {
      installPromise = button.props.onPress();
    });
    await flushPromises();

    expect(flattenText(renderer.toJSON())).toContain("Installing Update");
    expect(flattenText(renderer.toJSON())).not.toContain("Install Now");

    installer.resolve();
    await act(async () => {
      await installPromise!;
    });
    await flushPromises();

    expect(flattenText(renderer.toJSON())).toContain("Ready to Install");
  });

  it("retains installation retry only after a verified installer failure", async () => {
    mockInstallApk.mockRejectedValue(new Error("Installer activity failed."));

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Install Now");

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Retry Installation");
    expect(text).not.toContain("Please check your connection");
  });

  it("retains unknown-source permission recovery for a verified APK", async () => {
    mockInstallApk.mockRejectedValue(
      new Error("Security exception: unknown source blocked."),
    );

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Install Now");

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Open Settings (Unknown Apps)");
    expect(text).toContain("Retry Installation");
  });
});
