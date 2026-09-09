// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  TeacherClassPresentationCard,
  TeacherSectionPresentationCard,
} from "../TeacherPresentationCards";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Image: component("Image"),
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
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

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return (node.children ?? [])
    .map((child) => (typeof child === "string" ? child : flattenText(child)))
    .join(" ");
}

describe("teacher presentation cards", () => {
  it("uses the soft P2 GABHS fallback hero and keeps class actions intact", () => {
    const onOpen = jest.fn();
    const onCustomize = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherClassPresentationCard
          classItem={{
            id: "class-1",
            subjectCode: "MATH-7",
            subjectName: "Mathematics",
            sectionId: "section-1",
            section: { id: "section-1", name: "Bonifacio", gradeLevel: "7" },
            schoolYear: "2026-2027",
            isActive: true,
            enrollmentCount: 35,
          }}
          schedule="M/W/F · 8:00 AM-9:00 AM · Room 201"
          onOpen={onOpen}
          onCustomize={onCustomize}
        />,
      );
    });

    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Mathematics");
    expect(text).toContain("Grade 7");
    expect(text).toContain("35");
    expect(text).toContain("Open class");
    expect(renderer!.root.findByType("LinearGradient").props.colors).toEqual([
      "#C96B68",
      "#A85A5B",
      "#98484A",
    ]);

    act(() => renderer!.root.findByProps({ accessibilityLabel: "Customize Mathematics" }).props.onPress({ stopPropagation: jest.fn() }));
    expect(onCustomize).toHaveBeenCalledTimes(1);
    act(() => renderer!.root.findByProps({ accessibilityLabel: "Open Mathematics" }).props.onPress());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows the web section-card information hierarchy without inventing data", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherSectionPresentationCard
          section={{
            id: "section-1",
            name: "Bonifacio",
            gradeLevel: "7",
            schoolYear: "2026-2027",
            roomNumber: "201",
            capacity: 40,
            studentCount: 30,
            isActive: true,
            adviser: { id: "teacher-1", firstName: "Maria", lastName: "Santos" },
          }}
          onOpen={jest.fn()}
          onCustomize={jest.fn()}
        />,
      );
    });

    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Bonifacio");
    expect(text).toContain("Maria Santos");
    expect(text).toContain("Students");
    expect(text).toContain("Capacity");
    expect(text).toContain("Occupancy");
    expect(text).toContain("75%");
    expect(text).toContain("Open section");
    const gradients = renderer!.root.findAllByType("LinearGradient");
    expect(gradients[1].props.colors).toEqual(["#C96B68", "#E6A09B"]);
  });
});
