// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  class AnimatedValue {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    setValue(value: number) {
      this.value = value;
    }

    stopAnimation(callback?: (value: number) => void) {
      callback?.(this.value);
    }

    interpolate({ outputRange }: { outputRange: string[] }) {
      return outputRange[0];
    }
  }

  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    TextInput: component("TextInput"),
    RefreshControl: component("RefreshControl"),
    Platform: { OS: "android" },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Animated: {
      Value: AnimatedValue,
      View: component("AnimatedView"),
      timing: () => ({ start: (callback?: () => void) => callback?.(), stop: () => undefined }),
      parallel: () => ({ start: (callback?: () => void) => callback?.() }),
      loop: () => ({ start: () => undefined, stop: () => undefined }),
    },
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

jest.mock("react-native-safe-area-context", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("SafeAreaView", props, props.children),
  };
});

jest.mock("react-native-svg", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  return {
    __esModule: true,
    default: component("Svg"),
    Line: component("Line"),
    Rect: component("Rect"),
    Text: component("SvgText"),
  };
});

import { Refreshable, ScreenScroll } from "../primitives";

function flattenText(node: TestRenderer.ReactTestInstance): string {
  if (typeof node === "string") return node;
  return node.children.map((child) => (typeof child === "string" ? child : flattenText(child))).join("");
}

describe("ScreenScroll refresh affordance", () => {
  it("keeps the refresh indicator hidden while idle", () => {
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        <ScreenScroll refreshControl={<Refreshable refreshing={false} onRefresh={jest.fn()} />}>
          <Text>Body</Text>
        </ScreenScroll>,
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Body");
    expect(renderedText).not.toContain("Refreshing");
  });

  it("shows the animated refresh indicator only while refreshing", () => {
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        <ScreenScroll refreshControl={<Refreshable refreshing onRefresh={jest.fn()} />}>
          <Text>Body</Text>
        </ScreenScroll>,
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    const scrollView = testRenderer!.root.find((node) => node.type === "ScrollView");

    expect(renderedText).toContain("Refreshing");
    expect(scrollView.props.refreshControl).toBeUndefined();
  });
});
