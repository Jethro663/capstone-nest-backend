// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  TeacherAccordionSection,
  TeacherScreen,
  TeacherSelectMenu,
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

function flattenInstanceText(node: TestRenderer.ReactTestInstance | string): string {
  if (typeof node === "string") return node;
  return node.children.map((child) => flattenInstanceText(child as TestRenderer.ReactTestInstance | string)).join(" ");
}

describe("teacher mobile primitives", () => {
  it("uses the approved navy frame and red intent palette", () => {
    expect(teacherTheme.red).toBe("#DC2626");
    expect(teacherTheme.redText).toBe("#DC2626");
    expect(teacherTheme.topbar).toBe("#0C1D3A");
    expect(teacherTheme.surface).toBe("#FFFFFF");
    expect(teacherTheme.bg).toBe("#F6F7F9");
    expect(teacherTheme.redSoft).toBe("#FEE2E2");
    expect(teacherTheme.border).toBe("#E4E7EC");
    expect(teacherTheme.blue).not.toBe(teacherTheme.red);
    expect(teacherTheme.purple).not.toBe(teacherTheme.red);
  });

  it("uses the shared compact filter sheet instead of a row of options", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherSelectMenu
          label="Filter status"
          selectedValue="all"
          options={[{ value: "all", label: "All" }, { value: "draft", label: "Draft" }]}
          onSelect={onSelect}
        />,
      );
    });
    const trigger = renderer!.root.findByProps({ accessibilityLabel: "Filter status: All" });
    act(() => trigger.props.onPress());
    act(() => renderer!.root.findByProps({ accessibilityLabel: "Draft" }).props.onPress());
    expect(onSelect).toHaveBeenCalledWith("draft");
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
    expect(refresh.findByType("Pressable").props.style.minHeight).toBeGreaterThanOrEqual(44);
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

  it("renders a bottom action outside the scrollable body", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherScreen
          title="Add students"
          bottomAction={<React.Fragment>Sticky add action</React.Fragment>}
        >
          <React.Fragment>Scrollable roster</React.Fragment>
        </TeacherScreen>,
      );
    });

    const scroll = renderer!.root.findByType("ScreenScroll");
    expect(flattenInstanceText(scroll)).toContain("Scrollable roster");
    expect(flattenInstanceText(scroll)).not.toContain("Sticky add action");
    expect(flattenText(renderer!.toJSON())).toContain("Sticky add action");
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
