// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { TeacherExtractionDetailScreen } from "../TeacherExtractionDetailScreen";
import { extractionsApi } from "../../api/services/extractions";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("../../api/services/file-upload", () => ({ fileUploadApi: { upload: jest.fn() } }));

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) => ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");
  const Pressable = component("Pressable");
  return {
    teacherTheme: { text: "#fff", subtext: "#aaa", amber: "#fa0", red: "#f00", green: "#0f0", border: "#333" },
    TeacherScreen: ({ title, subtitle, children }: any) => ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), children),
    TeacherPanel: ({ title, subtitle, children }: any) => ReactRuntime.createElement("TeacherPanel", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle), children),
    TeacherRow: ({ title, subtitle }: any) => ReactRuntime.createElement("TeacherRow", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherStats: ({ items }: any) => ReactRuntime.createElement("TeacherStats", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherActionButton: ({ label, onPress, disabled }: any) => ReactRuntime.createElement(Pressable, { onPress, disabled }, ReactRuntime.createElement(Text, null, label)),
    TeacherChip: ({ label, onPress, active }: any) => ReactRuntime.createElement(Pressable, { onPress, active }, ReactRuntime.createElement(Text, null, label)),
    TeacherEmpty: ({ title, subtitle }: any) => ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherInlineField: ({ label, value, onChangeText }: any) => ReactRuntime.createElement("TeacherInlineField", { label, value, onChangeText }, ReactRuntime.createElement(Text, null, label)),
  };
});

jest.mock("../../api/services/extractions", () => ({
  extractionsApi: {
    getById: jest.fn(),
    getStatus: jest.fn(),
    update: jest.fn(),
    previewApply: jest.fn(),
    apply: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../../api/teacher-extraction-jobs", () => ({
  addActiveExtraction: jest.fn(),
  removeActiveExtraction: jest.fn(),
}));

const api = extractionsApi as jest.Mocked<typeof extractionsApi>;
beforeEach(() => jest.clearAllMocks());
const readyExtraction = {
  id: "extract-1",
  fileId: "file-1",
  classId: "class-1",
  teacherId: "teacher-1",
  extractionStatus: "completed",
  modelUsed: "model-1",
  structuredContent: {
    title: "Cybersecurity",
    description: "Module",
    sections: [{
      title: "Threats",
      description: "Section",
      order: 1,
      lessonBlocks: [{ type: "text", content: { text: "Body" }, order: 1, metadata: { provenance: { pageStart: 2 } } }],
      assessmentDraft: null,
    }],
    mediaAssets: [],
    audit: { reviewIssues: [] },
  },
  isApplied: false,
  progressPercent: 100,
  totalChunks: 4,
  processedChunks: 4,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  qualityGate: "pass",
  reviewRequired: false,
};

function textOf(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === "string" ? child : textOf(child as TestRenderer.ReactTestInstance)).join(" ");
}

function pressable(root: TestRenderer.ReactTestInstance, label: string) {
  return root.find((node) => node.type === "Pressable" && textOf(node).trim() === label);
}

it("previews selected sections, applies without navigating, and offers the created module", async () => {
  api.getById.mockResolvedValue(readyExtraction as never);
  api.previewApply.mockResolvedValue({ moduleId: "module-1", lessonsCreated: 1, sectionsCreated: 1, assessmentsCreated: 0 });
  api.apply.mockResolvedValue({ moduleId: "module-1", lessonsCreated: 1, sectionsCreated: 1, assessmentsCreated: 0 });
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  let renderer: TestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherExtractionDetailScreen navigation={navigation as never} route={{ params: { extractionId: "extract-1", classId: "class-1" } } as never} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(textOf(renderer!.root)).not.toContain("Upload new doc");
  await act(async () => {
    pressable(renderer!.root, "Review & apply").props.onPress();
    await Promise.resolve();
  });
  expect(api.previewApply).toHaveBeenCalledWith("extract-1", { sectionIndices: [0] });

  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => {
    await buttons.find((button: any) => button.text === "Apply selected").onPress();
    await Promise.resolve();
  });

  expect(api.apply).toHaveBeenCalledWith("extract-1", { sectionIndices: [0] });
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(textOf(renderer!.root)).toContain("Open Module");
});

it("stops detail polling after three failures and keeps a recoverable warning", async () => {
  jest.useFakeTimers();
  api.getById.mockResolvedValue({
    ...readyExtraction,
    extractionStatus: "processing",
    structuredContent: null,
    progressPercent: 40,
  } as never);
  api.getStatus.mockRejectedValue(new Error("offline"));
  let renderer: TestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherExtractionDetailScreen navigation={{ goBack: jest.fn() } as never} route={{ params: { extractionId: "extract-1", classId: "class-1" } } as never} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await act(async () => {
      jest.advanceTimersByTime(8_000);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  expect(api.getStatus).toHaveBeenCalledTimes(3);
  expect(textOf(renderer!.root)).toContain("Live updates paused");
  expect(textOf(renderer!.root)).toContain("Progress is saved");

  act(() => renderer!.unmount());
  jest.useRealTimers();
});

it("requires confirmation before deleting an extraction", async () => {
  api.getById.mockResolvedValue(readyExtraction as never);
  api.delete.mockResolvedValue(undefined);
  const navigation = { goBack: jest.fn() };
  let renderer: TestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherExtractionDetailScreen navigation={navigation as never} route={{ params: { extractionId: "extract-1", classId: "class-1" } } as never} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  act(() => pressable(renderer!.root, "Delete").props.onPress());
  expect(api.delete).not.toHaveBeenCalled();
  const [title, , buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1);
  expect(title).toBe("Delete extraction?");

  await act(async () => {
    await buttons.find((button: any) => button.text === "Delete").onPress();
  });
  expect(api.delete).toHaveBeenCalledWith("extract-1");
  expect(navigation.goBack).toHaveBeenCalled();
});
