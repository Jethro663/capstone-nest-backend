import React from "react";
// @ts-expect-error Test renderer types are not installed in this workspace.
import TestRenderer, { act } from "react-test-renderer";
import { TeacherCreateAssessmentScreen } from "../TeacherCreateAssessmentScreen";
import { assessmentsApi } from "../../api/services/assessments";
import {
  createAssignmentWithRecovery,
  getPendingAssignmentCreation,
} from "../../features/assignment-creation/recovery";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const invalidateQueries = jest.fn(async () => {});

jest.mock("react-native", () => {
  const React = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children);
  class Value {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
    setValue(value: number) {
      this.value = value;
    }
    interpolate() {
      return this.value;
    }
  }
  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(async () => true),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Animated: {
      Value,
      View: component("AnimatedView"),
      timing: (_value: unknown, _config: unknown) => ({ start: jest.fn() }),
    },
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: { OS: "android" },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Switch: component("Switch"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: (props: React.PropsWithChildren) =>
    React.createElement("SafeAreaView", props, props.children),
}));
jest.mock(
  "@react-native-community/datetimepicker",
  () => (props: object) => React.createElement("DateTimePicker", props),
);
jest.mock("expo-crypto", () => ({ randomUUID: () => "mutation-1" }));
jest.mock("@tanstack/react-query", () => {
  const data = {
    classId: "class-1",
    schoolYear: "2026-2027",
    defaultPeriod: "Q1",
    periods: [
      {
        key: "Q1",
        label: "Term 1",
        canPrepare: true,
        canRelease: true,
        readOnlyReason: null,
        workbook: null,
      },
    ],
    categories: [
      { key: "written_work", label: "Written Work" },
      { key: "performance_task", label: "Performance Task" },
    ],
  };
  return {
    useQueryClient: () => ({ invalidateQueries }),
    useQuery: () => ({
      data,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
  };
});
jest.mock("../../api/hooks", () => ({
  queryKeys: { assessments: (classId: string) => ["assessments", classId] },
}));
jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: {
    getCreationContext: jest.fn(),
    saveEditor: jest.fn(),
  },
}));
jest.mock("../../api/errors", () => ({
  normalizeApiError: () => ({ message: "Request failed" }),
}));
jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "teacher-1" } }),
}));
jest.mock("../../features/assignment-creation/recovery", () => ({
  getPendingAssignmentCreation: jest.fn(async () => null),
  createAssignmentWithRecovery: jest.fn(async (_actor, _request, save) =>
    save(_request),
  ),
}));
jest.mock("../../components/teacher/TeacherMobilePrimitives", () => ({
  teacherTheme: {
    bg: "#fff",
    text: "#111",
    subtext: "#555",
    muted: "#777",
    red: "#b00",
    redSoft: "#fee",
    redLine: "#eaa",
    border: "#ddd",
  },
}));

const flatten = (node: { children: Array<string | object> }): string =>
  node.children
    .map((child) =>
      typeof child === "string" ? child : flatten(child as typeof node),
    )
    .join(" ");

async function mount() {
  const navigation = {
    goBack: jest.fn(),
    replace: jest.fn(),
  };
  let renderer: ReturnType<typeof TestRenderer.create>;
  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherCreateAssessmentScreen
        navigation={navigation as never}
        route={{ params: { classId: "class-1" } } as never}
      />,
    );
  });
  return { renderer: renderer!, navigation };
}

async function press(
  renderer: ReturnType<typeof TestRenderer.create>,
  text: string,
) {
  await act(async () => {
    renderer.root
      .find(
        (node: {
          type: unknown;
          props: { onPress?(): void };
          children: Array<string | object>;
        }) => node.type === "Pressable" && flatten(node) === text,
      )
      .props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getPendingAssignmentCreation).mockResolvedValue(null);
  jest.mocked(assessmentsApi.saveEditor).mockResolvedValue({
    assessment: {
      id: "assessment-1",
      classId: "class-1",
      title: "",
      type: "quiz",
      isPublished: false,
    },
    revision: 1,
    questionIds: {},
    publicationIssues: [],
  });
});

it("explains both fixed formats and cancel creates nothing", async () => {
  const { renderer, navigation } = await mount();
  expect(flatten(renderer.root)).toContain("Question assignment");
  expect(flatten(renderer.root)).toContain("File upload assignment");
  expect(flatten(renderer.root)).toContain("format is fixed after creation");
  await press(renderer, "Cancel");
  expect(navigation.goBack).toHaveBeenCalled();
  expect(createAssignmentWithRecovery).not.toHaveBeenCalled();
});

it("allows skip after choosing a format and opens the confirmed draft", async () => {
  const { renderer, navigation } = await mount();
  await press(
    renderer,
    "Question assignment Students answer inside Nexora. Use automatic or teacher grading, multiple attempts, timers, and question randomization. Best for quizzes, written responses, and practice.",
  );
  await press(
    renderer,
    "Skip setup & start editing Creates an unpublished, unplaced draft.",
  );
  expect(createAssignmentWithRecovery).toHaveBeenCalledWith(
    "teacher-1",
    expect.objectContaining({
      mutationId: "mutation-1",
      classId: "class-1",
      settings: { title: "", type: "quiz", quarter: "Q1" },
    }),
    expect.any(Function),
  );
  expect(navigation.replace).toHaveBeenCalledWith("TeacherAssessmentEditor", {
    assessmentId: "assessment-1",
    classId: "class-1",
    created: true,
  });
});
