// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MobileClassRecordWorkbook } from "../MobileClassRecordWorkbook";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("../TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  return {
    TeacherActionButton: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("TeacherActionButton", props),
    TeacherEmpty: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("TeacherEmpty", props),
    TeacherPanel: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("TeacherPanel", props, props.children),
    teacherTheme: {
      amber: "amber",
      border: "border",
      green: "green",
      red: "red",
      subtext: "subtext",
      text: "text",
    },
  };
});

const student = (id: string, removed: boolean) => ({
  studentId: id,
  firstName: removed ? "Hanna" : "Ana",
  lastName: removed ? "History" : "Santos",
  enrollmentState: removed ? "removed" : "active",
  isRemoved: removed,
  categories: [],
  initialGrade: 80,
  quarterlyGrade: 82,
  remarks: "Passed",
});

const workbook = (status: "draft" | "finalized") => ({
  classRecord: {
    id: `record-${status}`,
    classId: "class-1",
    gradingPeriod: "Q1",
    status,
  },
  policy: { periods: [] },
  academicCapabilities: {},
  canReopen: false,
  header: { quarter: "Q1", subject: "Math", section: "Bonifacio" },
  categories: [],
  students: [student("current", false), student("historical", true)],
});

function text(
  node:
    | TestRenderer.ReactTestRendererJSON
    | TestRenderer.ReactTestRendererJSON[]
    | null,
): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return (node.children ?? [])
    .map((child) => (typeof child === "string" ? child : text(child)))
    .join(" ");
}

describe("MobileClassRecordWorkbook learner visibility", () => {
  it("defaults a draft record to current learners and can reveal historical learners", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileClassRecordWorkbook workbook={workbook("draft")} />,
      );
    });

    expect(text(renderer!.toJSON())).toContain("Santos");
    expect(text(renderer!.toJSON())).not.toContain("History");
    act(() =>
      renderer!.root
        .findByProps({ accessibilityLabel: "Show historical learners" })
        .props.onPress(),
    );
    expect(text(renderer!.toJSON())).toContain("History");
    expect(text(renderer!.toJSON())).not.toContain("Santos");
  });

  it("defaults a finalized record to all evidence-bearing learners", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileClassRecordWorkbook workbook={workbook("finalized")} />,
      );
    });
    expect(text(renderer!.toJSON())).toContain("Santos");
    expect(text(renderer!.toJSON())).toContain("History");
  });

  it("marks an archived account while keeping its enrolled row current", () => {
    const archivedWorkbook = workbook("draft");
    archivedWorkbook.students[0].accountState = "archived";
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileClassRecordWorkbook workbook={archivedWorkbook} />,
      );
    });

    expect(text(renderer!.toJSON())).toContain("Santos, Ana");
    expect(text(renderer!.toJSON())).toContain("Archived account");
    expect(
      renderer!.root.findByProps({
        accessibilityLabel: "Santos, Ana, archived account",
      }).props.style.textDecorationLine,
    ).toBe("line-through");
    expect(
      renderer!.root.findByProps({
        accessibilityLabel: "Show current learners",
      }).props.accessibilityState.selected,
    ).toBe(true);
  });

  it("shows a manually scored exemption as both excused and credited", () => {
    const scoredExemptionWorkbook = workbook("draft");
    scoredExemptionWorkbook.categories = [
      {
        id: "written",
        name: "Written Works",
        weight: 30,
        items: [{ id: "item-1", title: "Quiz", hps: 10, order: 1 }],
      },
    ];
    scoredExemptionWorkbook.students[0].categories = [
      {
        categoryId: "written",
        scores: [8],
        scoreStatuses: ["excused_with_score"],
        scoreReasons: ["Winner of the Division Science Fair"],
        total: 8,
        ps: 80,
        ws: 24,
      },
    ];
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileClassRecordWorkbook workbook={scoredExemptionWorkbook} />,
      );
    });

    expect(text(renderer!.toJSON())).toContain("Excused · 8.0/10");
  });
});
