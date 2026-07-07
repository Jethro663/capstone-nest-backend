import type { ContentBlock } from "../types/lesson";
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
