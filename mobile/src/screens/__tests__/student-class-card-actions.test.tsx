// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StudentClassCard } from "../student-classes/StudentClassCard";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (input: unknown) =>
        (Array.isArray(input) ? input : [input]).filter(Boolean).reduce((result, entry) => ({ ...result, ...entry }), {}),
    },
  };
});

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react");
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

function resolvedStyle(style: unknown) {
  const value = typeof style === "function" ? style({ pressed: false }) : style;
  return (Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .reduce((result, entry) => ({ ...result, ...entry }), {});
}

describe("StudentClassCard actions", () => {
  it("keeps every action bounded and aligns fixed icon and trailing slots", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <StudentClassCard
          classItem={{
            id: "class-1",
            subjectName: "Mathematics",
            subjectGradeLevel: "10",
            sectionName: "Bonifacio",
            teacherName: "Ms. Santos",
            classmatesCount: 32,
            totalLessons: 8,
            completedLessons: 3,
            progress: 38,
            totalAssessments: 4,
            pendingCount: 2,
            status: "inProgress",
          }}
          onOpenClass={jest.fn()}
          onOpenTasks={jest.fn()}
          onOpenSchedule={jest.fn()}
        />,
      );
    });

    const primary = renderer!.root.findByProps({ accessibilityLabel: "Continue learning" });
    const tasks = renderer!.root.findByProps({ accessibilityLabel: "View tasks" });
    const schedule = renderer!.root.findByProps({ accessibilityLabel: "View schedule" });
    expect(resolvedStyle(primary.props.style)).toMatchObject({ minHeight: 52, width: "100%" });
    expect(resolvedStyle(tasks.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(resolvedStyle(schedule.props.style).minHeight).toBeGreaterThanOrEqual(44);

    const iconSlots = renderer!.root.findAll(
      (node) => node.type === "View" && node.props.testID === "class-action-icon-slot",
    );
    expect(iconSlots).toHaveLength(2);
    iconSlots.forEach((slot) => expect(slot.props.style).toMatchObject({ width: 24, flexShrink: 0 }));
    expect(renderer!.root.find(
      (node) => node.type === "View" && node.props.testID === "class-action-trailing-slot",
    ).props.style).toMatchObject({ width: 24, flexShrink: 0 });
  });
});
