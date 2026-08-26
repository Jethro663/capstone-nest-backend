// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { TeacherAiDraftScreen } from "../TeacherAiDraftScreen";
import { aiApi } from "../../api/services/ai";
import {
  clearTeacherAiDraftJobId,
  readTeacherAiDraftJobId,
  writeTeacherAiDraftJobId,
} from "../../api/teacher-ai-draft-jobs";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    View: component("View"),
    Text: component("Text"),
    TouchableOpacity: component("Pressable"),
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

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");
  const Pressable = component("Pressable");
  const TextInput = component("TextInput");
  return {
    stripRichText: (value?: string) => value || "",
    TeacherScreen: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), children),
    TeacherPanel: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherPanel", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), children),
    TeacherStats: ({ items }: any) =>
      ReactRuntime.createElement("TeacherStats", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherActionButton: ({ label, onPress, disabled }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled }, ReactRuntime.createElement(Text, null, label)),
    TeacherEmpty: ({ title, subtitle }: any) =>
      ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherRow: ({ title, subtitle, onPress, right }: any) =>
      ReactRuntime.createElement(Pressable, { onPress, disabled: !onPress }, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), right),
    TeacherInlineField: ({ label, value, onChangeText }: any) =>
      ReactRuntime.createElement("TeacherInlineField", null, ReactRuntime.createElement(Text, null, label), ReactRuntime.createElement(TextInput, { accessibilityLabel: label, value, onChangeText })),
  };
});

jest.mock("../../api/services/ai", () => ({
  aiApi: {
    getClassIndexStatus: jest.fn(),
    reindexClass: jest.fn(),
    createQuizDraftJob: jest.fn(),
    getTeacherJobStatus: jest.fn(),
    getQuizDraftJobResult: jest.fn(),
    updateQuizDraft: jest.fn(),
    previewQuizDraftApply: jest.fn(),
    applyQuizDraftJob: jest.fn(),
    retryQuizDraftJob: jest.fn(),
    cancelQuizDraftJob: jest.fn(),
    deleteTeacherJob: jest.fn(),
  },
}));

jest.mock("../../api/teacher-ai-draft-jobs", () => ({
  readTeacherAiDraftJobId: jest.fn(),
  writeTeacherAiDraftJobId: jest.fn(),
  clearTeacherAiDraftJobId: jest.fn(),
}));

const mockedAiApi = aiApi as jest.Mocked<typeof aiApi>;
const mockedStorage = {
  readTeacherAiDraftJobId: readTeacherAiDraftJobId as jest.Mock,
  writeTeacherAiDraftJobId: writeTeacherAiDraftJobId as jest.Mock,
  clearTeacherAiDraftJobId: clearTeacherAiDraftJobId as jest.Mock,
};

const readyIndexStatus = {
  classId: "class-1",
  chunksIndexed: 6,
  lessonChunks: 4,
  extractionChunks: 2,
  questionChunks: 0,
  isStale: false,
  needsReindex: false,
  readyLessons: [{ lessonId: "lesson-1", title: "Fractions lesson", chunkCount: 4, status: "indexed" }],
  lessonBlockers: [{ lessonId: "lesson-draft", title: "Draft lesson", reason: "Publish this lesson first." }],
  readyExtractions: [{ extractionId: "extract-1", title: "Fractions handout", chunkCount: 2, status: "indexed" }],
  extractionBlockers: [],
  sourceSummary: {
    lessons: { total: 2, ready: 1, blocked: 1 },
    extractions: { total: 1, ready: 1, blocked: 0 },
    questions: { assessments: 0, assessmentsWithQuestions: 0, questionCount: 0, needsIndex: 0 },
  },
};
const pendingJob = { id: "job-1", jobId: "job-1", status: "queued", progressPercent: 0 };
const completedJob = { ...pendingJob, status: "completed", progressPercent: 100, outputId: "output-1" };
const readyResult = {
  job: completedJob,
  result: {
    outputId: "output-1",
    outputType: "quiz_draft",
    structuredOutput: {
      title: "Fractions quiz",
      questions: [{ id: "q-1", type: "multiple_choice", content: "What is one half?", reviewed: true, points: 1 }],
      qualityGate: "pass",
      reviewRequired: false,
      reviewState: "ready",
      reviewIssues: [],
    },
  },
};

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const mountedRenderers: TestRenderer.ReactTestRenderer[] = [];

function flattenInstance(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === "string" ? child : flattenInstance(child as TestRenderer.ReactTestInstance)).join(" ");
}

function findPressableByText(root: TestRenderer.ReactTestInstance, text: string) {
  return root.find((node) => node.type === "Pressable" && flattenInstance(node).includes(text));
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function renderScreen() {
  let renderer: TestRenderer.ReactTestRenderer;
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherAiDraftScreen navigation={navigation as never} route={{ params: { classId: "class-1" } } as never} />,
    );
    await flushPromises();
  });
  mountedRenderers.push(renderer!);
  return { renderer: renderer!, navigation };
}

async function press(root: TestRenderer.ReactTestInstance, text: string) {
  await act(async () => {
    findPressableByText(root, text).props.onPress();
    await flushPromises();
  });
}

describe("TeacherAiDraftScreen", () => {
  afterEach(async () => {
    await act(async () => {
      mountedRenderers.splice(0).forEach((renderer) => renderer.unmount());
      await flushPromises();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue(null);
    mockedStorage.writeTeacherAiDraftJobId.mockResolvedValue(undefined);
    mockedStorage.clearTeacherAiDraftJobId.mockResolvedValue(undefined);
    mockedAiApi.getClassIndexStatus.mockResolvedValue(readyIndexStatus as never);
    mockedAiApi.createQuizDraftJob.mockResolvedValue(pendingJob as never);
    mockedAiApi.updateQuizDraft.mockResolvedValue(completedJob as never);
    mockedAiApi.deleteTeacherJob.mockResolvedValue(completedJob as never);
    mockedAiApi.cancelQuizDraftJob.mockResolvedValue({ ...pendingJob, status: "cancelled" } as never);
  });

  it("disables generation while the class index needs reindex", async () => {
    mockedAiApi.getClassIndexStatus.mockResolvedValue({
      ...readyIndexStatus,
      needsReindex: true,
      isStale: true,
      reason: "Class sources changed after the last index.",
    } as never);

    const { renderer } = await renderScreen();
    expect(findPressableByText(renderer.root, "Generate").props.disabled).toBe(true);
    expect(flattenInstance(renderer.root)).toContain("Class sources changed after the last index.");
  });

  it("sends the selected lesson id instead of every class source", async () => {
    const { renderer } = await renderScreen();
    await press(renderer.root, "Fractions lesson");
    await press(renderer.root, "Generate");

    expect(mockedAiApi.createQuizDraftJob).toHaveBeenCalledWith(expect.objectContaining({
      lessonIds: ["lesson-1"],
      extractionIds: [],
      allowDraftSources: false,
    }));
    expect(mockedStorage.writeTeacherAiDraftJobId).toHaveBeenCalledWith("class-1", "job-1");
  });

  it("restores and loads the class active job", async () => {
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue("job-1");
    mockedAiApi.getTeacherJobStatus.mockResolvedValue(completedJob as never);
    mockedAiApi.getQuizDraftJobResult.mockResolvedValue(readyResult as never);

    await renderScreen();

    expect(mockedAiApi.getTeacherJobStatus).toHaveBeenCalledWith("job-1");
    expect(mockedAiApi.getQuizDraftJobResult).toHaveBeenCalledWith("job-1");
  });

  it("shows a detailed failure and persists the replacement retry job", async () => {
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue("job-failed");
    mockedAiApi.getTeacherJobStatus.mockResolvedValue({ id: "job-failed", status: "failed", errorMessage: "No indexed source content found." } as never);
    mockedAiApi.retryQuizDraftJob.mockResolvedValue({ ...pendingJob, id: "job-2", jobId: "job-2" } as never);

    const { renderer } = await renderScreen();
    expect(flattenInstance(renderer.root)).toContain("No indexed source content found.");
    await press(renderer.root, "Retry generation");
    expect(mockedAiApi.retryQuizDraftJob).toHaveBeenCalledWith("job-failed");
    expect(mockedStorage.writeTeacherAiDraftJobId).toHaveBeenCalledWith("class-1", "job-2");
  });

  it("blocks apply while review issues are unresolved", async () => {
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue("job-1");
    mockedAiApi.getTeacherJobStatus.mockResolvedValue(completedJob as never);
    mockedAiApi.getQuizDraftJobResult.mockResolvedValue({
      ...readyResult,
      result: {
        ...readyResult.result,
        structuredOutput: {
          ...readyResult.result.structuredOutput,
          qualityGate: "fail",
          reviewRequired: true,
          reviewState: "needs_review",
          reviewIssues: [{ id: "issue-1", code: "grounding", severity: "blocking", scope: "question", message: "Check grounding", questionIndex: 0, resolved: false }],
          questions: [{ ...readyResult.result.structuredOutput.questions[0], reviewed: false }],
        },
      },
    } as never);

    const { renderer } = await renderScreen();
    expect(findPressableByText(renderer.root, "Review and apply").props.disabled).toBe(true);
    expect(flattenInstance(renderer.root)).toContain("Finish the review checklist");
  });

  it("saves teacher review before enabling apply preview", async () => {
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue("job-1");
    mockedAiApi.getTeacherJobStatus.mockResolvedValue(completedJob as never);
    mockedAiApi.getQuizDraftJobResult.mockResolvedValue({
      ...readyResult,
      result: {
        ...readyResult.result,
        structuredOutput: {
          ...readyResult.result.structuredOutput,
          qualityGate: "fail",
          reviewRequired: true,
          reviewState: "needs_review",
          reviewIssues: [{ id: "issue-1", code: "grounding", severity: "blocking", scope: "question", message: "Check grounding", questionIndex: 0, resolved: false }],
          questions: [{ ...readyResult.result.structuredOutput.questions[0], reviewed: false }],
        },
      },
    } as never);

    const { renderer } = await renderScreen();
    await press(renderer.root, "Mark question 1 reviewed");
    expect(mockedAiApi.updateQuizDraft).toHaveBeenCalledWith("job-1", {
      structuredOutput: expect.objectContaining({ reviewRequired: false, reviewState: "ready" }),
    });
  });

  it("previews apply and navigates with the canonical assessment id", async () => {
    mockedStorage.readTeacherAiDraftJobId.mockResolvedValue("job-1");
    mockedAiApi.getTeacherJobStatus.mockResolvedValue(completedJob as never);
    mockedAiApi.getQuizDraftJobResult.mockResolvedValue(readyResult as never);
    mockedAiApi.previewQuizDraftApply.mockResolvedValue({
      canApply: true,
      alreadyApplied: false,
      blockedReasons: [],
      assessment: { title: "Fractions quiz", questionCount: 1, totalPoints: 1 },
    } as never);
    mockedAiApi.applyQuizDraftJob.mockResolvedValue({
      jobId: "job-1",
      alreadyApplied: false,
      outputId: "output-1",
      applyResult: { assessmentId: "assessment-1", outputId: "output-1" },
    });

    const { renderer, navigation } = await renderScreen();
    await press(renderer.root, "Review and apply");
    const latestAlert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    await act(async () => {
      latestAlert[2][1].onPress();
      await flushPromises();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("TeacherAssessmentEditor", {
      assessmentId: "assessment-1",
      classId: "class-1",
    });
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      "TeacherAssessmentEditor",
      expect.objectContaining({ assessmentId: "output-1" }),
    );
  });
});
