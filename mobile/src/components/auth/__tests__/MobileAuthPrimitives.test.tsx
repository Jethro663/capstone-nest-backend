// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  AuthFooterLink,
  AuthInputField,
  AuthPrimaryButton,
  authTheme,
} from "../MobileAuthPrimitives";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: {
      OS: "android",
      select: (options: Record<string, unknown>) => options.android ?? options.default,
    },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

describe("mobile auth primitive customization", () => {
  it("keeps existing defaults while allowing login-only color overrides", () => {
    let defaults: TestRenderer.ReactTestRenderer;
    let customized: TestRenderer.ReactTestRenderer;

    act(() => {
      defaults = TestRenderer.create(
        <>
          <AuthInputField icon="email-outline" />
          <AuthPrimaryButton label="Sign in" onPress={jest.fn()} />
          <AuthFooterLink label="Recover account" onPress={jest.fn()} />
        </>,
      );
      customized = TestRenderer.create(
        <>
          <AuthInputField icon="email-outline" iconColor="#A51C30" />
          <AuthPrimaryButton
            gradientColors={["#A51C30", "#D94A59"]}
            label="Sign in"
            onPress={jest.fn()}
          />
          <AuthFooterLink
            color="#A51C30"
            label="Recover account"
            onPress={jest.fn()}
          />
        </>,
      );
    });

    expect(defaults!.root.findByType("MaterialCommunityIcons").props.color).toBe(
      authTheme.textLight,
    );
    expect(
      defaults!.root.findByType("LinearGradient").props.colors,
    ).not.toEqual(["#A51C30", "#D94A59"]);
    expect(defaults!.root.findAllByType("Text").at(-1)?.props.style.color).toBe(
      authTheme.textMid,
    );

    expect(
      customized!.root.findByType("MaterialCommunityIcons").props.color,
    ).toBe("#A51C30");
    expect(customized!.root.findByType("LinearGradient").props.colors).toEqual([
      "#A51C30",
      "#D94A59",
    ]);
    expect(
      customized!.root.findAllByType("Text").at(-1)?.props.style.color,
    ).toBe("#A51C30");
  });
});
