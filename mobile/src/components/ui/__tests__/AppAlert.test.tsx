import React from "react";
import { AppAlert, AppAlertProvider } from "../AppAlert";

type TestNode = { children: Array<string | object>; props: Record<string, any> };
type TestTree = {
  root: {
    findByType(name: string): TestNode;
    findAllByType(name: string): TestNode[];
  };
  unmount(): void;
};
const TestRenderer = require("react-test-renderer") as {
  create(element: React.ReactElement): TestTree;
  act(callback: () => unknown): Promise<void>;
};
const { act } = TestRenderer;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    Modal: component("Modal"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
  };
});

describe("AppAlertProvider", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("renders a branded confirmation and preserves cancel/destructive callbacks", async () => {
    const onDelete = jest.fn();
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(<AppAlertProvider><></></AppAlertProvider>);
    });

    await act(async () => {
      AppAlert.alert("Delete item?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
    });
    expect(renderer.root.findByType("Modal").props.visible).toBe(true);
    expect(renderer.root.findAllByType("Text").map((node) => node.children.join("")))
      .toEqual(expect.arrayContaining(["Delete item?", "This cannot be undone."]));

    await act(async () => {
      renderer.root.findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Cancel")!.props.onPress();
    });
    expect(onDelete).not.toHaveBeenCalled();
    expect(renderer.root.findByType("Modal").props.visible).toBe(false);
    await act(async () => renderer.unmount());
  });

  it("shows queued dialogs in order", async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(<AppAlertProvider><></></AppAlertProvider>);
    });
    await act(async () => {
      AppAlert.alert("First");
      AppAlert.alert("Second");
    });
    expect(renderer.root.findAllByType("Text").map((node) => node.children.join("")))
      .toContain("First");
    await act(async () => {
      renderer.root.findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "OK")!.props.onPress();
    });
    expect(renderer.root.findAllByType("Text").map((node) => node.children.join("")))
      .toContain("Second");
    await act(async () => renderer.unmount());
  });

  it("runs onDismiss only for a system dismissal, never after a chosen action", async () => {
    const onDismiss = jest.fn();
    const onConfirm = jest.fn();
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(<AppAlertProvider><></></AppAlertProvider>);
    });
    await act(async () => {
      AppAlert.alert("Reset?", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: onConfirm },
      ], { cancelable: true, onDismiss });
    });
    await act(async () => {
      renderer.root.findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Reset")!.props.onPress();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => {
      AppAlert.alert("Reset?", undefined, [
        { text: "Cancel", style: "cancel" },
      ], { cancelable: true, onDismiss });
    });
    await act(async () => {
      renderer.root.findByType("Modal").props.onRequestClose();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
