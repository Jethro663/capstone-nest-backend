// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  AdminButton,
  AdminFilterBar,
  AdminMetricStrip,
  AdminSection,
} from "../AdminMobilePrimitives";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  return {
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
    RefreshControl: component("RefreshControl"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
}));

jest.mock("../../ui/primitives", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    Refreshable: component("Refreshable"),
    ScreenScroll: component("ScreenScroll"),
  };
});

function renderedText(root: TestRenderer.ReactTestInstance) {
  return root.findAllByType("Text").flatMap((node) => node.children).join(" ");
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("react-test-renderer is deprecated")) return;
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterAll(() => consoleErrorSpy.mockRestore());

describe("admin mobile primitives", () => {
  it("renders metrics as one compact divided strip without floating card shadows", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminMetricStrip
          items={[
            { label: "Users", value: 120 },
            { label: "Classes", value: 18 },
          ]}
        />,
      );
    });

    const strip = renderer!.root.findByProps({ testID: "admin-metric-strip" });
    expect(strip.props.style).toMatchObject({ borderTopWidth: 1, borderBottomWidth: 1 });
    expect(strip.props.style).not.toHaveProperty("shadowOpacity");
    expect(strip.props.style).not.toHaveProperty("elevation");
    expect(renderer!.root.findAll((node) => node.type === "View" && node.props.testID === "admin-metric-item")).toHaveLength(2);
  });

  it("standardizes search, clear, segments, and visible result count", () => {
    const onSearchChange = jest.fn();
    const onSegmentChange = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminFilterBar
          search="science"
          onSearchChange={onSearchChange}
          placeholder="Search records"
          segments={[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
          ]}
          activeSegment="active"
          onSegmentChange={onSegmentChange}
          resultCount={12}
        />,
      );
    });

    expect(renderer!.root.findByProps({ accessibilityLabel: "Search records" })).toBeTruthy();
    expect(renderedText(renderer!.root)).toMatch(/12\s+results/);

    act(() => renderer!.root.findByProps({ accessibilityLabel: "Clear search" }).props.onPress());
    expect(onSearchChange).toHaveBeenCalledWith("");

    const active = renderer!.root.findByProps({ accessibilityLabel: "Show Active" });
    expect(active.props.accessibilityState).toEqual({ selected: true });
    expect(active.props.style).toMatchObject({ minHeight: 44 });
    act(() => renderer!.root.findByProps({ accessibilityLabel: "Show All" }).props.onPress());
    expect(onSegmentChange).toHaveBeenCalledWith("all");
  });

  it("uses flat sections and touch-safe actions", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <AdminSection title="People"><AdminButton label="Add user" /></AdminSection>
        </>,
      );
    });

    const section = renderer!.root.findByProps({ testID: "admin-flat-section" });
    expect(section.props.style).toMatchObject({ borderTopWidth: 1, borderBottomWidth: 1 });
    expect(section.props.style).not.toHaveProperty("shadowOpacity");
    expect(renderer!.root.findByProps({ accessibilityLabel: "Add user" }).props.style).toMatchObject({ minHeight: 44 });
  });
});
