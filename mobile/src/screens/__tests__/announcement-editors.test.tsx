// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { TeacherAnnouncementEditorModal } from "../../components/teacher/TeacherAnnouncementEditorModal";
import { AdminAnnouncementsScreen } from "../AdminAnnouncementsScreen";
import { announcementsApi } from "../../api/services/announcements";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const mockInject = jest.fn();
const mockNotice = {
  id: "notice-1", classId: "class-1", title: "Class update",
  content: '&lt;p&gt;Bring &lt;strong&gt;a notebook&lt;/strong&gt;.&lt;/p&gt;',
  isPinned: true, canEdit: true, canDelete: true, createdAt: "2026-04-18T08:00:00Z",
};
jest.mock("react-native", () => {
  const React = require("react");
  const component = (name) => (props) => React.createElement(name, props, props.children);
  return {
    ...Object.fromEntries(["View", "Text", "Pressable", "TextInput", "Modal", "ScrollView", "KeyboardAvoidingView"].map(name => [name, component(name)])),
    Platform: { OS: "android" }, Linking: { openURL: jest.fn() }, Alert: { alert: jest.fn() },
  };
});
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock("react-native-webview", () => {
  const React = require("react");
  return { WebView: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return React.createElement("WebView", props);
  }) };
});
jest.mock("../../components/ui/DatePickerModal", () => ({ DatePickerModal: () => null }));
jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const React = require("react");
  const container = ({ children }) => React.createElement("View", {}, children);
  return {
    teacherTheme: { text: "#111", subtext: "#555", red: "#b00", border: "#ddd", surface: "#fff" },
    TeacherPanel: container, TeacherScreen: container,
    TeacherStats: () => null, TeacherEmpty: () => null,
    TeacherActionButton: ({ label, ...props }) => React.createElement("Pressable", props, React.createElement("Text", {}, label)),
    TeacherChip: ({ label, ...props }) => React.createElement("Pressable", props, React.createElement("Text", {}, label)),
  };
});
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "class-1", subjectCode: "MATH" }], refetch: jest.fn() }),
  useQueries: () => [{ data: [mockNotice], refetch: jest.fn() }],
}));
jest.mock("../../api/services/announcements", () => ({ announcementsApi: { update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) } }));
jest.mock("../../api/services/classes", () => ({ classesApi: { getAll: jest.fn() } }));
jest.mock("../../api/http", () => ({ toAppError: (error) => error }));

const textOf = node => typeof node === "string" ? node : node.children.map(textOf).join("");
const button = (root, text) => root.findAllByType("Pressable").find(node => textOf(node) === text || node.props.accessibilityLabel === text);
function changeRichText(root, html) {
  act(() => button(root, "Edit Announcement content").props.onPress());
  const web = root.findByType("WebView");
  act(() => web.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "ready" }) } }));
  expect(mockInject).toHaveBeenCalledWith(expect.stringContaining("a notebook"));
  act(() => web.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "change", html }) } }));
  act(() => button(root, "Done").props.onPress());
}

beforeEach(() => jest.clearAllMocks());

it("teacher edits an existing HTML announcement visually and saves formatted HTML", async () => {
  const onSave = jest.fn();
  let renderer;
  act(() => { renderer = TestRenderer.create(<TeacherAnnouncementEditorModal
    visible editingId={mockNotice.id} initialTitle={mockNotice.title} initialContent={mockNotice.content}
    initialPinned onSave={onSave} onClose={jest.fn()}
  />); });
  expect(renderer.root.findAllByType("TextInput").some(node => /<\/?p>/.test(node.props.value ?? ""))).toBe(false);
  const html = '<p>Bring <strong>a notebook</strong> and <em>a pen</em>.</p>';
  changeRichText(renderer.root, html);
  await act(async () => button(renderer.root, "Save Changes").props.onPress());
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Class update", content: html, isPinned: true }));
});

it("teacher cannot publish an empty HTML paragraph", () => {
  let renderer;
  act(() => { renderer = TestRenderer.create(<TeacherAnnouncementEditorModal visible initialTitle="Notice" initialContent="<p><br></p>" onSave={jest.fn()} onClose={jest.fn()} />); });
  expect(button(renderer.root, "Publish Announcement").props.disabled).toBe(true);
});

it("admin reads and edits formatted announcements with the same editor", async () => {
  let renderer;
  act(() => { renderer = TestRenderer.create(<AdminAnnouncementsScreen />); });
  act(() => button(renderer.root, "View Class update announcement").props.onPress());
  expect(renderer.root.findAllByType("Text").some(node => node.props.style?.fontWeight === "800" && textOf(node) === "a notebook")).toBe(true);
  act(() => button(renderer.root, "Close announcement details").props.onPress());
  act(() => button(renderer.root, "Edit Class update").props.onPress());
  const html = '<p>Bring <strong>a notebook</strong>.</p><ul><li>Read first</li></ul>';
  changeRichText(renderer.root, html);
  await act(async () => button(renderer.root, "Save").props.onPress());
  expect(announcementsApi.update).toHaveBeenCalledWith("class-1", "notice-1", expect.objectContaining({ content: html, isPinned: true }));
  expect(Alert.alert).not.toHaveBeenCalled();
});
