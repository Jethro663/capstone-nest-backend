import {
  LESSON_BLOCK_CHOICES,
  createLessonBlockDraft,
  extractLessonBlockText,
  normalizeLessonBlock,
  resolveLessonBlockMeta,
} from "../lessonBlocks";

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

  it("offers all eleven web-equivalent lesson authoring choices", () => {
    expect(LESSON_BLOCK_CHOICES.map((choice) => choice.key)).toEqual([
      "paragraph",
      "objectives",
      "key_points",
      "example",
      "image",
      "video",
      "checkpoint",
      "recap",
      "reflection",
      "file",
      "divider",
    ]);
  });

  it("creates canonical video, divider, and checkpoint drafts", () => {
    expect(createLessonBlockDraft("video")).toMatchObject({
      type: "video",
      content: { url: "", caption: "" },
    });
    expect(createLessonBlockDraft("divider")).toMatchObject({
      type: "divider",
      content: { style: "line" },
    });
    expect(createLessonBlockDraft("checkpoint")).toMatchObject({
      type: "question",
      content: { answerType: "single_select" },
      metadata: { correctAnswers: [], points: 1 },
    });
  });

  it("normalizes legacy strings without flattening structured objects", () => {
    const structured = {
      id: "1",
      lessonId: "lesson",
      type: "text" as const,
      order: 1,
      content: {
        heading: "Learning objectives",
        items: [{ id: "objective-1", html: "<p>Explain force.</p>" }],
      },
      metadata: { variant: "objectives" },
    };
    expect(normalizeLessonBlock(structured).content).toEqual(structured.content);
    expect(
      normalizeLessonBlock({
        ...structured,
        content: "<p>Legacy lesson</p>",
        metadata: {},
      }).content,
    ).toEqual({ heading: "", html: "<p>Legacy lesson</p>" });
  });
});
