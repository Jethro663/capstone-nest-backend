// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { TeacherAnnouncementRow } from "../TeacherAnnouncementRow";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    Modal: component("Modal"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("../TeacherMobilePrimitives", () => ({
  stripRichText: (value?: string) => (value ?? "").replace(/<[^>]+>/g, ""),
  teacherTheme: {
    active: "#f3f4f6",
    border: "#d1d5db",
    red: "#b91c1c",
    redSoft: "#fee2e2",
    subtext: "#4b5563",
    surface: "#ffffff",
    surface2: "#f3f4f6",
    text: "#111827",
  },
}));

const protectedAnnouncement = {
  id: "announcement-1",
  classId: "class-1",
  title: "Administrator notice",
  content: "<p>Read this important update.</p>",
  isPinned: true,
  isArchived: false,
  authorId: "admin-1",
  author: { id: "admin-1", firstName: "Ada", lastName: "Admin" },
  canEdit: false,
  canDelete: false,
  restrictionReason: "core_template",
  createdAt: "2026-08-28T04:00:00.000Z",
};

function findPressable(root: TestRenderer.ReactTestInstance, label: string) {
  return root.find(
    (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
  );
}

describe("TeacherAnnouncementRow", () => {
  it("opens protected announcements in a read-only detail modal", () => {
    const onEdit = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TeacherAnnouncementRow
          announcement={protectedAnnouncement}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />,
      );
    });

    act(() => {
      findPressable(renderer!.root, "View Administrator notice announcement").props.onPress();
    });

    expect(renderer!.root.findByType("Modal").props.visible).toBe(true);
    expect(renderer!.root.findAllByType("Text").some((node) =>
      node.children.join("").includes("Read this important update."),
    )).toBe(true);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("shows explicit alerts for protected edit and delete actions", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherAnnouncementRow
          announcement={protectedAnnouncement}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      );
    });

    act(() => {
      findPressable(renderer!.root, "Edit Administrator notice").props.onPress();
      findPressable(renderer!.root, "Delete Administrator notice").props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Action not allowed",
      expect.stringMatching(/administrator-managed.*cannot be edited/i),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Action not allowed",
      expect.stringMatching(/administrator-managed.*cannot be deleted/i),
    );
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps owned edit and delete actions accessible and separate", () => {
    const owned = {
      ...protectedAnnouncement,
      authorId: "teacher-1",
      canEdit: true,
      canDelete: true,
      restrictionReason: null,
    };
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherAnnouncementRow announcement={owned} onEdit={onEdit} onDelete={onDelete} />,
      );
    });

    const edit = findPressable(renderer!.root, "Edit Administrator notice");
    const remove = findPressable(renderer!.root, "Delete Administrator notice");
    act(() => {
      edit.props.onPress();
      remove.props.onPress();
    });

    expect(onEdit).toHaveBeenCalledWith(owned);
    expect(onDelete).toHaveBeenCalledWith(owned);
    expect(edit.props.style).toEqual(expect.objectContaining({ minWidth: 44, minHeight: 44 }));
    expect(remove.props.style).toEqual(expect.objectContaining({ minWidth: 44, minHeight: 44 }));
  });
});
