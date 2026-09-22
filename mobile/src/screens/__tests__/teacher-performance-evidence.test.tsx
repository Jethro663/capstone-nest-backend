// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { TeacherPerformanceScreen } from "../TeacherPerformanceScreen";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return { View: component("View"), Text: component("Text"), Pressable: component("Pressable") };
});

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "teacher-1" } }),
}));

jest.mock("../../api/hooks", () => {
  const query = (data: unknown) => ({ data, isLoading: false, isError: false, isRefetching: false, refetch: jest.fn() });
  return {
  useTeacherClasses: () => query([{ id: "class-1", subjectCode: "MATH-7", subjectName: "Mathematics" }]),
  useTeacherClassPerformanceSummary: () => query({ classId: "class-1", threshold: 74, totalStudents: 24, studentsWithData: 22, atRiskCount: 5, averages: { blended: 74.5, assessment: 76, classRecord: 73 } }),
  useTeacherClassAtRisk: () => query({ students: [] }),
  useTeacherInterventionQuizComparison: () => query({ comparisons: [{
    caseId: "case-1", assignmentId: "assignment-1", assessmentId: "assessment-1",
    assessmentTitle: "Fractions quiz", studentId: "student-1",
    student: { firstName: "Liam", lastName: "Navarro" }, filterId: "all",
    beforeScorePercent: 52, afterScorePercent: 78, deltaScorePercent: 26,
    trend: "improved",
  }], filterOptions: [] }),
  useTeacherClassDiagnostics: jest.fn(() => query({ conceptHotspots: [
    { concept: "decimals", wrongCount: 2, masteryScore: 83, evidenceCount: 5 },
    { concept: "fractions", wrongCount: 6, masteryScore: 41, evidenceCount: 8 },
  ] })),
};
});

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const Text = (props: Record<string, unknown>) => ReactRuntime.createElement("Text", props, props.children);
  return {
    teacherTheme: { border: "#ddd", active: "#eee", green: "green", red: "red", muted: "gray", amber: "orange" },
    stripRichText: (value: string) => value.replace(/<[^>]*>/g, ""),
    TeacherScreen: ({ title, children }: any) => ReactRuntime.createElement("Screen", null, ReactRuntime.createElement(Text, null, title), children),
    TeacherSelectMenu: ({ label }: any) => ReactRuntime.createElement(Text, null, label),
    TeacherRow: ({ title, subtitle }: any) => ReactRuntime.createElement("Row", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherEmpty: ({ title }: any) => ReactRuntime.createElement(Text, null, title),
    TeacherActionButton: ({ label }: any) => ReactRuntime.createElement(Text, null, label),
  };
});

jest.mock("../../components/teacher/TeacherWorkspacePrimitives", () => {
  const ReactRuntime = require("react");
  const Text = (props: Record<string, unknown>) => ReactRuntime.createElement("Text", props, props.children);
  return {
    TeacherFlatSection: ({ title, subtitle, children }: any) => ReactRuntime.createElement("Section", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), children),
    TeacherSummaryStrip: ({ items }: any) => ReactRuntime.createElement("Summary", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherSegmentedTabs: ({ items, onSelect }: any) => ReactRuntime.createElement("Tabs", null, items.map((item: any) => ReactRuntime.createElement("Pressable", { key: item.key, accessibilityLabel: item.label, onPress: () => onSelect(item.key) }, ReactRuntime.createElement(Text, null, item.label)))),
  };
});

const flatten = (node: TestRenderer.ReactTestInstance): string => node.children
  .map((child) => typeof child === "string" ? child : flatten(child))
  .join(" ");

it("uses canonical summary coverage and presents sorted concept evidence", async () => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<TeacherPerformanceScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never} />);
  });
  expect(flatten(renderer!.root)).toContain("Average:74.5%");
  expect(flatten(renderer!.root)).toContain("Score coverage:22/24");
  expect(require("../../api/hooks").useTeacherClassDiagnostics).toHaveBeenLastCalledWith(undefined);

  await act(async () => {
    renderer!.root.findAllByType("Pressable").find((node) => node.props.accessibilityLabel === "Concepts")!.props.onPress();
  });
  const rows = renderer!.root.findAllByType("Row");
  expect(require("../../api/hooks").useTeacherClassDiagnostics).toHaveBeenLastCalledWith("class-1");
  expect(flatten(rows[0])).toContain("Fractions");
  expect(flatten(rows[0])).toContain("41.0%");
  expect(flatten(rows[0])).toContain("guided reteaching");
  expect(flatten(rows[1])).toContain("Decimals");

  await act(async () => {
    renderer!.root.findAllByType("Pressable").find((node) => node.props.accessibilityLabel === "Response")!.props.onPress();
  });
  expect(flatten(renderer!.root)).toContain("sample size unavailable");
  expect(flatten(renderer!.root)).toContain("scope unavailable");
  expect(flatten(renderer!.root)).not.toContain("undefined");
  await act(async () => renderer!.unmount());
});
