// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  TeacherActionSheet,
  TeacherBottomActionBar,
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherInlineNotice,
  TeacherQuickActionRail,
  TeacherStepTabs,
  TeacherWorkspaceSwitcher,
} from "../TeacherWorkspacePrimitives";

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

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return (node.children ?? [])
    .map((child) => (typeof child === "string" ? child : flattenText(child)))
    .join(" ");
}

describe("teacher workspace primitives", () => {
  it("renders compact context and flat section copy", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <TeacherContextStrip title="Mathematics 10" subtitle="Bonifacio · SY 2026–2027" status="Active" />
          <TeacherFlatSection title="Modules" subtitle="Course outline"><>Module one</></TeacherFlatSection>
          <TeacherInlineNotice title="Enrollment scope locked" description="Grade 10 · Bonifacio" />
        </>,
      );
    });
    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Mathematics 10");
    expect(text).toContain("Module one");
    expect(text).toContain("Enrollment scope locked");
  });

  it("opens the workspace picker, exposes all destinations, and selects one", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherWorkspaceSwitcher
          activeKey="modules"
          items={[
            { key: "modules", label: "Modules", icon: "view-module-outline" },
            { key: "students", label: "Students", icon: "account-group-outline" },
          ]}
          onSelect={onSelect}
        />,
      );
    });
    const trigger = renderer!.root.findByProps({ accessibilityLabel: "Open class workspace menu" });
    expect(trigger.props.style.minHeight).toBeGreaterThanOrEqual(44);
    act(() => trigger.props.onPress());
    expect(flattenText(renderer!.toJSON())).toContain("Students");
    const students = renderer!.root.findByProps({ accessibilityLabel: "Open Students workspace" });
    expect(students.props.accessibilityState).toEqual({ selected: false });
    act(() => students.props.onPress());
    expect(onSelect).toHaveBeenCalledWith("students");
  });

  it("supports compact quick actions and selected workflow steps", () => {
    const onAction = jest.fn();
    const onStep = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <TeacherQuickActionRail actions={[{ label: "Add students", icon: "account-plus-outline", onPress: onAction }]} />
          <TeacherStepTabs
            activeStep="sources"
            steps={[{ key: "sources", label: "Sources" }, { key: "setup", label: "Setup" }, { key: "review", label: "Review" }]}
            onSelect={onStep}
          />
        </>,
      );
    });
    const action = renderer!.root.findByProps({ accessibilityLabel: "Add students" });
    expect(action.props.style.minHeight).toBeGreaterThanOrEqual(44);
    act(() => action.props.onPress());
    expect(onAction).toHaveBeenCalledTimes(1);
    const setup = renderer!.root.findByProps({ accessibilityLabel: "Setup step" });
    expect(setup.props.accessibilityState).toEqual({ selected: false });
    act(() => setup.props.onPress());
    expect(onStep).toHaveBeenCalledWith("setup");
  });

  it("closes an action sheet and keeps the bottom primary action safe-area aware", () => {
    const onClose = jest.fn();
    const onPrimary = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <TeacherActionSheet visible title="Module controls" onClose={onClose}><>Sheet content</></TeacherActionSheet>
          <TeacherBottomActionBar primaryLabel="Add selected" onPrimary={onPrimary} />
        </>,
      );
    });
    expect(flattenText(renderer!.toJSON())).toContain("Sheet content");
    const close = renderer!.root.findByProps({ accessibilityLabel: "Close Module controls" });
    act(() => close.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    const primary = renderer!.root.findByProps({ accessibilityLabel: "Add selected" });
    expect(primary.props.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(renderer!.root.findByProps({ testID: "teacher-bottom-action-bar" }).props.style.paddingBottom).toBe(18);
    act(() => primary.props.onPress());
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });
});
