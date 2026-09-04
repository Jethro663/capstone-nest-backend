// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MobileLoginStatusModal } from "../MobileLoginStatusModal";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  return {
    ActivityIndicator: component("ActivityIndicator"),
    Modal: component("Modal"),
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
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

function pressByLabel(
  root: TestRenderer.ReactTestInstance,
  accessibilityLabel: string,
) {
  root.find(
    (node) =>
      node.type === "Pressable" &&
      node.props.accessibilityLabel === accessibilityLabel,
  ).props.onPress();
}

const onlineServer = {
  kind: "online" as const,
  label: "Hosted server" as const,
  address: "nexora.example.edu",
  headline: "Connected",
  detail: "Nexora and its required services are ready.",
  checkedAt: "2026-09-04T04:30:00.000Z",
};

const currentVersion = {
  kind: "current" as const,
  headline: "Up to date",
  detail: "This APK matches the latest registered Nexora build.",
  installedLabel: "Installed v0.1.17 (build 18)",
};

describe("MobileLoginStatusModal", () => {
  it("shows server and APK identity with accessible refresh and close actions", () => {
    const onCheckAgain = jest.fn();
    const onClose = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <MobileLoginStatusModal
          checking={false}
          onCheckAgain={onCheckAgain}
          onClose={onClose}
          onReviewUpdate={jest.fn()}
          server={onlineServer}
          version={currentVersion}
          visible
        />,
      );
    });

    const copy = flattenText(renderer!.root);
    expect(copy).toContain("Connection & app status");
    expect(copy).toContain("Hosted server");
    expect(copy).toContain("nexora.example.edu");
    expect(copy).toContain("Connected");
    expect(copy).toContain("Installed v0.1.17 (build 18)");
    expect(copy).toContain("Up to date");

    act(() => {
      pressByLabel(renderer!.root, "Check server and app version again");
      pressByLabel(renderer!.root, "Close connection and app status");
    });

    expect(onCheckAgain).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers the official update review only when an APK update is actionable", () => {
    const onReviewUpdate = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <MobileLoginStatusModal
          checking={false}
          onCheckAgain={jest.fn()}
          onClose={jest.fn()}
          onReviewUpdate={onReviewUpdate}
          server={onlineServer}
          version={{
            ...currentVersion,
            kind: "available",
            headline: "Update available",
          }}
          visible
        />,
      );
    });

    expect(flattenText(renderer!.root)).toContain("Review update");
    act(() => {
      pressByLabel(renderer!.root, "Review available app update");
    });
    expect(onReviewUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      renderer!.update(
        <MobileLoginStatusModal
          checking
          onCheckAgain={jest.fn()}
          onClose={jest.fn()}
          onReviewUpdate={onReviewUpdate}
          server={{ ...onlineServer, kind: "checking" }}
          version={{ ...currentVersion, kind: "checking" }}
          visible
        />,
      );
    });

    expect(flattenText(renderer!.root)).toContain("Checking now");
    expect(flattenText(renderer!.root)).not.toContain("Review update");
  });
});
