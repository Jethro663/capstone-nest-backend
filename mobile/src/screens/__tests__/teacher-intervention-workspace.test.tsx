// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { TeacherInterventionWorkspaceContent } from "../TeacherDeepParityScreens";
import { aiApi } from "../../api/services/ai";
import { assessmentsApi } from "../../api/services/assessments";
import { lessonsApi } from "../../api/services/lessons";
import { lxpApi } from "../../api/services/lxp";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    Alert: { alert: jest.fn() },
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    TextInput: component("TextInput"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("../TeacherAssessmentReviewScreen", () => ({
  TeacherAssessmentReviewScreen: () => null,
}));

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");
  const Pressable = component("Pressable");
  const TextInput = component("TextInput");

  return {
    teacherTheme: {
      red: "#00288E",
      green: "#166534",
      amber: "#B45309",
      blue: "#1E40AF",
      purple: "#6D28D9",
      muted: "#64748B",
      dim: "#757684",
      text: "#191C1E",
      subtext: "#475569",
      border: "#E2E8F0",
      surface: "#FFFFFF",
      redSoft: "#DDE1FF",
      greenSoft: "#DCFCE7",
      amberSoft: "#FEF3C7",
      blueSoft: "#D0E1FB",
      purpleSoft: "#DAE2FD",
      active: "#F2F4F6",
    },
    stripRichText: (value?: string) => value || "",
    TeacherScreen: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, children),
    TeacherPanel: ({ title, subtitle, children, action }: any) =>
      ReactRuntime.createElement("TeacherPanel", null, title ? ReactRuntime.createElement(Text, null, title) : null, subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, action, children),
    TeacherStats: ({ items }: any) =>
      ReactRuntime.createElement("TeacherStats", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherChip: ({ label, onPress }: any) =>
      ReactRuntime.createElement(Pressable, { onPress }, ReactRuntime.createElement(Text, null, label)),
    TeacherActionButton: ({ label, onPress, disabled }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled }, ReactRuntime.createElement(Text, null, label)),
    TeacherEmpty: ({ title, subtitle }: any) =>
      ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherRow: ({ title, subtitle, onPress, right }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled: !onPress }, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, right),
    TeacherSearch: component("TeacherSearch"),
    TeacherInlineField: ({ label, value, onChangeText }: any) =>
      ReactRuntime.createElement(
        "TeacherInlineField",
        null,
        ReactRuntime.createElement(Text, null, label),
        ReactRuntime.createElement(TextInput, { accessibilityLabel: label, value, onChangeText }),
      ),
  };
});

jest.mock("../../api/services/lxp", () => ({
  lxpApi: {
    getTeacherCaseDetail: jest.fn(),
    getTeacherQueue: jest.fn(),
    getTeacherCase: jest.fn(),
    assignIntervention: jest.fn(),
    activateIntervention: jest.fn(),
    regenerateInterventionPath: jest.fn(),
    approveGeneratedArtifacts: jest.fn(),
    rejectGeneratedArtifacts: jest.fn(),
  },
}));

jest.mock("../../api/services/classes", () => ({
  classesApi: {},
}));

jest.mock("../../api/services/sections", () => ({
  sectionsApi: {},
}));

jest.mock("../../api/services/extractions", () => ({
  extractionsApi: {},
}));

jest.mock("../../api/services/file-upload", () => ({
  fileUploadApi: {},
}));

jest.mock("../../api/services/modules", () => ({
  modulesApi: {},
}));

jest.mock("../../api/services/ai", () => ({
  aiApi: {
    getTeacherClassPolicy: jest.fn(),
    updateTeacherClassPolicy: jest.fn(),
    createInterventionJob: jest.fn(),
    getInterventionJobResult: jest.fn(),
    getTeacherJobStatus: jest.fn(),
  },
}));

jest.mock("../../api/services/lessons", () => ({
  lessonsApi: { getByClass: jest.fn() },
}));

jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: { getByClass: jest.fn() },
}));

const mockedAiApi = aiApi as jest.Mocked<typeof aiApi>;
const mockedAssessmentsApi = assessmentsApi as jest.Mocked<typeof assessmentsApi>;
const mockedLessonsApi = lessonsApi as jest.Mocked<typeof lessonsApi>;
const mockedLxpApi = lxpApi as jest.Mocked<typeof lxpApi>;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  const children = Array.isArray(node.children)
    ? node.children.map((child) => (typeof child === "string" ? child : flattenText(child))).join(" ")
    : "";
  return children;
}

function flattenInstance(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) => {
      if (typeof child === "string") return child;
      return flattenInstance(child as TestRenderer.ReactTestInstance);
    })
    .join(" ");
}

function findPressableByText(root: TestRenderer.ReactTestInstance, text: string) {
  return root.find((node) => node.type === "Pressable" && flattenInstance(node).includes(text));
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("TeacherInterventionWorkspaceContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpApi.getTeacherCaseDetail.mockResolvedValue({
      id: "case-1",
      classId: "class-1",
      studentId: "student-1",
      status: "active",
      openedAt: "2026-05-01T00:00:00.000Z",
      closedAt: null,
      triggerScore: 52,
      thresholdApplied: 74,
      note: null,
      completion: { totalCheckpoints: 0, completedCheckpoints: 0, completionPercent: 0 },
      progress: { xpTotal: 0, starsTotal: 0, streakDays: 0, checkpointsCompleted: 0, lastActivityAt: null },
      assignments: [],
      generatedArtifacts: null,
      latestSnapshot: null,
      weakConcepts: [],
      recentRiskTransitions: [],
      links: { performancePage: "" },
      student: { id: "student-1", firstName: "Liam", lastName: "Navarro", email: "liam@example.test" },
      class: { id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-7" },
    } as never);
    mockedLxpApi.getTeacherQueue.mockResolvedValue({
      queue: [
        {
          id: "case-1",
          classId: "class-1",
          studentId: "student-1",
          status: "active",
          triggerScore: 52,
          thresholdApplied: 74,
          totalCheckpoints: 0,
          completedCheckpoints: 0,
          completionPercent: 0,
          aiPlanEligible: true,
          student: { id: "student-1", firstName: "Liam", lastName: "Navarro", email: "liam@example.test" },
        },
      ],
    } as never);
    mockedLxpApi.getTeacherCase.mockResolvedValue({ id: "case-1", status: "active" } as never);
    mockedLxpApi.assignIntervention.mockResolvedValue({ queue: [] } as never);
    mockedLessonsApi.getByClass.mockResolvedValue([{ id: "lesson-1", title: "Fractions lesson", isDraft: false }] as never);
    mockedAssessmentsApi.getByClass.mockResolvedValue([{ id: "assessment-1", title: "Retry quiz", isPublished: true }] as never);
    mockedAiApi.getTeacherClassPolicy.mockResolvedValue({
      classId: "class-1",
      mentorExplainEnabled: true,
      maxFollowUpTurns: 3,
      sourceScope: "class_materials",
      strictGrounding: true,
    } as never);
    mockedAiApi.updateTeacherClassPolicy.mockImplementation(async (_classId, payload) => ({
      classId: "class-1",
      mentorExplainEnabled: payload.mentorExplainEnabled ?? true,
      maxFollowUpTurns: payload.maxFollowUpTurns ?? 3,
      sourceScope: payload.sourceScope ?? "class_materials",
      strictGrounding: payload.strictGrounding ?? true,
    }) as never);
    mockedAiApi.createInterventionJob.mockResolvedValue({
      id: "job-1",
      jobId: "job-1",
      status: "completed",
      progressPercent: 100,
      message: "Done",
    } as never);
    mockedAiApi.getInterventionJobResult.mockResolvedValue({
      job: { id: "job-1", jobId: "job-1", status: "completed" },
      result: {
        outputId: "output-1",
        outputType: "intervention_recommendation",
        structuredOutput: {
          caseId: "case-1",
          weakConcepts: ["Fractions"],
          recommendedLessons: [{ lessonId: "lesson-1", title: "Fractions lesson", reason: "Weak concept" }],
          recommendedAssessments: [{ assessmentId: "assessment-1", title: "Retry quiz", reason: "Validate mastery" }],
          aiSummary: { summary: "Review fractions", teacherActions: [], studentFocus: [] },
          suggestedAssignmentPayload: {
            lessonIds: ["lesson-1"],
            assessmentIds: ["assessment-1"],
            note: "AI note",
          },
        },
      },
    } as never);
  });

  it("assigns the exact web-parity payload after AI generation", async () => {
    const onAssigned = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TeacherInterventionWorkspaceContent
          navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
          caseId="case-1"
          classId="class-1"
          embedded
          onAssigned={onAssigned}
        />,
      );
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Teacher note for AI" }).props.onChangeText("Teacher note");
      findPressableByText(renderer!.root, "Generate AI plan").props.onPress();
      await flushPromises();
    });

    expect(flattenText(renderer!.toJSON())).toContain("Assign suggested path");

    await act(async () => {
      findPressableByText(renderer!.root, "Assign suggested path").props.onPress();
      await flushPromises();
    });

    expect(mockedLxpApi.assignIntervention).toHaveBeenCalledWith("case-1", {
      note: "Teacher note\nAI note",
      lessonAssignments: [
        {
          lessonId: "lesson-1",
          label: "AI plan: Fractions lesson",
          xpAwarded: 20,
        },
      ],
      assessmentAssignments: [
        {
          assessmentId: "assessment-1",
          label: "AI plan: Replay Assessments",
          xpAwarded: 30,
        },
      ],
    });
    expect(onAssigned).toHaveBeenCalledWith("class-1");
  });
});
