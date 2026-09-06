import { existsSync } from "node:fs";
import path from "node:path";
import React from "react";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

const TestRenderer = require("react-test-renderer");
const act = TestRenderer.act;
const componentPath = path.resolve(__dirname, "../QuietNotificationBanner.tsx");

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function flattenText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return Array.isArray(node.children)
    ? node.children.map((child: any) => (typeof child === "string" ? child : flattenText(child))).join(" ")
    : "";
}

function loadBanner() {
  expect(existsSync(componentPath)).toBe(true);
  return require("../QuietNotificationBanner").QuietNotificationBanner as React.ComponentType<{
    count: number;
    hasUnread: boolean;
    onDismiss: () => void;
    onView: () => void;
  }>;
}

describe("QuietNotificationBanner", () => {
  it("renders one concise unread summary with explicit View and close actions", () => {
    const QuietNotificationBanner = loadBanner();
    const onView = jest.fn();
    const onDismiss = jest.fn();
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(
        <QuietNotificationBanner count={3} hasUnread onView={onView} onDismiss={onDismiss} />,
      );
    });

    expect(flattenText(renderer.toJSON())).toContain("You have 3 unread notifications");
    expect(flattenText(renderer.toJSON())).not.toContain("Nexora push");
    expect(flattenText(renderer.toJSON())).not.toContain("View now");

    const rootView = renderer.root.findAllByType("View")[0];
    expect(rootView.props.accessible).not.toBe(true);
    const announcedSummary = renderer.root
      .findAllByType("Text")
      .find((node: any) => node.props.accessibilityLabel === "You have 3 unread notifications");
    expect(announcedSummary.props.accessibilityLiveRegion).toBe("polite");

    const buttons = renderer.root.findAllByType("Pressable");
    const viewButton = buttons.find((node: any) => node.props.accessibilityLabel === "View notifications");
    const closeButton = buttons.find((node: any) => node.props.accessibilityLabel === "Dismiss notification summary");

    act(() => viewButton.props.onPress());
    act(() => closeButton.props.onPress());
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses singular copy and supports local updates without claiming they are unread", () => {
    const QuietNotificationBanner = loadBanner();
    let unreadRenderer: any;
    let localRenderer: any;

    act(() => {
      unreadRenderer = TestRenderer.create(
        <QuietNotificationBanner count={1} hasUnread onView={jest.fn()} onDismiss={jest.fn()} />,
      );
      localRenderer = TestRenderer.create(
        <QuietNotificationBanner count={1} hasUnread={false} onView={jest.fn()} onDismiss={jest.fn()} />,
      );
    });

    expect(flattenText(unreadRenderer.toJSON())).toContain("You have 1 unread notification");
    expect(flattenText(localRenderer.toJSON())).toContain("You have 1 new notification");
  });
});
