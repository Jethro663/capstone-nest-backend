// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { JaChatWorkspace } from "../JaChatWorkspace";
import { JaHubSheets } from "../JaHubSheets";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  const renderOptional = (value: unknown) => {
    if (!value) return null;
    return ReactRuntime.isValidElement(value)
      ? value
      : ReactRuntime.createElement(value as React.ElementType);
  };

  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Image: component("Image"),
    TextInput: component("TextInput"),
    FlatList: ({ data = [], renderItem, keyExtractor, ListEmptyComponent, ListFooterComponent, ...props }: Record<string, unknown>) =>
      ReactRuntime.createElement(
        "FlatList",
        props,
        data.length
          ? data.map((item: unknown, index: number) => ReactRuntime.createElement(
              ReactRuntime.Fragment,
              { key: keyExtractor?.(item, index) ?? index },
              renderItem({ item, index }),
            ))
          : renderOptional(ListEmptyComponent),
        renderOptional(ListFooterComponent),
      ),
    Modal: ({ visible, children, ...props }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", props, children) : null,
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("SafeAreaView", props, props.children),
    useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
  };
});

jest.mock("../../ui/RichTextContent", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    RichTextContent: ({ html }: { html: string }) =>
      ReactRuntime.createElement("RichTextContent", { html }, html),
  };
});

function flattenText(node: TestRenderer.ReactTestInstance | string): string {
  if (typeof node === "string") return node;
  return node.children.map((child) => flattenText(child as never)).join("");
}

function findPressable(root: TestRenderer.ReactTestInstance, text: string) {
  return root.find(
    (node) => node.type === "Pressable" && flattenText(node).includes(text),
  );
}

const selectedLesson = { lessonId: "lesson-1", title: "Fractions" };

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("react-test-renderer is deprecated")) return;
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterAll(() => consoleErrorSpy.mockRestore());

describe("JaChatWorkspace", () => {
  it("owns one message scroller and remains preset-only", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaChatWorkspace
          classLabel="Mathematics (MATH-1)"
          entryState={{ mode: "new" }}
          lessonSelection={{ kind: "selected", lesson: selectedLesson }}
          messages={[]}
          busy={false}
          error=""
          onOpenMenu={jest.fn()}
          onOpenLessons={jest.fn()}
          onOpenPrompts={jest.fn()}
          onRefresh={jest.fn()}
          onDismissError={jest.fn()}
        />,
      );
    });

    expect(renderer!.root.findAll((node) => node.type === "FlatList")).toHaveLength(1);
    expect(renderer!.root.findAll((node) => node.type === "TextInput")).toHaveLength(0);
    expect(findPressable(renderer!.root, "Ask JA about this lesson").props.disabled).toBe(false);
  });

  it("renders blocked rich replies, citations, and dismissible failures", () => {
    const dismiss = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaChatWorkspace
          classLabel="Mathematics (MATH-1)"
          entryState={{ mode: "active", threadId: "thread-1" }}
          lessonSelection={{ kind: "selected", lesson: selectedLesson }}
          messages={[{
            id: "assistant-1",
            role: "assistant",
            content: "<p>I cannot answer from this lesson.</p>",
            blocked: true,
            citations: [{ title: "Fractions Lesson" }],
          }]}
          busy={false}
          error="Network unavailable"
          onOpenMenu={jest.fn()}
          onOpenLessons={jest.fn()}
          onOpenPrompts={jest.fn()}
          onRefresh={jest.fn()}
          onDismissError={dismiss}
        />,
      );
    });

    const text = renderer!.root.findAll((node) => node.type === "Text").map(flattenText).join(" ");
    expect(renderer!.root.findByType("RichTextContent").props.html).toContain("cannot answer");
    expect(text).toContain("Response limited");
    expect(text).toContain("Fractions Lesson");
    expect(text).toContain("Network unavailable");

    act(() => findPressable(renderer!.root, "Dismiss").props.onPress());
    expect(dismiss).toHaveBeenCalled();
  });

  it("locks prompt selection while JA is thinking", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaChatWorkspace
          classLabel="Mathematics (MATH-1)"
          entryState={{ mode: "active", threadId: "thread-1" }}
          lessonSelection={{ kind: "selected", lesson: selectedLesson }}
          messages={[]}
          busy
          error=""
          onOpenMenu={jest.fn()}
          onOpenLessons={jest.fn()}
          onOpenPrompts={jest.fn()}
          onRefresh={jest.fn()}
          onDismissError={jest.fn()}
        />,
      );
    });

    expect(findPressable(renderer!.root, "Ask JA about this lesson").props.disabled).toBe(true);
    expect(renderer!.root.findAll((node) => node.type === "Text").map(flattenText).join(" ")).toContain("JA is thinking");
  });

  it.each([
    [{ kind: "requires-selection" }, "Choose a lesson to continue"],
    [{ kind: "unavailable" }, "No visible lessons are available"],
    [{ kind: "stale", lessonId: "lesson-old" }, "This chat's lesson is no longer available"],
  ])("locks prompts for %j", (lessonSelection, guidance) => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaChatWorkspace
          classLabel="Mathematics (MATH-1)"
          entryState={{ mode: "new" }}
          lessonSelection={lessonSelection}
          messages={[]}
          busy={false}
          error=""
          onOpenMenu={jest.fn()}
          onOpenLessons={jest.fn()}
          onOpenPrompts={jest.fn()}
          onRefresh={jest.fn()}
          onDismissError={jest.fn()}
        />,
      );
    });

    const text = renderer!.root.findAll((node) => node.type === "Text").map(flattenText).join(" ");
    expect(text).toContain(guidance);
    expect(findPressable(renderer!.root, "Ask JA about this lesson").props.disabled).toBe(true);
  });
});

describe("JaHubSheets", () => {
  const baseProps = {
    activeSheet: null,
    classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
    selectedClassId: "class-1",
    threads: [{ id: "thread-1", title: "Fractions help", status: "active", updatedAt: "2026-09-03T12:00:00.000Z" }],
    activeThreadId: "thread-1",
    lessons: [selectedLesson],
    selectedLessonId: "lesson-1",
    activities: [],
    activityFilter: "all",
    activityLoading: false,
    activityError: false,
    busy: false,
    onClose: jest.fn(),
    onNewChat: jest.fn(),
    onOpenThread: jest.fn(),
    onSelectClass: jest.fn(),
    onSelectLesson: jest.fn(),
    onSelectPrompt: jest.fn(),
    onOpenActivity: jest.fn(),
    onActivityFilterChange: jest.fn(),
    onSwitchPanel: jest.fn(),
    onRefreshActivity: jest.fn(),
  };

  it("shows the complete header tool menu and recent conversations", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<JaHubSheets {...baseProps} activeSheet="menu" />);
    });

    const text = renderer!.root.findAll((node) => node.type === "Text").map(flattenText).join(" ");
    expect(text).toContain("New chat");
    expect(text).toContain("Fractions help");
    expect(text).toContain("Activity History");
    expect(text).toContain("Replay");
    expect(text).toContain("Learner's Path");
  });

  it("shows only approved prompts and closes through Android onRequestClose", () => {
    const close = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaHubSheets {...baseProps} activeSheet="prompts" onClose={close} />,
      );
    });

    expect(findPressable(renderer!.root, "Explain the lesson")).toBeTruthy();
    expect(findPressable(renderer!.root, "Vocabulary review")).toBeTruthy();
    expect(renderer!.root.findAll((node) => node.type === "TextInput")).toHaveLength(0);

    act(() => renderer!.root.findByType("Modal").props.onRequestClose());
    expect(close).toHaveBeenCalled();
  });

  it("renders lesson context and activity states in native sheets", () => {
    let lessonRenderer: TestRenderer.ReactTestRenderer;
    let activityRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      lessonRenderer = TestRenderer.create(<JaHubSheets {...baseProps} activeSheet="lessons" />);
      activityRenderer = TestRenderer.create(
        <JaHubSheets {...baseProps} activeSheet="activity" activityLoading />,
      );
    });

    expect(findPressable(lessonRenderer!.root, "Fractions")).toBeTruthy();
    const activityText = activityRenderer!.root.findAll((node) => node.type === "Text").map(flattenText).join(" ");
    expect(activityText).toContain("Loading complete activity history");
  });

  it("offers an explicit refresh when activity history fails", () => {
    const refresh = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <JaHubSheets
          {...baseProps}
          activeSheet="activity"
          activityError
          onRefreshActivity={refresh}
        />,
      );
    });

    act(() => findPressable(renderer!.root, "Refresh").props.onPress());
    expect(refresh).toHaveBeenCalled();
  });
});
