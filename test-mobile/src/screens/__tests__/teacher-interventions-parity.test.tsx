// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { TeacherInterventionsScreen } from "../TeacherInterventionsScreen";
import { lxpApi } from "../../api/services/lxp";
import { useAuth } from "../../providers/AuthProvider";
import {
  useTeacherClasses,
  useTeacherInterventionClassReport,
  useTeacherInterventionsHistory,
  useTeacherInterventionsQueue,
  useTeacherPendingInterventions,
} from "../../api/hooks";

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

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");
  const Pressable = component("Pressable");
  const TextInput = component("TextInput");

  return {
    teacherTheme: { border: "#ddd" },
    TeacherScreen: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, children),
    TeacherPanel: ({ title, subtitle, children, action }: any) =>
      ReactRuntime.createElement("TeacherPanel", null, title ? ReactRuntime.createElement(Text, null, title) : null, subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, action, children),
    TeacherStats: ({ items }: any) =>
      ReactRuntime.createElement("TeacherStats", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherChip: ({ label, onPress, active }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, active }, ReactRuntime.createElement(Text, null, label)),
    TeacherActionButton: ({ label, onPress, disabled }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled }, ReactRuntime.createElement(Text, null, label)),
    TeacherEmpty: ({ title, subtitle }: any) =>
      ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherRow: ({ title, subtitle, onPress, right }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled: !onPress }, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, right),
    TeacherSearch: ({ value, onChangeText, placeholder }: any) =>
      ReactRuntime.createElement(TextInput, { value, onChangeText, placeholder }),
  };
});

jest.mock("../TeacherDeepParityScreens", () => {
  const ReactRuntime = require("react");
  return {
    TeacherInterventionWorkspaceContent: ({ caseId }: { caseId: string }) =>
      ReactRuntime.createElement("TeacherInterventionWorkspaceContent", null, `Workspace ${caseId}`),
  };
});

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../api/hooks", () => ({
  useTeacherClasses: jest.fn(),
  useTeacherInterventionsQueue: jest.fn(),
  useTeacherInterventionsHistory: jest.fn(),
  useTeacherInterventionClassReport: jest.fn(),
  useTeacherPendingInterventions: jest.fn(),
}));

jest.mock("../../api/services/lxp", () => ({
  lxpApi: {
    activateIntervention: jest.fn(),
    resolveIntervention: jest.fn(),
    regenerateInterventionPath: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseTeacherClasses = useTeacherClasses as jest.Mock;
const mockedUseTeacherInterventionsQueue = useTeacherInterventionsQueue as jest.Mock;
const mockedUseTeacherInterventionsHistory = useTeacherInterventionsHistory as jest.Mock;
const mockedUseTeacherInterventionClassReport = useTeacherInterventionClassReport as jest.Mock;
const mockedUseTeacherPendingInterventions = useTeacherPendingInterventions as jest.Mock;
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

const refetch = jest.fn().mockResolvedValue({});

function seedHooks() {
  mockedUseAuth.mockReturnValue({ user: { id: "teacher-1", userId: "teacher-1" } });
  mockedUseTeacherClasses.mockReturnValue({
    data: [{ id: "class-1", subjectCode: "MATH-7", subjectName: "Mathematics" }],
    isRefetching: false,
    refetch,
  });
  mockedUseTeacherInterventionsQueue.mockReturnValue({
    data: {
      classId: "class-1",
      threshold: 74,
      queue: [
        {
          id: "case-1",
          classId: "class-1",
          studentId: "student-1",
          studentName: "Navarro, Liam",
          status: "pending",
          triggerScore: 52,
          thresholdApplied: 74,
          latestBlendedScore: 55,
          totalCheckpoints: 0,
          completedCheckpoints: 0,
          completionPercent: 0,
          aiPlanEligible: true,
        },
      ],
    },
    isRefetching: false,
    refetch,
  });
  mockedUseTeacherInterventionsHistory.mockReturnValue({
    data: {
      classId: "class-1",
      scoreThreshold: 60,
      history: [
        {
          id: "case-history",
          classId: "class-1",
          studentId: "student-2",
          student: { firstName: "Ana", lastName: "Reyes", email: "ana@example.test" },
          status: "completed",
          openedAt: "2026-05-01T00:00:00.000Z",
          closedAt: "2026-05-02T00:00:00.000Z",
          triggerScore: 58,
          thresholdApplied: 74,
          completion: { totalCheckpoints: 2, completedCheckpoints: 2, completionPercent: 100 },
          pathScore: { source: "assessment_retry", assignmentId: "assignment-1", attemptId: "attempt-1", scorePercent: 55, submittedAt: null },
          canRegenerate: true,
          assignments: [{ id: "assignment-1", label: "Retry quiz", xpAwarded: 30 }],
        },
      ],
    },
    isRefetching: false,
    refetch,
  });
  mockedUseTeacherInterventionClassReport.mockReturnValue({
    data: {
      classId: "class-1",
      threshold: 74,
      summary: { totalCases: 1, pendingCases: 1, activeCases: 0, completedCases: 1, interventionParticipation: 2, averageDelta: 4.25 },
      rows: [{ id: "case-1", studentId: "student-1", status: "pending", triggerScore: 52, currentBlendedScore: 56, improvementDelta: 4 }],
      leaderboard: [
        {
          rank: 1,
          studentId: "student-1",
          xpTotal: 220,
          starsTotal: 2,
          streakDays: 3,
          checkpointsCompleted: 4,
          lastActivityAt: null,
          student: { firstName: "Liam", lastName: "Navarro", email: "liam@example.test" },
        },
      ],
    },
    isRefetching: false,
    refetch,
  });
  mockedUseTeacherPendingInterventions.mockReturnValue({
    data: { pendingCount: 1, classBreakdown: [] },
    isRefetching: false,
    refetch,
  });
}

describe("TeacherInterventionsScreen parity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedHooks();
    mockedLxpApi.activateIntervention.mockResolvedValue({ queue: [] } as never);
    mockedLxpApi.resolveIntervention.mockResolvedValue({ queue: [] } as never);
    mockedLxpApi.regenerateInterventionPath.mockResolvedValue({
      case: { id: "case-regenerated", status: "active" },
    } as never);
  });

  it("keeps filters clickable while an intervention workspace is open", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherInterventionsScreen
          navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
          route={{ key: "TeacherInterventions", name: "TeacherInterventions", params: { classId: "class-1" } } as never}
        />,
      );
    });

    act(() => {
      findPressableByText(renderer!.root, "Open Workspace").props.onPress();
    });
    expect(flattenText(renderer!.toJSON())).toContain("Workspace case-1");

    act(() => {
      findPressableByText(renderer!.root, "History").props.onPress();
    });
    const text = flattenText(renderer!.toJSON());
    expect(text).toContain("Workspace case-1");
    expect(text).toContain("Intervention History");
    expect(text).toContain("Reyes");
  });

  it("posts resolve requests from the queue action", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TeacherInterventionsScreen
          navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
          route={{ key: "TeacherInterventions", name: "TeacherInterventions", params: { classId: "class-1" } } as never}
        />,
      );
    });

    await act(async () => {
      await findPressableByText(renderer!.root, "Resolve").props.onPress();
    });

    expect(mockedLxpApi.resolveIntervention).toHaveBeenCalledWith("case-1", "Resolved by teacher queue");
  });
});
