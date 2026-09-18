// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { LessonBlockRenderer } from "../LessonBlockRenderer";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    Image: component("Image"),
    Linking: { openURL: jest.fn() },
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return { MaterialCommunityIcons: (props: object) => ReactRuntime.createElement("Icon", props) };
});

jest.mock("../../ui/RichTextContent", () => {
  const ReactRuntime = require("react");
  return {
    RichTextContent: ({ html }: { html: string }) => ReactRuntime.createElement("RichText", null, html),
  };
});

jest.mock("../../../api/services/protected-files", () => ({
  buildProtectedImageSource: (pathname: string) => ({
    uri: `https://api.test${pathname}`,
    headers: { Authorization: "Bearer teacher-token" },
  }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function text(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return (node.children ?? []).map((child) => (typeof child === "string" ? child : text(child))).join(" ");
}

describe("LessonBlockRenderer", () => {
  it.each([
    ["objectives", { heading: "Goals", items: [{ id: "a", html: "<p>Goal A</p>" }] }, "Goal A"],
    ["key_points", { heading: "Key points", items: [{ id: "a", html: "<p>Point A</p>" }] }, "Point A"],
    ["example", { heading: "Example", scenarioHtml: "<p>Scenario</p>", steps: [{ id: "s", title: "Step 1", html: "<p>Work</p>" }], answerHtml: "<p>Answer</p>" }, "Scenario"],
    ["recap", { heading: "Recap", takeawayHtml: "<p>Remember</p>" }, "Remember"],
    ["reflection", { heading: "Reflect", promptHtml: "<p>Think</p>" }, "Think"],
  ])("renders the %s structured text variant", (variant, content, expected) => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <LessonBlockRenderer block={{ id: "b", lessonId: "l", type: "text", order: 1, content, metadata: { variant } }} />,
      );
    });
    expect(text(renderer!.toJSON())).toContain(expected);
  });

  it("renders checkpoint choices, video, file, image, and divider without fallback copy", () => {
    const onOpenFile = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <LessonBlockRenderer block={{ id: "q", lessonId: "l", type: "question", order: 1, content: { prompt: "<p>Choose</p>", choices: [{ id: "a", html: "<p>Alpha</p>" }], answerType: "single_select" }, metadata: {} }} />
          <LessonBlockRenderer block={{ id: "v", lessonId: "l", type: "video", order: 2, content: { url: "https://youtu.be/demo", caption: "Watch this" } }} />
          <LessonBlockRenderer block={{ id: "f", lessonId: "l", type: "file", order: 3, content: { fileId: "file-1", fileName: "Guide.pdf", mimeType: "application/pdf" } }} onOpenFile={onOpenFile} />
          <LessonBlockRenderer block={{ id: "i", lessonId: "l", type: "image", order: 4, content: { legacyUrl: "https://example.test/image.png", caption: "Diagram" } }} />
          <LessonBlockRenderer block={{ id: "d", lessonId: "l", type: "divider", order: 5, content: { style: "line" } }} />
        </>,
      );
    });
    const rendered = text(renderer!.toJSON());
    expect(rendered).toContain("Choose");
    expect(rendered).toContain("Alpha");
    expect(rendered).toContain("Watch this");
    expect(rendered).toContain("Guide.pdf");
    expect(rendered).toContain("Diagram");
    expect(rendered).not.toContain("does not contain text");
    const open = renderer!.root.findByProps({ accessibilityLabel: "Open Guide.pdf" });
    act(() => open.props.onPress());
    expect(onOpenFile).toHaveBeenCalledWith("file-1", "Guide.pdf");
  });

  it("renders uploaded lesson images through the authenticated file endpoint", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <LessonBlockRenderer
          block={{
            id: "i",
            lessonId: "l",
            type: "image",
            order: 1,
            content: { fileId: "image-1", fileName: "Diagram.png", caption: "Diagram" },
          }}
        />,
      );
    });

    expect(renderer!.root.findByType("Image").props.source).toEqual({
      uri: "https://api.test/files/image-1/download",
      headers: { Authorization: "Bearer teacher-token" },
    });
  });
});
