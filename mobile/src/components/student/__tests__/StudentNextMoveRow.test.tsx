// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StudentNextMoveRow } from "../StudentNextMoveRow";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    Pressable: component("Pressable"),
    StyleSheet: { create: (styles: Record<string, unknown>) => styles },
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

function flattenStyle(style: unknown) {
  if (!Array.isArray(style)) return style ?? {};
  return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("react-test-renderer is deprecated")
      )
        return;
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("StudentNextMoveRow", () => {
  it("renders an interactive next move as a stable horizontal record", () => {
    const onPress = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <StudentNextMoveRow
          icon="play-circle-outline"
          label="Learning"
          title="A lesson with a title that may wrap"
          subtitle="Mathematics · 18 minutes"
          tone="info"
          onPress={onPress}
        />,
      );
    });

    const row = renderer!.root
      .findByProps({ testID: "student-next-move-row" })
      .findByType("Pressable");
    expect(row.props.accessibilityRole).toBe("button");
    expect(flattenStyle(row.props.style)).toMatchObject({
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
    });
    expect(
      flattenStyle(renderer!.root.findByProps({ testID: "student-next-move-icon" }).props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      flattenStyle(renderer!.root.findByProps({ testID: "student-next-move-copy" }).props.style),
    ).toMatchObject({ flex: 1, minWidth: 0 });
    expect(renderer!.root.findByProps({ name: "arrow-top-right" })).toBeTruthy();

    act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders an informational next move with the same row geometry and no fake disabled button", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <StudentNextMoveRow
          icon="book-check-outline"
          label="Learning"
          title="You are up to date"
          subtitle="New published lessons will appear here."
          tone="success"
        />,
      );
    });

    const row = renderer!.root
      .findByProps({ testID: "student-next-move-row" })
      .findByType("View");
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.disabled).toBeUndefined();
    expect(flattenStyle(row.props.style)).toMatchObject({
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
    });
    expect(renderer!.root.findAllByProps({ name: "arrow-top-right" })).toHaveLength(0);
  });
});
