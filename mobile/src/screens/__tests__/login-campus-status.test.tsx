// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useAuth } from "../../providers/AuthProvider";
import { useUpdate } from "../../providers/UpdateProvider";
import { checkLoginServerStatus } from "../../services/system-status/login-server-status";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as Record<string, unknown>).__DEV__ = false;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  class AnimatedValue {
    constructor(public value: number) {}
    setValue(next: number) {
      this.value = next;
    }
  }

  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(true),
    },
    ActivityIndicator: component("ActivityIndicator"),
    Animated: {
      Value: AnimatedValue,
      View: component("AnimatedView"),
      timing: () => ({ start: (callback?: () => void) => callback?.() }),
    },
    Image: component("Image"),
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Modal: component("Modal"),
    Platform: {
      OS: "android",
      select: (options: Record<string, unknown>) => options.android ?? options.default,
    },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 12, bottom: 8, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("expo-constants", () => ({
  expoConfig: { hostUri: "localhost:3000" },
}));

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../providers/UpdateProvider", () => ({
  useUpdate: jest.fn(),
}));

jest.mock("../../services/update/update.service", () => ({
  getClientVersionInfo: () => ({
    currentNativeVersion: "0.1.17",
    currentVersionCode: 18,
    platform: "android",
  }),
}));

jest.mock("../../services/system-status/login-server-status", () => ({
  describeApiTarget: () => ({
    label: "Hosted server",
    address: "nexora.example.edu",
  }),
  checkLoginServerStatus: jest.fn(),
}));

jest.mock("../../api/services/auth", () => ({
  authApi: { validateCredentials: jest.fn() },
}));

const onlineServer = {
  kind: "online",
  label: "Hosted server",
  address: "nexora.example.edu",
  headline: "Connected",
  detail: "Nexora and its required services are ready.",
  checkedAt: "2026-09-04T04:30:00.000Z",
};

const noneDecision = {
  updateType: "none",
  latestNativeVersion: "0.1.17",
  latestVersionCode: 18,
};

const baseUpdateState = {
  status: "idle",
  decision: noneDecision,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
  failureStage: null,
  verifiedApkUri: null,
};

function flattenText(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string" ? child : flattenText(child),
    )
    .join(" ");
}

function pressByLabel(root: TestRenderer.ReactTestInstance, label: string) {
  return root.find(
    (node) =>
      node.type === "Pressable" && node.props.accessibilityLabel === label,
  );
}

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseUpdate = useUpdate as jest.MockedFunction<typeof useUpdate>;
const mockedCheckServer = checkLoginServerStatus as jest.MockedFunction<
  typeof checkLoginServerStatus
>;

describe("Campus Front Door login status", () => {
  const checkForUpdates = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ login: jest.fn() } as never);
    mockedUseUpdate.mockReturnValue({
      state: baseUpdateState,
      checkForUpdates,
    } as never);
    mockedCheckServer.mockResolvedValue(onlineServer as never);
  });

  it("shows the web-aligned identity, checks health once, and removes the raw API footer", async () => {
    const { LoginScreen } = require("../LoginScreen");
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <LoginScreen
          navigation={{ navigate: jest.fn() }}
          route={{ key: "Login", name: "Login" }}
        />,
      );
      await Promise.resolve();
    });

    const copy = flattenText(renderer!.root);
    expect(copy).toContain("Welcome to Nexora");
    expect(copy).toContain("Use your school account to continue");
    expect(copy).toContain("GAT ANDRES BONIFACIO HIGH SCHOOL");
    expect(copy).not.toContain("Connected to https://");
    expect(mockedCheckServer).toHaveBeenCalledTimes(1);
    expect(checkForUpdates).not.toHaveBeenCalled();
  });

  it("opens the diagnostic and refreshes server and provider version state on demand", async () => {
    const { LoginScreen } = require("../LoginScreen");
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <LoginScreen
          navigation={{ navigate: jest.fn() }}
          route={{ key: "Login", name: "Login" }}
        />,
      );
      await Promise.resolve();
    });

    act(() => {
      pressByLabel(renderer!.root, "Open connection and app status").props.onPress();
    });
    expect(renderer!.root.findByType("Modal").props.visible).toBe(true);
    expect(flattenText(renderer!.root)).toContain("Hosted server");
    expect(flattenText(renderer!.root)).toContain("Installed v0.1.17 (build 18)");

    await act(async () => {
      await pressByLabel(
        renderer!.root,
        "Check server and app version again",
      ).props.onPress();
    });

    expect(mockedCheckServer).toHaveBeenCalledTimes(2);
    expect(checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("hands an actionable update back to the provider-owned update flow", async () => {
    mockedUseUpdate.mockReturnValue({
      state: {
        ...baseUpdateState,
        status: "apk_required",
        decision: {
          ...noneDecision,
          updateType: "apk_optional",
          latestNativeVersion: "0.1.18",
          latestVersionCode: 19,
        },
      },
      checkForUpdates,
    } as never);
    const { LoginScreen } = require("../LoginScreen");
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <LoginScreen
          navigation={{ navigate: jest.fn() }}
          route={{ key: "Login", name: "Login" }}
        />,
      );
      await Promise.resolve();
    });
    act(() => {
      pressByLabel(renderer!.root, "Open connection and app status").props.onPress();
    });

    await act(async () => {
      await pressByLabel(renderer!.root, "Review available app update").props.onPress();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByType("Modal").props.visible).toBe(false);
  });
});
