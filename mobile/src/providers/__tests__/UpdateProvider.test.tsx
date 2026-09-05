import React from "react";
import { AppState, Platform, Text } from "react-native";
import type { AppVersionDecision } from "../../services/update/update.types";
import { UpdateProvider } from "../UpdateProvider";
import { reportUpdatePolicyFailure } from "../../services/update/update-admission";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    ActivityIndicator: component("ActivityIndicator"),
    Modal: ({ visible, children, ...props }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", props, children) : null,
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
    Platform: { OS: "android" },
    AppState: {
      currentState: "active",
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
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

const policy17: AppVersionDecision = {
  ...policy14,
  minSupportedVersionCode: 17,
  isForceUpdate: true,
  updateType: "apk_forced",
  latestVersionCode: 17,
  latestNativeVersion: "0.1.16",
  otaRuntimeVersion: "0.1.16",
  apkSizeBytes: 40200000,
  releaseNotes:
    "Prevents duplicate latest-version prompts and adds visible app version details.",
};

const noUpdatePolicy: AppVersionDecision = {
  ...policy17,
  latestVersionCode: 16,
  minSupportedVersionCode: 16,
  isForceUpdate: false,
  requiresFullApk: false,
  updateType: "none",
};
const renderers: any[] = [];

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
  renderers.push(renderer);
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
    Object.values(mockedUpdateService).forEach((mock) => mock.mockReset());
    (Platform as { OS: string }).OS = "android";
    mockCheckUpdatePolicy.mockResolvedValue(policy17);
    mockCleanOldApkFiles.mockResolvedValue(undefined);
    mockDownloadApk.mockResolvedValue("file:///cache/update-17.apk");
    mockGetClientVersionInfo.mockReturnValue({
      platform: "android",
      currentNativeVersion: "0.1.15",
      currentVersionCode: 16,
      currentRuntimeVersion: undefined,
    });
    mockInstallApk.mockResolvedValue(undefined);
    mockOpenUnknownSourcesSettings.mockResolvedValue(undefined);
    mockTriggerOtaUpdate.mockResolvedValue(false);
    mockVerifyApkIntegrity.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      renderers.splice(0).forEach((renderer) => renderer.unmount());
    });
  });

  it("does not mount app content before the first policy check finishes", async () => {
    mockCheckUpdatePolicy.mockReturnValue(new Promise(() => {}));
    const renderer = await renderProvider();
    expect(flattenText(renderer.toJSON())).not.toContain("Child content");
    expect(flattenText(renderer.toJSON())).toContain("Checking app version");
  });

  it("keeps a failed startup check blocked and permits a fresh retry", async () => {
    mockCheckUpdatePolicy
      .mockRejectedValueOnce(new Error("Network offline"))
      .mockResolvedValueOnce(noUpdatePolicy);
    const renderer = await renderProvider();
    expect(flattenText(renderer.toJSON())).not.toContain("Child content");
    expect(flattenText(renderer.toJSON())).toContain(
      "Connect to verify your app version",
    );
    await press(renderer, "Retry Check");
    expect(flattenText(renderer.toJSON())).toContain("Child content");
  });

  it("keeps mandatory access blocked through a failed policy retry", async () => {
    mockCheckUpdatePolicy
      .mockResolvedValueOnce({
        ...policy17,
        minSupportedVersionCode: 17,
        isForceUpdate: true,
        updateType: "apk_forced",
      })
      .mockRejectedValueOnce(new Error("Network offline"));
    mockDownloadApk.mockRejectedValueOnce(new Error("Download interrupted"));
    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Retry Download");
    expect(flattenText(renderer.toJSON())).not.toContain("Child content");
    expect(findButton(renderer, "Later")).toBeUndefined();
  });

  it("does not dismiss the mandatory gate with Android Back", async () => {
    const renderer = await renderProvider();
    await act(async () => {
      renderer.root.findByType("Modal").props.onRequestClose();
    });
    expect(flattenText(renderer.toJSON())).not.toContain("Child content");
    expect(flattenText(renderer.toJSON())).toContain("Mandatory App Update");
  });

  it("admits the app only after the installed build and fresh policy confirm the upgrade", async () => {
    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    mockInstallApk.mockImplementation(async () => {
      mockGetClientVersionInfo.mockReturnValue({
        platform: "android",
        currentNativeVersion: "0.1.16",
        currentVersionCode: 17,
      });
      mockCheckUpdatePolicy.mockResolvedValue({
        ...noUpdatePolicy,
        latestVersionCode: 17,
        minSupportedVersionCode: 17,
      });
    });
    await press(renderer, "Install Now");
    expect(mockCleanOldApkFiles).toHaveBeenLastCalledWith(17);
    expect(flattenText(renderer.toJSON())).toContain("Child content");
    expect(renderer.root.findAllByType("Modal")).toHaveLength(0);
  });

  it("bypasses all APK work on iOS even when Android would be forced", async () => {
    (Platform as { OS: string }).OS = "ios";
    mockGetClientVersionInfo.mockReturnValue({
      platform: "ios",
      currentVersionCode: 3,
      currentNativeVersion: "0.1.0",
    });
    mockCheckUpdatePolicy.mockResolvedValue({
      ...policy17,
      isForceUpdate: true,
      updateType: "apk_forced",
    });
    const renderer = await renderProvider();
    expect(flattenText(renderer.toJSON())).toContain("Child content");
    expect(mockCheckUpdatePolicy).not.toHaveBeenCalled();
    expect(mockCleanOldApkFiles).not.toHaveBeenCalled();
    expect(mockTriggerOtaUpdate).not.toHaveBeenCalled();
  });

  it("rechecks on foreground and keeps existing content mounted but inaccessible", async () => {
    mockCheckUpdatePolicy
      .mockResolvedValueOnce(noUpdatePolicy)
      .mockResolvedValueOnce({
        ...policy17,
        minSupportedVersionCode: 17,
        isForceUpdate: true,
        updateType: "apk_forced",
      });
    const renderer = await renderProvider();
    const onChange = (AppState.addEventListener as jest.Mock).mock
      .calls[0]?.[1];
    expect(onChange).toEqual(expect.any(Function));
    await act(async () => {
      onChange("background");
      onChange("active");
    });
    await flushPromises();
    expect(mockCheckUpdatePolicy).toHaveBeenCalledTimes(2);
    expect(
      renderer.root.findByProps({ testID: "update-gated-content" }).props
        .pointerEvents,
    ).toBe("none");
    expect(flattenText(renderer.toJSON())).toContain("Child content");
  });

  it("locks admitted content after an API policy rejection and failed refresh", async () => {
    mockCheckUpdatePolicy
      .mockResolvedValueOnce(noUpdatePolicy)
      .mockRejectedValueOnce(new Error("Policy unavailable"));
    const renderer = await renderProvider();
    await act(async () => {
      reportUpdatePolicyFailure();
    });
    await flushPromises();
    expect(
      renderer.root.findByProps({ testID: "update-gated-content" }).props
        .pointerEvents,
    ).toBe("none");
    expect(flattenText(renderer.toJSON())).toContain("Retry Check");
  });

  it("deduplicates concurrent foreground checks", async () => {
    const policy = deferred<AppVersionDecision>();
    mockCheckUpdatePolicy.mockReturnValue(policy.promise);
    await renderProvider();
    const onChange = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => {
      onChange("background");
      onChange("active");
      onChange("background");
      onChange("active");
    });
    expect(mockCheckUpdatePolicy).toHaveBeenCalledTimes(1);
    await act(async () => {
      policy.resolve(noUpdatePolicy);
    });
  });

  it("retains a verified APK and installation controls after returning from settings", async () => {
    mockInstallApk.mockRejectedValue(
      new Error("Security exception: unknown source blocked."),
    );
    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Install Now");
    const onChange = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => {
      onChange("background");
      onChange("active");
    });
    await flushPromises();
    expect(findButton(renderer, "Retry Installation")).toBeDefined();
    expect(mockDownloadApk).toHaveBeenCalledTimes(1);
  });

  it("shows installed and available version identities for an APK update", async () => {
    const renderer = await renderProvider();

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Installed v0.1.15 (build 16)");
    expect(text).toContain("Available v0.1.16 (build 17)");
  });

  it("does not render an APK update dialog when the client is current", async () => {
    mockCheckUpdatePolicy.mockResolvedValue(noUpdatePolicy);

    const renderer = await renderProvider();

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Child content");
    expect(text).not.toContain("Update Available");
    expect(text).not.toContain("Installed v0.1.15");
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

  it("hides duplicate install actions but remains blocked if installer return did not upgrade the app", async () => {
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
    expect(flattenText(renderer.toJSON())).toContain("Install Now");
    expect(flattenText(renderer.toJSON())).not.toContain("Child content");
    expect(mockCheckUpdatePolicy).toHaveBeenCalledTimes(2);
  });

  it("offers settings and retry when Android cancels or blocks installation", async () => {
    mockInstallApk.mockRejectedValue(
      Object.assign(
        new Error("Android package installer returned without success."),
        { reason: "cancelled_or_blocked" },
      ),
    );

    const renderer = await renderProvider();
    await press(renderer, "Download & Install Update");
    await press(renderer, "Install Now");

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Open Settings (Unknown Apps)");
    expect(text).toContain("Retry Installation");
    expect(text).not.toContain("Please check your connection");
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
