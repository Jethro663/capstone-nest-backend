import { stripRichText } from "../theme/studentDark";

const ENCODED_DOCUMENT = /^&lt;(p|div|h[1-6]|ul|ol|blockquote|pre)(?:\s[\s\S]*?)?&gt;[\s\S]*&lt;\/\1&gt;$/i;

/** Recover escaped documents while preserving literal tag examples in ordinary text. */
export function normalizeAnnouncementContent(value?: string | null): string {
  const text = value?.trim() ?? "";
  const candidate = text.replace(/&amp;/gi, "&");
  if (!ENCODED_DOCUMENT.test(candidate)) return text;
  return candidate
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

export function announcementPreview(value?: string | null): string {
  return stripRichText(normalizeAnnouncementContent(value));
}
