// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useAuth } from "../../providers/AuthProvider";
import { authApi } from "../../api/services/auth";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as Record<string, unknown>).__DEV__ = false;

jest.useFakeTimers();

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
    Modal: component("Modal"),
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    ScrollView: component("ScrollView"),
    TextInput: component("TextInput"),
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Platform: {
      OS: "ios",
      select: (options: Record<string, unknown>) =>
        options.ios ?? options.default,
    },
  };
});

jest.mock("react-native-safe-area-context", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("SafeAreaView", props, props.children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("expo-constants", () => ({
  expoConfig: {
    hostUri: "localhost:3000",
  },
}));

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../providers/UpdateProvider", () => ({
  useUpdate: () => ({
    state: {
      status: "idle",
      decision: null,
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      errorMessage: null,
      failureStage: null,
      verifiedApkUri: null,
    },
    checkForUpdates: jest.fn().mockResolvedValue(undefined),
  }),
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
  checkLoginServerStatus: jest.fn(() => new Promise(() => undefined)),
}));

const presentError = jest.fn();

jest.mock("../../providers/ErrorModalProvider", () => ({
  useErrorModal: () => ({
    presentError,
    dismissError: jest.fn(),
  }),
}));

jest.mock("../../api/services/auth", () => ({
  authApi: {
    validateCredentials: jest.fn(),
    verifyEmail: jest.fn(),
    resendOtp: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    setActivationPassword: jest.fn(),
  },
}));

function flattenText(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : flattenText(child as TestRenderer.ReactTestInstance),
    )
    .join("");
}

function findPressableByText(
  root: TestRenderer.ReactTestInstance,
  text: string,
) {
  return root.find(
    (node) => node.type === "Pressable" && flattenText(node).includes(text),
  );
}

function findTextInputByPlaceholder(
  root: TestRenderer.ReactTestInstance,
  placeholder: string,
) {
  return root.find(
    (node) =>
      node.type === "TextInput" && node.props.placeholder === placeholder,
  );
}

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe("mobile auth recovery screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      login: jest.fn(),
    } as never);
  });

  it("routes login footer to forgot password", () => {
    const { LoginScreen } = require("../LoginScreen");
    const navigation = { navigate: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LoginScreen, {
          navigation,
          route: { key: "Login", name: "Login" },
        }),
      );
    });

    act(() => {
      findPressableByText(
        testRenderer!.root,
        "Forgot password? Recover your account",
      ).props.onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("ForgotPassword");
  });

  it("sends unverified login users to activation verify email after credentials validate", async () => {
    const { LoginScreen } = require("../LoginScreen");
    const login = jest.fn().mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: { message: "Email not verified. Please check your inbox." },
      },
      message: "Email not verified. Please check your inbox.",
    });
    mockedUseAuth.mockReturnValue({ login } as never);
    mockedAuthApi.validateCredentials.mockResolvedValue(true as never);
    const navigation = { navigate: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(LoginScreen, {
          navigation,
          route: { key: "Login", name: "Login" },
        }),
      );
    });

    act(() => {
      findTextInputByPlaceholder(
        testRenderer!.root,
        "you@example.com",
      ).props.onChangeText("student@example.com");
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Enter your password",
      ).props.onChangeText("Password1!");
    });

    await act(async () => {
      findPressableByText(testRenderer!.root, "Sign in").props.onPress();
    });

    expect(mockedAuthApi.validateCredentials).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "Password1!",
    });
    expect(navigation.navigate).toHaveBeenCalledWith("VerifyEmail", {
      email: "student@example.com",
      flow: "activation",
    });
  });

  it("routes activation verification success into set initial password", async () => {
    const { VerifyEmailScreen } = require("../VerifyEmailScreen");
    mockedAuthApi.verifyEmail.mockResolvedValue({ verified: true } as never);
    const navigation = { replace: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(VerifyEmailScreen, {
          navigation,
          route: {
            key: "VerifyEmail",
            name: "VerifyEmail",
            params: { email: "student@example.com", flow: "activation" },
          },
        }),
      );
    });

    const otpInputs = testRenderer!.root.findAll(
      (node) => node.type === "TextInput" && node.props.placeholder === "0",
    );
    act(() => {
      otpInputs[0].props.onChangeText("123456");
    });

    await act(async () => {
      findPressableByText(testRenderer!.root, "Verify email").props.onPress();
    });

    expect(mockedAuthApi.verifyEmail).toHaveBeenCalledWith({
      email: "student@example.com",
      code: "123456",
    });
    expect(navigation.replace).toHaveBeenCalledWith("SetInitialPassword", {
      email: "student@example.com",
    });
  });

  it("routes forgot password success to reset password with the email", async () => {
    const { ForgotPasswordScreen } = require("../ForgotPasswordScreen");
    mockedAuthApi.forgotPassword.mockResolvedValue({ sent: true } as never);
    const navigation = { replace: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ForgotPasswordScreen, {
          navigation,
          route: { key: "ForgotPassword", name: "ForgotPassword" },
        }),
      );
    });

    act(() => {
      findTextInputByPlaceholder(
        testRenderer!.root,
        "you@example.com",
      ).props.onChangeText("student@example.com");
    });

    await act(async () => {
      findPressableByText(
        testRenderer!.root,
        "Send reset code",
      ).props.onPress();
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(navigation.replace).toHaveBeenCalledWith("ResetPassword", {
      email: "student@example.com",
    });
  });

  it("shows an account missing modal and stays on forgot password when email is unknown", async () => {
    const { ForgotPasswordScreen } = require("../ForgotPasswordScreen");
    mockedAuthApi.forgotPassword.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: { message: "Account does not exist." },
      },
      message: "Account does not exist.",
    });
    const navigation = { replace: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ForgotPasswordScreen, {
          navigation,
          route: { key: "ForgotPassword", name: "ForgotPassword" },
        }),
      );
    });

    act(() => {
      findTextInputByPlaceholder(
        testRenderer!.root,
        "you@example.com",
      ).props.onChangeText("missing@example.com");
    });

    await act(async () => {
      findPressableByText(
        testRenderer!.root,
        "Send reset code",
      ).props.onPress();
    });

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(presentError).toHaveBeenCalledWith({
      title: "Account does not exist",
      message:
        "No Nexora account was found for that email address. Check the email or contact an administrator.",
    });
  });

  it("returns reset password success back to login", async () => {
    const { ResetPasswordScreen } = require("../ResetPasswordScreen");
    mockedAuthApi.resetPassword.mockResolvedValue({ success: true } as never);
    const navigation = { replace: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ResetPasswordScreen, {
          navigation,
          route: {
            key: "ResetPassword",
            name: "ResetPassword",
            params: { email: "student@example.com" },
          },
        }),
      );
    });

    act(() => {
      findTextInputByPlaceholder(
        testRenderer!.root,
        "6-digit code",
      ).props.onChangeText("123456");
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Create a strong password",
      ).props.onChangeText("Password1!");
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Repeat new password",
      ).props.onChangeText("Password1!");
    });

    await act(async () => {
      findPressableByText(testRenderer!.root, "Reset password").props.onPress();
    });

    expect(mockedAuthApi.resetPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      code: "123456",
      newPassword: "Password1!",
    });
    expect(navigation.replace).toHaveBeenCalledWith("Login");
  });

  it("signs in after setting the initial password and still supports skipping", async () => {
    const { SetInitialPasswordScreen } = require("../SetInitialPasswordScreen");
    const login = jest.fn().mockResolvedValue({ user: { id: "student-1" } });
    mockedUseAuth.mockReturnValue({ login } as never);
    mockedAuthApi.setActivationPassword.mockResolvedValue({
      success: true,
    } as never);
    const navigation = { replace: jest.fn() };

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(SetInitialPasswordScreen, {
          navigation,
          route: {
            key: "SetInitialPassword",
            name: "SetInitialPassword",
            params: { email: "student@example.com" },
          },
        }),
      );
    });

    act(() => {
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Enter your temporary password",
      ).props.onChangeText("Temporary1!");
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Create a strong password",
      ).props.onChangeText("Password1!");
      findTextInputByPlaceholder(
        testRenderer!.root,
        "Repeat new password",
      ).props.onChangeText("Password1!");
    });

    await act(async () => {
      findPressableByText(testRenderer!.root, "Set password").props.onPress();
    });

    expect(mockedAuthApi.setActivationPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      currentPassword: "Temporary1!",
      newPassword: "Password1!",
    });
    expect(login).toHaveBeenCalledWith("student@example.com", "Password1!");
    expect(navigation.replace).not.toHaveBeenCalled();

    await act(async () => {
      findPressableByText(testRenderer!.root, "Skip for now").props.onPress();
    });

    expect(navigation.replace).toHaveBeenCalledWith("Login");
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });
});
