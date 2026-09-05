import type { ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { colors } from "../../theme/tokens";

type Block =
  | { type: "paragraph" | "blockquote" | "code"; content: string }
  | { type: "heading"; content: string; level: number }
  | { type: "unordered-list" | "ordered-list"; items: string[] }
  | { type: "divider" };

type Props = {
  html?: string | null;
  color: string;
  mutedColor: string;
  accentColor: string;
};

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

const RICH_TEXT_TAG_PATTERN = /<[a-z][\s\S]*?>/i;

function decodeEntities(value: string) {
  return value
    .replace(/&([a-z]+);/gi, (_, entity: string) => ENTITY_MAP[entity.toLowerCase()] ?? " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function sanitizeRichTextHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+on\w+=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\s+href=(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "")
    .trim();
}

function applyInlineMarkdown(value: string) {
  return value
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n][\s\S]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n][\s\S]*?)__/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
}

function plainTextToRichHtml(input: string) {
  const text = input.trim();
  if (!text) return "";

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.join("<br />")}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = line.match(/^\s*(#{1,3})\s+(.*)$/);
    const unorderedMatch = line.match(/^\s*(?:[-*+])\s+(.*)$/);
    const orderedMatch = line.match(/^\s*(?:\d+[.)])\s+(.*)$/);

    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const content = applyInlineMarkdown(headingMatch[2].trim());
      if (content) blocks.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    if (unorderedMatch) {
      flushParagraph();
      const items = [unorderedMatch[1]];
      while (index + 1 < lines.length) {
        const nextMatch = lines[index + 1].match(/^\s*(?:[-*+])\s+(.*)$/);
        if (!nextMatch) break;
        index += 1;
        items.push(nextMatch[1]);
      }
      blocks.push(`<ul>${items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      const items = [orderedMatch[1]];
      while (index + 1 < lines.length) {
        const nextMatch = lines[index + 1].match(/^\s*(?:\d+[.)])\s+(.*)$/);
        if (!nextMatch) break;
        index += 1;
        items.push(nextMatch[1]);
      }
      blocks.push(`<ol>${items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraph.push(applyInlineMarkdown(line));
  }

  flushParagraph();
  return blocks.join("");
}

function normalizeRichText(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  return RICH_TEXT_TAG_PATTERN.test(text) ? sanitizeRichTextHtml(text) : plainTextToRichHtml(text);
}

function parseBlocks(source: string): Block[] {
  const html = normalizeRichText(source);
  if (!html) return [];

  const blocks: Block[] = [];
  const blockPattern = /<(h[1-6]|p|blockquote|pre|ul|ol)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushParagraph = (value: string) => {
    const content = value.trim();
    if (content) blocks.push({ type: "paragraph", content });
  };

  while ((match = blockPattern.exec(html))) {
    pushParagraph(html.slice(lastIndex, match.index));
    lastIndex = blockPattern.lastIndex;

    if (match[0].startsWith("<hr")) {
      blocks.push({ type: "divider" });
      continue;
    }

    const tag = match[1]?.toLowerCase() ?? "p";
    const content = match[2]?.trim() ?? "";
    if (!content && tag !== "ul" && tag !== "ol") continue;

    if (tag === "ul" || tag === "ol") {
      const items = [...content.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi)]
        .map((itemMatch) => itemMatch[1]?.trim() ?? "")
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: tag === "ul" ? "unordered-list" : "ordered-list", items });
      }
      continue;
    }

    if (tag === "blockquote") {
      blocks.push({ type: "blockquote", content });
      continue;
    }

    if (tag === "pre") {
      blocks.push({ type: "code", content });
      continue;
    }

    if (tag.startsWith("h")) {
      blocks.push({ type: "heading", level: Number(tag.slice(1)) || 2, content });
      continue;
    }

    blocks.push({ type: "paragraph", content });
  }

  pushParagraph(html.slice(lastIndex));
  return blocks.length ? blocks : [{ type: "paragraph", content: html }];
}

function cleanTextSegment(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function readAnchorHref(tag: string) {
  const hrefMatch = tag.match(/href=(?:"([^"]*)"|'([^']*)')/i);
  return hrefMatch?.[1] || hrefMatch?.[2] || null;
}

function renderInline(
  value: string,
  baseColor: string,
  mutedColor: string,
  accentColor: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /<(strong|b|em|i|u|code|span|a)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    const cleaned = cleanTextSegment(text);
    if (!cleaned) return;
    nodes.push(
      <Text key={`${keyPrefix}-text-${index += 1}`} style={{ color: baseColor }}>
        {cleaned}
      </Text>,
    );
  };

  while ((match = pattern.exec(value))) {
    pushText(value.slice(cursor, match.index));
    cursor = pattern.lastIndex;

    if (match[0].startsWith("<br")) {
      nodes.push(
        <Text key={`${keyPrefix}-br-${index += 1}`} style={{ color: baseColor }}>
          {"\n"}
        </Text>,
      );
      continue;
    }

    const tag = match[1]?.toLowerCase() ?? "span";
    const inner = renderInline(match[2] ?? "", baseColor, mutedColor, accentColor, `${keyPrefix}-${index}`);
    const href = tag === "a" ? readAnchorHref(match[0]) : null;
    const style =
      tag === "strong" || tag === "b"
        ? { color: baseColor, fontWeight: "800" as const }
        : tag === "em" || tag === "i"
          ? { color: baseColor, fontStyle: "italic" as const }
          : tag === "u"
            ? { color: accentColor, textDecorationLine: "underline" as const }
            : tag === "code"
              ? {
                  color: baseColor,
                  fontSize: 12,
                  lineHeight: 19,
                  fontFamily: "monospace",
                  backgroundColor: colors.containerLow,
                }
              : tag === "a"
                ? { color: accentColor, textDecorationLine: "underline" as const }
                : { color: baseColor };

    nodes.push(
      <Text
        key={`${keyPrefix}-inline-${index += 1}`}
        style={style}
        onPress={href ? () => void Linking.openURL(href) : undefined}
        suppressHighlighting={!href}
      >
        {inner}
      </Text>,
    );
  }

  pushText(value.slice(cursor));
  return nodes;
}

export function RichTextContent({ html, color, mutedColor, accentColor }: Props) {
  const blocks = parseBlocks(html ?? "");

  if (!blocks.length) {
    return (
      <Text style={{ color, fontSize: 13, lineHeight: 20 }}>
        {cleanTextSegment(html ?? "")}
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.type === "divider") {
          return <View key={key} style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
        }

        if (block.type === "unordered-list" || block.type === "ordered-list") {
          return (
            <View key={key} style={{ gap: 6 }}>
              {block.items.map((item, itemIndex) => (
                <View key={`${key}-item-${itemIndex}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Text style={{ color: mutedColor, fontSize: 13, lineHeight: 20, fontWeight: "800" }}>
                    {block.type === "ordered-list" ? `${itemIndex + 1}.` : "\u2022"}
                  </Text>
                  <Text style={{ flex: 1, color, fontSize: 13, lineHeight: 20 }}>
                    {renderInline(item, color, mutedColor, accentColor, `${key}-item-${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        const headingLevel = "level" in block ? block.level : 3;
        const headingSize = Math.max(15, 23 - headingLevel * 2);
        const textStyle =
          block.type === "heading"
            ? { color, fontSize: headingSize, lineHeight: headingSize + 8, fontWeight: "900" as const }
            : block.type === "blockquote"
              ? {
                  color,
                  fontSize: 13,
                  lineHeight: 20,
                  borderLeftWidth: 2,
                  borderLeftColor: accentColor,
                  paddingLeft: 10,
                }
              : block.type === "code"
                ? {
                    color,
                    fontSize: 12,
                    lineHeight: 19,
                    fontFamily: "monospace",
                    backgroundColor: colors.containerLow,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                }
                : { color, fontSize: 13, lineHeight: 20 };
        const inlineContent = "content" in block ? block.content : "";

        return (
          <Text key={key} style={textStyle}>
            {renderInline(inlineContent, color, mutedColor, accentColor, key)}
          </Text>
        );
      })}
    </View>
  );
}
