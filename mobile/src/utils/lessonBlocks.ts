import type {
  ContentBlock,
  LessonBlockChoiceKey,
  LessonBlockDraft,
  LessonTextVariant,
} from "../types/lesson";
import { stripRichText } from "../theme/studentDark";

export function extractLessonBlockText(block: Partial<ContentBlock> & { content?: unknown; metadata?: unknown }) {
  if (typeof block.content === "string") {
    const text = stripRichText(block.content);
    if (text) return text;
  }

  if (block.content && typeof block.content === "object") {
    const content = block.content as Record<string, unknown>;
    const textValue = content.text;
    const urlValue = content.url;
    const htmlValue = content.html;
    if (typeof textValue === "string" && textValue.trim()) return stripRichText(textValue);
    if (typeof htmlValue === "string" && htmlValue.trim()) return stripRichText(htmlValue);
    if (typeof urlValue === "string" && urlValue.trim()) return urlValue.trim();
  }

  if (block.metadata && typeof block.metadata === "object") {
    const caption = (block.metadata as Record<string, unknown>).caption;
    if (typeof caption === "string" && caption.trim()) return stripRichText(caption);
  }

  return "";
}

export function resolveLessonBlockMeta(type: ContentBlock["type"] | string) {
  switch (type) {
    case "image":
      return { label: "Visual", icon: "image-outline" as const, tone: "blue" as const, interactive: true };
    case "video":
      return { label: "Watch", icon: "play-circle-outline" as const, tone: "purple" as const, interactive: true };
    case "question":
      return { label: "Checkpoint", icon: "help-circle-outline" as const, tone: "amber" as const, interactive: true };
    case "file":
      return { label: "Attachment", icon: "file-document-outline" as const, tone: "green" as const, interactive: true };
    case "divider":
      return { label: "Pause", icon: "minus" as const, tone: "red" as const, interactive: false };
    default:
      return { label: "Reading", icon: "book-open-variant" as const, tone: "blue" as const, interactive: true };
  }
}

export const LESSON_BLOCK_CHOICES: ReadonlyArray<{
  key: LessonBlockChoiceKey;
  label: string;
  description: string;
  icon: string;
}> = [
  { key: "paragraph", label: "Paragraph", description: "Core explanation", icon: "text" },
  { key: "objectives", label: "Objectives", description: "Learner goals", icon: "target" },
  { key: "key_points", label: "Key points", description: "Important ideas", icon: "lightbulb-outline" },
  { key: "example", label: "Worked example", description: "Steps and answer", icon: "format-list-numbered" },
  { key: "image", label: "Image", description: "Visual from a file", icon: "image-outline" },
  { key: "video", label: "Video", description: "YouTube link", icon: "play-circle-outline" },
  { key: "checkpoint", label: "Checkpoint", description: "Quick question", icon: "help-circle-outline" },
  { key: "recap", label: "Recap", description: "Main takeaway", icon: "bookmark-check-outline" },
  { key: "reflection", label: "Reflection", description: "Learner prompt", icon: "message-text-outline" },
  { key: "file", label: "File", description: "Downloadable resource", icon: "file-outline" },
  { key: "divider", label: "Divider", description: "Visual pause", icon: "minus" },
];

const variantForChoice = (choice: LessonBlockChoiceKey): LessonTextVariant => {
  if (choice === "objectives" || choice === "key_points" || choice === "example" || choice === "recap" || choice === "reflection") return choice;
  return "body";
};

export function createLessonBlockDraft(choice: LessonBlockChoiceKey): LessonBlockDraft {
  const variant = variantForChoice(choice);
  if (choice === "image") return { type: "image", content: { fileId: "", fileName: "", mimeType: "", caption: "", displayScale: 100 }, metadata: {} };
  if (choice === "video") return { type: "video", content: { url: "", caption: "" }, metadata: {} };
  if (choice === "file") return { type: "file", content: { fileId: "", fileName: "", mimeType: "" }, metadata: {} };
  if (choice === "divider") return { type: "divider", content: { style: "line" }, metadata: {} };
  if (choice === "checkpoint") {
    return {
      type: "question",
      content: {
        prompt: "<p>Write a quick checkpoint question for learners.</p>",
        choices: [
          { id: "choice-1", html: "<p>Option 1</p>" },
          { id: "choice-2", html: "<p>Option 2</p>" },
        ],
        answerType: "single_select",
      },
      metadata: { correctAnswers: [], explanation: "", points: 1 },
    };
  }

  const contents: Record<LessonTextVariant, Record<string, unknown>> = {
    body: { heading: "", html: "<p>Start writing the core explanation for this lesson section.</p>" },
    objectives: { heading: "Learning objectives", items: [{ id: "objective-1", html: "<p>State the goal learners should reach in this lesson.</p>" }] },
    key_points: { heading: "Key points", items: [{ id: "key-point-1", html: "<p>Highlight the most important concept from this lesson.</p>" }] },
    example: { heading: "Worked example", scenarioHtml: "<p>Introduce the problem or situation learners should follow.</p>", steps: [{ id: "step-1", title: "Step 1", html: "<p>Show the first move in the solution.</p>" }], answerHtml: "<p>Explain why this example works.</p>" },
    recap: { heading: "Recap", takeawayHtml: "<p>Summarize the main idea learners should remember before moving on.</p>" },
    reflection: { heading: "Reflection", promptHtml: "<p>Ask learners to connect the lesson to what they already know.</p>" },
  };
  return { type: "text", content: contents[variant], metadata: { variant } };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

export function normalizeLessonBlock(block: ContentBlock): ContentBlock {
  const metadata = objectValue(block.metadata);
  if (block.type === "text") {
    const variant = typeof metadata.variant === "string" ? metadata.variant : "body";
    const content = typeof block.content === "string"
      ? { heading: "", html: block.content }
      : objectValue(block.content);
    return { ...block, content, metadata: { ...metadata, variant } };
  }
  if (block.type === "question") {
    const content = objectValue(block.content);
    const choices = Array.isArray(content.choices)
      ? content.choices.map((choice, index) => typeof choice === "string"
        ? { id: `choice-${index + 1}`, html: choice }
        : { ...objectValue(choice), id: String(objectValue(choice).id || `choice-${index + 1}`), html: String(objectValue(choice).html || "") })
      : [];
    return { ...block, content: { ...content, prompt: String(content.prompt || ""), choices, answerType: content.answerType === "multi_select" ? "multi_select" : "single_select" }, metadata };
  }
  return { ...block, content: typeof block.content === "string" ? { url: block.content } : objectValue(block.content), metadata };
}
