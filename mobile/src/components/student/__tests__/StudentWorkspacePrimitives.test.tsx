// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  StudentActionSheet,
  StudentBottomActionBar,
  StudentContextStrip,
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentSegmentedControl,
  StudentWorkspaceSwitcher,
} from "../StudentWorkspacePrimitives";

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
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 18, left: 0 }),
}));

jest.mock("../../ui/primitives", () => {
  const ReactRuntime = require("react");
  return {
    Refreshable: (props: Record<string, unknown>) => ReactRuntime.createElement("Refreshable", props),
    ScreenScroll: (props: Record<string, unknown>) => ReactRuntime.createElement("ScreenScroll", props, props.children),
  };
});

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return (node.children ?? []).map((child) => (typeof child === "string" ? child : flattenText(child))).join(" ");
}

describe("student workspace primitives", () => {
  it("renders compact context, flat sections, rows, and notices", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <StudentContextStrip title="Science 8" subtitle="Sampaguita · Ms. Reyes" status="Active" />
          <StudentFlatSection title="Continue learning" subtitle="Two active lessons">
            <StudentListRow title="Particle Theory" subtitle="Lesson 1" icon="book-outline" onPress={jest.fn()} />
          </StudentFlatSection>
          <StudentInlineNotice title="Some data could not refresh" description="Available lessons remain visible." />
        </>,
      );
    });
    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Science 8");
    expect(text).toContain("Particle Theory");
    expect(text).toContain("Some data could not refresh");
  });

  it("opens the class workspace picker and selects a destination", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <StudentWorkspaceSwitcher
          activeKey="modules"
          items={[
            { key: "modules", label: "Modules", icon: "view-module-outline" },
            { key: "grades", label: "Grades", icon: "chart-line" },
          ]}
          onSelect={onSelect}
        />,
      );
    });
    const trigger = renderer!.root.findByProps({ accessibilityLabel: "Open class workspace menu" });
    expect(trigger.props.style.minHeight).toBeGreaterThanOrEqual(44);
    act(() => trigger.props.onPress());
    const grades = renderer!.root.findByProps({ accessibilityLabel: "Open Grades workspace" });
    expect(grades.props.accessibilityState).toEqual({ selected: false });
    act(() => grades.props.onPress());
    expect(onSelect).toHaveBeenCalledWith("grades");
  });

  it("exposes semantic selected segments", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <StudentSegmentedControl
          accessibilityLabel="Assessment status filters"
          activeKey="pending"
          items={[{ key: "pending", label: "Pending" }, { key: "completed", label: "Completed" }]}
          onSelect={onSelect}
        />,
      );
    });
    const completed = renderer!.root.findByProps({ accessibilityLabel: "Completed" });
    expect(completed.props.accessibilityState).toEqual({ selected: false });
    act(() => completed.props.onPress());
    expect(onSelect).toHaveBeenCalledWith("completed");
  });

  it("closes sheets and keeps the primary action safe-area aware", () => {
    const onClose = jest.fn();
    const onPrimary = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <StudentActionSheet visible title="Choose class" onClose={onClose}>Sheet content</StudentActionSheet>
          <StudentBottomActionBar primaryLabel="Mark Complete" onPrimary={onPrimary} />
        </>,
      );
    });
    expect(flattenText(renderer!.toJSON())).toContain("Sheet content");
    act(() => renderer!.root.findByProps({ accessibilityLabel: "Close Choose class" }).props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    const action = renderer!.root.findByProps({ accessibilityLabel: "Mark Complete" });
    expect(action.props.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(renderer!.root.findByProps({ testID: "student-bottom-action-bar" }).props.style.paddingBottom).toBe(18);
  });
});
