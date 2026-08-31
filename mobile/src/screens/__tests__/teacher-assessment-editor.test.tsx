jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => {}),
}));
import React from "react";
// @ts-expect-error Test renderer types are not installed in this workspace.
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { TeacherAssessmentEditorScreen } from "../TeacherAssessmentEditorScreen";
import { assessmentsApi } from "../../api/services/assessments";
import {
  clearEditorRecovery,
  readEditorRecovery,
  writeEditorRecovery,
} from "../../features/assessment-editor/recovery";
import type { Assessment } from "../../types/assessment";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const mockPolicy = {
  periods: [
    { key: "Q1", label: "Term 1" },
    { key: "Q2", label: "Term 2" },
  ],
};
let mockAssessment: Assessment | undefined;
const mockClasses = [
  { id: "class-1", subjectName: "Mathematics", schoolYear: "2026-2027" },
];
const mockInvalidation = jest.fn();
const mockQueryClient = {
  invalidateQueries: mockInvalidation,
  setQueryData: jest.fn(),
};
jest.mock("react-native", () => {
  const React = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    AppState: { addEventListener: () => ({ remove: jest.fn() }) },
    Platform: { OS: "android" },
    Share: { share: jest.fn() },
    Image: component("Image"),
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: (props: React.PropsWithChildren) =>
    React.createElement("SafeAreaView", props, props.children),
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "00000000-0000-4000-8000-000000000001",
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
  useQuery: () => ({
    data: {
      current: { quarter: "Q1", schoolYear: "2026-2027" },
      policy: mockPolicy,
    },
    refetch: jest.fn(),
  }),
}));
jest.mock("../../api/hooks", () => ({
  queryKeys: {
    assessmentDetail: (id: string) => ["assessment-detail", id],
    assessments: (id: string) => ["assessments", id],
  },
  useAssessmentDetail: () => ({
    data: mockAssessment,
    refetch: async () => ({ data: mockAssessment }),
  }),
  useTeacherClasses: () => ({ data: mockClasses }),
}));
jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: { saveEditor: jest.fn() },
}));
jest.mock("../../api/services/academic-state", () => ({
  academicStateService: {},
}));
jest.mock("../../api/services/protected-files", () => ({
  buildProtectedUrl: (url: string) => url,
}));
jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "teacher-1" } }),
}));
jest.mock("../../features/assessment-editor/recovery", () => ({
  recoveryKey: (user: string, id: string, cls: string) =>
    `${user}:${id ?? cls}`,
  readEditorRecovery: jest.fn(),
  writeEditorRecovery: jest.fn(),
  clearEditorRecovery: jest.fn(),
}));
jest.mock("../../components/teacher/TeacherMobilePrimitives", () => ({
  teacherTheme: { text: "#123", red: "#123", border: "#eee" },
  stripRichText: (value: string) => value,
}));
jest.mock("../../components/ui/RichTextContent", () => ({
  RichTextContent: (props: { html: string }) =>
    React.createElement("RichTextContent", props),
}));
jest.mock("../../components/ui/AssessmentRichTextEditor", () => ({
  AssessmentRichTextEditor: (props: object) =>
    React.createElement("RichEditor", props),
}));
jest.mock("../../features/assessment-editor/SettingsFields", () => ({
  AssessmentSettingsFields: (props: object) =>
    React.createElement("SettingsFields", props),
  Choices: (props: object) => React.createElement("Choices", props),
  Field: (props: object) => React.createElement("Field", props),
  Toggle: (props: object) => React.createElement("Toggle", props),
}));

let renderer: ReturnType<typeof TestRenderer.create>;
let navigation: {
  goBack: jest.Mock;
  addListener: jest.Mock;
  dispatch: jest.Mock;
};
const flatten = (node: { children: Array<string | object> }): string =>
  node.children
    .map((child) =>
      typeof child === "string" ? child : flatten(child as typeof node),
    )
    .join(" ");
async function mount() {
  navigation = {
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
  };
  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherAssessmentEditorScreen
        navigation={navigation as never}
        route={
          {
            params: { assessmentId: mockAssessment?.id, classId: "class-1" },
          } as never
        }
      />,
    );
  });
}
async function press(text: string) {
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
function saved() {
  return {
    assessment: {
      id: "saved-1",
      classId: "class-1",
      title: "Untitled assessment",
      type: "quiz",
      isPublished: false,
      quarter: "Q1",
      editorRevision: 2,
      questions: [],
    } as Assessment,
    revision: 2,
    questionIds: {},
    publicationIssues: [],
  };
}
beforeEach(() => {
  mockClasses[0].schoolYear = "2026-2027";
  jest.clearAllMocks();
  mockAssessment = undefined;
  jest.mocked(readEditorRecovery).mockResolvedValue(null);
  jest.mocked(writeEditorRecovery).mockResolvedValue(undefined);
  jest.mocked(assessmentsApi.saveEditor).mockResolvedValue(saved());
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
});

it("the Save draft button sends incomplete questions atomically and never publishes", async () => {
  await mount();
  await press("Add question");
  await press("Save draft");
  expect(assessmentsApi.saveEditor).toHaveBeenCalledWith(
    undefined,
    expect.objectContaining({
      action: "save",
      settings: expect.objectContaining({ quarter: "Q1" }),
      questions: [
        expect.objectContaining({
          content: "",
          type: "multiple_choice",
          options: [
            expect.objectContaining({ text: "", isCorrect: false }),
            expect.objectContaining({ text: "", isCorrect: false }),
          ],
        }),
      ],
    }),
  );
  expect(mockInvalidation).toHaveBeenCalledWith({
    queryKey: ["assessments", "class-1"],
  });
});
it("retries the identical mutation after a lost response", async () => {
  jest.mocked(assessmentsApi.saveEditor).mockRejectedValueOnce({
    isAxiosError: true,
    code: "ERR_NETWORK",
    message: "Network Error",
  });
  await mount();
  await press("Add question");
  await press("Save draft");
  await press("Retry save");
  expect(jest.mocked(assessmentsApi.saveEditor).mock.calls[1]).toEqual(
    jest.mocked(assessmentsApi.saveEditor).mock.calls[0],
  );
});
it("allows preparing a future school year without enabling release", async () => {
  mockClasses[0].schoolYear = "2027-2028";
  await mount();
  const publish = renderer.root.find(
    (node: { type: unknown; children: Array<string | object> }) =>
      node.type === "Pressable" && flatten(node) === "Ready to give",
  );
  expect(publish.props.disabled).toBe(true);
  await press("Save draft");
  expect(assessmentsApi.saveEditor).toHaveBeenCalledWith(
    undefined,
    expect.objectContaining({
      action: "save",
      settings: expect.objectContaining({ quarter: "Q1" }),
    }),
  );
});
it("retains the recovery copy on a revision conflict and does not overwrite the server", async () => {
  mockAssessment = {
    ...saved().assessment,
    academicCapabilities: {
      canPrepare: true,
      canRelease: true,
      period: "Q1",
      schoolYear: "2026-2027",
    } as Assessment["academicCapabilities"],
  };
  jest.mocked(assessmentsApi.saveEditor).mockRejectedValueOnce({
    isAxiosError: true,
    response: {
      status: 409,
      data: { message: "Changed", code: "ASSESSMENT_REVISION_CONFLICT" },
    },
  });
  await mount();
  await press("Add question");
  await press("Save draft");
  expect(flatten(renderer.root)).toContain("Another device changed");
  expect(writeEditorRecovery).toHaveBeenCalled();
  expect(assessmentsApi.saveEditor).toHaveBeenCalledTimes(1);
  mockAssessment = {
    ...mockAssessment,
    title: "Newer server title",
    editorRevision: 3,
  };
  await press("Review server version");
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  await act(async () => {
    await buttons
      ?.find((button) => button.text === "Open server version")
      ?.onPress?.();
  });
  expect(flatten(renderer.root)).toContain("Newer server title");
  expect(flatten(renderer.root)).toContain(
    "Server version loaded · recovery copy kept",
  );
  expect(flatten(renderer.root)).not.toContain("Another device changed");
  expect(assessmentsApi.saveEditor).toHaveBeenCalledTimes(1);
});
it("preview does not create an attempt or reveal correct-answer markers", async () => {
  await mount();
  await press("Add question");
  await press("Preview");
  expect(flatten(renderer.root)).toContain("no attempt will be created");
  expect(flatten(renderer.root)).not.toContain("Correct answer");
  expect(assessmentsApi.saveEditor).not.toHaveBeenCalled();
});
it("edits fill-in-the-blank answer keys as plain text for automatic grading", async () => {
  await mount();
  await press("Add question");
  await act(async () =>
    renderer.root.findByType("Choices").props.onChange("fill_blank"),
  );
  const answer = renderer.root
    .findAllByType("Field")
    .find(
      (node: { props: { label: string } }) =>
        node.props.label === "Accepted answer 1",
    );
  expect(answer).toBeDefined();
  await act(async () => answer.props.onChange("mitochondria"));
  await press("Save draft");
  expect(
    jest.mocked(assessmentsApi.saveEditor).mock.calls[0][1].questions?.[0]
      .options?.[0].text,
  ).toBe("mitochondria");
});
it("shows academic conflicts without incorrectly locking the editor as a device conflict", async () => {
  jest.mocked(assessmentsApi.saveEditor).mockRejectedValueOnce({
    isAxiosError: true,
    response: {
      status: 409,
      data: {
        message: "The academic state changed. Refresh and try again.",
        code: "ACADEMIC_STATE_CHANGED",
      },
    },
  });
  await mount();
  await press("Add question");
  await press("Save draft");
  expect(flatten(renderer.root)).toContain("The academic state changed");
  expect(flatten(renderer.root)).not.toContain("Another device changed");
  await press("Save draft");
  expect(assessmentsApi.saveEditor).toHaveBeenCalledTimes(2);
});
it("asks before restoring work from an older server revision", async () => {
  mockAssessment = { ...saved().assessment, editorRevision: 9 };
  jest.mocked(readEditorRecovery).mockResolvedValue({
    id: "saved-1",
    classId: "class-1",
    revision: 2,
    isPublished: false,
    settings: { title: "Recovered" },
    questions: [],
    deletedQuestionIds: [],
    originalOptionIds: {},
  });
  await mount();
  expect(Alert.alert).toHaveBeenCalledWith(
    "Recover unsaved work?",
    expect.stringContaining("different revision"),
    expect.any(Array),
  );
  expect(flatten(renderer.root)).not.toContain("Recovered");
});

it("keeps a confirmed server save successful when device recovery cleanup fails", async () => {
  jest.mocked(clearEditorRecovery).mockRejectedValueOnce(new Error("Device storage unavailable"));
  await mount();
  await press("Add question");
  await press("Save draft");
  expect(assessmentsApi.saveEditor).toHaveBeenCalledTimes(1);
  expect(mockInvalidation).toHaveBeenCalledWith({ queryKey: ["assessments", "class-1"] });
  expect(flatten(renderer.root)).toContain("Saved to server · device recovery cleanup unavailable");
  expect(flatten(renderer.root)).not.toContain("Retry save");
  expect(flatten(renderer.root)).not.toContain("Retry save to safely check its result");
});
