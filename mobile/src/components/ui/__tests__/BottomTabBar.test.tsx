// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { BottomTabBar } from "../BottomTabBar";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  return {
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

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));

const roleRoutes = {
  student: ["Dashboard", "Classes", "JA", "Assessments", "Profile", "Announcements"],
  teacher: ["Home", "Assessments", "Classes", "Announcements", "Sections", "Profile"],
  admin: ["Home", "Classes", "Assessments", "Announcements", "Academic", "Profile"],
} as const;

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("react-test-renderer is deprecated")) return;
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function renderBar(role: keyof typeof roleRoutes, activeIndex = 0) {
  const routes = roleRoutes[role].map((name) => ({ key: `${name}-key`, name }));
  const navigate = jest.fn();
  const emit = jest.fn().mockReturnValue({ defaultPrevented: false });
  let renderer: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <BottomTabBar
        role={role}
        state={{ index: activeIndex, routes }}
        descriptors={Object.fromEntries(
          routes.map((route) => [route.key, { options: {} }]),
        )}
        navigation={{ emit, navigate }}
      />,
    );
  });

  return { renderer: renderer!, navigate, emit };
}

function renderedLabels(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll((node) => node.type === "Text")
    .map((node) => node.children.join(""));
}

describe("BottomTabBar role layouts", () => {
  it.each([
    ["student", ["Home", "Classes", "JA", "Assessments", "Profile"]],
    ["teacher", ["Home", "Assessments", "Classes", "Sections", "Profile"]],
    ["admin", ["Home", "Classes", "Assessments", "Academic", "Profile"]],
  ] as const)("renders five ordered %s destinations", (role, expected) => {
    const { renderer } = renderBar(role);

    expect(renderedLabels(renderer)).toEqual(expected);
    expect(renderer.root.findAll((node) => node.type === "Pressable")).toHaveLength(5);
  });

  it("elevates only student JA in the middle slot", () => {
    const student = renderBar("student", 2).renderer;
    const teacher = renderBar("teacher", 2).renderer;
    const admin = renderBar("admin", 2).renderer;

    expect(student.root.findAll((node) => node.type === "LinearGradient")).toHaveLength(1);
    expect(teacher.root.findAll((node) => node.type === "LinearGradient")).toHaveLength(0);
    expect(admin.root.findAll((node) => node.type === "LinearGradient")).toHaveLength(0);
  });

  it("keeps the bar surface behind the safe area and exposes complete labels", () => {
    const { renderer } = renderBar("admin");
    const outer = renderer.root.findAll((node) => node.type === "View")[0];
    const buttons = renderer.root.findAll((node) => node.type === "Pressable");
    const labels = renderer.root.findAll((node) => node.type === "Text");

    expect(outer.props.style.backgroundColor).toBeTruthy();
    expect(outer.props.style.paddingBottom).toBe(24);
    expect(buttons.every((button) => button.props.style.minHeight >= 48)).toBe(true);
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      "Home",
      "Classes",
      "Assessments",
      "Academic",
      "Profile",
    ]);
    expect(labels.every((label) => label.props.numberOfLines === 1)).toBe(true);
    expect(labels.every((label) => label.props.maxFontSizeMultiplier)).toBe(true);
  });

  it("emits tabPress and navigates only when the destination is not active", () => {
    const { renderer, emit, navigate } = renderBar("teacher", 0);
    const buttons = renderer.root.findAll((node) => node.type === "Pressable");

    act(() => buttons[0].props.onPress());
    act(() => buttons[1].props.onPress());

    expect(emit).toHaveBeenCalledWith({
      type: "tabPress",
      target: "Home-key",
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("Assessments");
  });
});
