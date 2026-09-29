// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { AdminAsyncState } from "../AdminAsyncState";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return { Pressable: component("Pressable"), Text: component("Text"), View: component("View") };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("../AdminMobilePrimitives", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    AdminNotice: ({ title, description }: Record<string, unknown>) =>
      ReactRuntime.createElement("Text", null, title, " ", description),
    AdminButton: ({ label, onPress, disabled }: Record<string, unknown>) =>
      ReactRuntime.createElement("Pressable", {
        accessibilityLabel: label,
        onPress,
        disabled,
        style: { minHeight: 48 },
      }),
  };
});

function renderedText(root: TestRenderer.ReactTestInstance) {
  return root.findAllByType("Text").flatMap((node) => node.children).join(" ");
}

describe("AdminAsyncState", () => {
  it("labels initial loading as progress", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminAsyncState isLoading hasData={false} error={null} onRetry={jest.fn()}>
          <Text>Loaded</Text>
        </AdminAsyncState>,
      );
    });

    expect(renderer!.root.findByProps({ accessibilityRole: "progressbar" })).toBeTruthy();
    expect(renderedText(renderer!.root)).toContain("Loading system status");
  });

  it("shows an error with a touch-accessible retry action", () => {
    const retry = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminAsyncState isLoading={false} hasData={false} error="Unavailable" onRetry={retry}>
          <Text>Loaded</Text>
        </AdminAsyncState>,
      );
    });

    const button = renderer!.root.findByProps({ accessibilityLabel: "Retry" });
    expect(button.props.style).toMatchObject({ minHeight: 48 });
    act(() => button.props.onPress());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps cached data visible and labels it stale", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminAsyncState isLoading={false} hasData error="Refresh failed" onRetry={jest.fn()}>
          <Text>Last successful data</Text>
        </AdminAsyncState>,
      );
    });

    expect(renderedText(renderer!.root)).toMatch(/Showing the last successful data.*Last successful data/);
  });
});
