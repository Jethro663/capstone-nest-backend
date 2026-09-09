// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  TeacherAccordionSection,
  TeacherScreen,
  teacherTheme,
} from "../TeacherMobilePrimitives";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    Modal: ({ visible, children, ...props }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", props, children) : null,
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("../../ui/primitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Refreshable: component("Refreshable"),
    ScreenScroll: component("ScreenScroll"),
  };
});

jest.mock("../../navigation/RoleNavigationDrawer", () => {
  const ReactRuntime = require("react");
  return {
    RoleHeaderNavigationButton: ({ onBackPress }: { onBackPress?: () => void }) =>
      ReactRuntime.createElement("RoleHeaderNavigationButton", {
        accessibilityLabel: onBackPress ? "Back" : "Open navigation menu",
        onPress: onBackPress,
      }),
  };
});

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return (node.children ?? [])
    .map((child) => (typeof child === "string" ? child : flattenText(child)))
    .join(" ");
}

describe("teacher mobile primitives", () => {
  it("uses the restrained P2 GABHS teacher palette", () => {
    expect(teacherTheme.red).toBe("#C96B68");
    expect(teacherTheme.redText).toBe("#98484A");
    expect(teacherTheme.topbar).toBe("#FFFFFF");
    expect(teacherTheme.surface).toBe("#FFFFFF");
    expect(teacherTheme.bg).toBe("#FBFAF8");
    expect(teacherTheme.redSoft).toBe("#FFF5F2");
    expect(teacherTheme.border).toBe("#E7E3DF");
    expect(teacherTheme.blue).not.toBe(teacherTheme.red);
    expect(teacherTheme.purple).not.toBe(teacherTheme.red);
  });

  it("renders a compact title row without workspace or subtitle copy", () => {
    const onRefresh = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherScreen
          title="Assessments"
          workspaceLabel="Teacher workspace"
          subtitle="Implementation-facing details"
          icon="clipboard-text-outline"
          onRefresh={onRefresh}
        >
          <React.Fragment>Screen body</React.Fragment>
        </TeacherScreen>,
      );
    });

    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Assessments");
    expect(text).toContain("Screen body");
    expect(text).not.toContain("Teacher workspace");
    expect(text).not.toContain("Implementation-facing details");
    expect(text).not.toContain("Refresh");

    const refresh = renderer!.root.findByProps({ accessibilityLabel: "Refresh Assessments" });
    expect(renderer!.root.findByProps({ accessibilityLabel: "Open navigation menu" })).toBeTruthy();
    expect(refresh.props.style.minHeight).toBeGreaterThanOrEqual(44);
    act(() => refresh.props.onPress());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the back action instead of the root hamburger on detail screens", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherScreen title="Class details" showBackButton onBackPress={jest.fn()}>
          <React.Fragment>Detail body</React.Fragment>
        </TeacherScreen>,
      );
    });

    expect(renderer!.root.findByProps({ accessibilityLabel: "Back" })).toBeTruthy();
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Open navigation menu" })).toHaveLength(0);
  });

  it("exposes disclosure state and keeps content behind the same header action", () => {
    const onToggle = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherAccordionSection
          title="Needs attention"
          icon="alert-circle-outline"
          count={3}
          expanded
          onToggle={onToggle}
        >
          <React.Fragment>Three priority items</React.Fragment>
        </TeacherAccordionSection>,
      );
    });

    expect(flattenText(renderer!.toJSON())).toContain("Three priority items");
    const header = renderer!.root.findByProps({ accessibilityLabel: "Collapse Needs attention" });
    expect(header.props.accessibilityState).toEqual({ expanded: true });
    act(() => header.props.onPress());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
