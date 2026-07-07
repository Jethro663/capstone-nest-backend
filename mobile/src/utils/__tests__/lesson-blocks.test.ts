import { extractLessonBlockText, resolveLessonBlockMeta } from "../lessonBlocks";

describe("lesson block utilities", () => {
  it("extracts readable text from html, object, and metadata content", () => {
    expect(extractLessonBlockText({ id: "1", type: "text", order: 1, content: "<p>Hello&nbsp;class</p>" })).toBe("Hello class");
    expect(extractLessonBlockText({ id: "2", type: "image", order: 2, content: { url: "https://example.test/image.png" } })).toBe("https://example.test/image.png");
    expect(extractLessonBlockText({ id: "3", type: "file", order: 3, content: "", metadata: { caption: "Worksheet" } })).toBe("Worksheet");
  });

  it("resolves interactive metadata for supported block types", () => {
    expect(resolveLessonBlockMeta("question")).toMatchObject({ label: "Checkpoint", interactive: true });
    expect(resolveLessonBlockMeta("image")).toMatchObject({ label: "Visual", interactive: true });
    expect(resolveLessonBlockMeta("divider")).toMatchObject({ label: "Pause", interactive: false });
  });
});
