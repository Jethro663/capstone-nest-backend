// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MobileCampusLogin } from "../MobileCampusLogin";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const keyboardListeners = new Map<string, () => void>();

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  class AnimatedValue {
    constructor(public value: number) {}
  }

  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    },
    Animated: {
      Value: AnimatedValue,
      View: component("AnimatedView"),
      parallel: () => ({ start: (callback?: () => void) => callback?.() }),
      timing: () => ({ start: (callback?: () => void) => callback?.() }),
    },
    Image: component("Image"),
    Keyboard: {
      addListener: jest.fn((event: string, callback: () => void) => {
        keyboardListeners.set(event, callback);
        return { remove: jest.fn() };
      }),
    },
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: { OS: "android", select: (value: Record<string, unknown>) => value.android ?? value.default },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 12, bottom: 8, left: 0, right: 0 }),
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

function flattenText(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string" ? child : flattenText(child),
    )
    .join(" ");
}

describe("MobileCampusLogin", () => {
  it("renders the GABHS campus identity and a safe-area status trigger", () => {
    const onOpenStatus = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <MobileCampusLogin onOpenStatus={onOpenStatus} statusTone="green">
          {React.createElement("Text", null, "Login form")}
        </MobileCampusLogin>,
      );
    });

    const copy = flattenText(renderer!.root);
    expect(copy).toContain("GAT ANDRES BONIFACIO HIGH SCHOOL");
    expect(copy).toContain("NEXORA");
    expect(copy).toContain("LEARNING MANAGEMENT SYSTEM");
    expect(copy).toContain("Login form");

    const artwork = renderer!.root
      .findAllByType("Image")
      .find((image) => image.props.resizeMode === "cover");
    expect(artwork?.props.resizeMode).toBe("cover");
    expect(artwork?.props.style).toEqual(
      expect.objectContaining({
        bottom: 0,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        height: "100%",
        width: "100%",
      }),
    );

    const trigger = renderer!.root.find(
      (node) =>
        node.type === "Pressable" &&
        node.props.accessibilityLabel === "Open connection and app status",
    );
    expect(trigger.props.accessibilityHint).toContain("server");
    act(() => trigger.props.onPress());
    expect(onOpenStatus).toHaveBeenCalledTimes(1);
  });
});
