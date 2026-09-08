// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { TeacherAssessmentsScreen } from "../TeacherAssessmentsScreen";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTeacherAiJobs, useTeacherClasses } from "../../api/hooks";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    Pressable: component("Pressable"),
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

jest.mock("@tanstack/react-query", () => ({
  useQueries: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "teacher-1", userId: "teacher-1" } }),
}));

jest.mock("../../api/hooks", () => ({
  queryKeys: { assessments: (classId: string) => ["assessments", classId] },
  useTeacherAiJobs: jest.fn(),
  useTeacherClasses: jest.fn(),
}));

jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: { delete: jest.fn(), getByClass: jest.fn() },
}));

jest.mock("../../api/services/ai", () => ({ aiApi: { deleteTeacherJob: jest.fn() } }));
jest.mock("../../api/services/academic-state", () => ({ academicStateService: { getCurrent: jest.fn() } }));
jest.mock("../../api/teacher-ai-draft-jobs", () => ({ clearTeacherAiDraftJobIdIfMatches: jest.fn() }));
jest.mock("../../components/teacher/TeacherConfirmModal", () => ({ TeacherConfirmModal: () => null }));
jest.mock("../teacher-assessments/TeacherAiJobsPanel", () => {
  const ReactRuntime = require("react");
  return { TeacherAiJobsPanel: () => ReactRuntime.createElement("Text", null, "AI Draft Jobs Surface") };
});

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");
  return {
    teacherTheme: {
      red: "#DC2626", amber: "#B45309", green: "#166534", muted: "#64748B",
      text: "#0F172A", subtext: "#475569", dim: "#94A3B8", border: "#F1D4D4",
      surface: "#FFFFFF", surface2: "#FFF4F3", active: "#FFF1F2",
    },
    TeacherScreen: ({ title, children }: any) => ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), children),
    TeacherAccordionSection: ({ title, count, expanded, action, children }: any) => ReactRuntime.createElement(
      "TeacherAccordionSection",
      { title, count, expanded },
      ReactRuntime.createElement(Text, null, `${title}:${count}`),
      action,
      expanded ? children : null,
    ),
    TeacherSelectMenu: ({ label, selectedValue }: any) => ReactRuntime.createElement(Text, null, `${label}:${selectedValue}`),
    TeacherActionButton: ({ label }: any) => ReactRuntime.createElement(Text, null, label),
    TeacherEmpty: ({ title, subtitle }: any) => ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherRow: ({ title, subtitle, right, left }: any) => ReactRuntime.createElement("TeacherRow", null, left, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), right),
  };
});

const mockedUseQueries = useQueries as jest.Mock;
const mockedUseQuery = useQuery as jest.Mock;
const mockedUseTeacherClasses = useTeacherClasses as jest.Mock;
const mockedUseTeacherAiJobs = useTeacherAiJobs as jest.Mock;

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  return (node.children ?? []).map((child) => typeof child === "string" ? child : flattenText(child)).join(" ");
}

describe("teacher assessment workspace layout", () => {
  it("prioritizes class accordions, preserves empty-class creation, and leaves AI jobs last", () => {
    mockedUseTeacherClasses.mockReturnValue({
      data: [
        { id: "english", subjectCode: "ENG", subjectName: "English", section: { name: "8-A" }, schoolYear: "2026-2027" },
        { id: "math", subjectCode: "MATH", subjectName: "Mathematics", section: { name: "8-B" }, schoolYear: "2026-2027" },
      ],
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
    mockedUseTeacherAiJobs.mockReturnValue({ data: [], isLoading: false, isError: false, isRefetching: false, refetch: jest.fn() });
    mockedUseQueries.mockReturnValue([
      { data: [], isError: false, isLoading: false, isRefetching: false, refetch: jest.fn() },
      { data: [{ id: "assessment-1", classId: "math", title: "Fractions Quiz", isPublished: false, questions: [] }], isError: false, isLoading: false, isRefetching: false, refetch: jest.fn() },
    ]);
    mockedUseQuery.mockReturnValue({ data: { policy: { periods: [] } }, isError: false, refetch: jest.fn() });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherAssessmentsScreen
          navigation={{ navigate: jest.fn() } as never}
          route={{ key: "Assessments", name: "Assessments" } as never}
        />,
      );
    });

    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Class:all");
    expect(text).toContain("Assessments by class");
    expect(text).toContain("ENG · English:0");
    expect(text).toContain("Create first assessment");
    expect(text).not.toContain("All Quarters");
    expect(text).not.toContain("Create and edit");
    expect(text.indexOf("Assessments by class")).toBeLessThan(text.indexOf("AI Draft Jobs:0"));
  });
});
