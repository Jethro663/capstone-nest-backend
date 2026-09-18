import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Linking, Pressable, Text, View } from "react-native";
import type { ContentBlock } from "../../types/lesson";
import { buildProtectedImageSource } from "../../api/services/protected-files";
import { studentDarkTheme as theme } from "../../theme/studentDark";
import { normalizeLessonBlock } from "../../utils/lessonBlocks";
import { RichTextContent } from "../ui/RichTextContent";

type Props = {
  block: ContentBlock;
  onOpenFile?: (fileId: string, fileName: string) => void;
};

const rich = (html: string, key?: string) => (
  <RichTextContent key={key} html={html} color={theme.text} mutedColor={theme.muted} accentColor={theme.redText} />
);

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function htmlValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function LessonBlockRenderer({ block, onOpenFile }: Props) {
  const normalized = normalizeLessonBlock(block);
  const content = asRecord(normalized.content);
  const metadata = asRecord(normalized.metadata);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const card = { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 14, padding: 14 } as const;

  if (normalized.type === "divider") {
    return <View testID={`lesson-block-${block.id}`} accessibilityLabel="Lesson divider" style={{ height: 1, backgroundColor: theme.border2, marginVertical: 8 }} />;
  }

  if (normalized.type === "text") {
    const variant = typeof metadata.variant === "string" ? metadata.variant : "body";
    const heading = htmlValue(content.heading);
    const items = Array.isArray(content.items) ? content.items.map(asRecord) : [];
    const steps = Array.isArray(content.steps) ? content.steps.map(asRecord) : [];
    return (
      <View testID={`lesson-block-${block.id}`} style={card}>
        {heading ? <Text style={{ marginBottom: 9, color: theme.text, fontSize: 14, fontWeight: "900" }}>{heading}</Text> : null}
        {variant === "objectives" || variant === "key_points" ? (
          <View style={{ gap: 9 }}>{items.map((item, index) => <View key={String(item.id || index)} style={{ flexDirection: "row", gap: 9 }}><Text style={{ color: theme.redText, fontWeight: "900" }}>{variant === "objectives" ? "✓" : "•"}</Text><View style={{ flex: 1 }}>{rich(htmlValue(item.html), String(item.id || index))}</View></View>)}</View>
        ) : variant === "example" ? (
          <View style={{ gap: 11 }}>
            {rich(htmlValue(content.scenarioHtml))}
            {steps.map((step, index) => <View key={String(step.id || index)} style={{ borderLeftWidth: 3, borderLeftColor: theme.blue, paddingLeft: 10 }}><Text style={{ color: theme.blue, fontSize: 11, fontWeight: "900", marginBottom: 4 }}>{htmlValue(step.title) || `Step ${index + 1}`}</Text>{rich(htmlValue(step.html))}</View>)}
            {content.answerHtml ? <View style={{ backgroundColor: theme.blueSoft, borderRadius: 10, padding: 10 }}>{rich(htmlValue(content.answerHtml))}</View> : null}
          </View>
        ) : variant === "recap" ? rich(htmlValue(content.takeawayHtml))
          : variant === "reflection" ? rich(htmlValue(content.promptHtml))
            : rich(htmlValue(content.html))}
      </View>
    );
  }

  if (normalized.type === "question") {
    const choices = Array.isArray(content.choices) ? content.choices.map(asRecord) : [];
    const multiple = content.answerType === "multi_select";
    return (
      <View testID={`lesson-block-${block.id}`} style={{ ...card, backgroundColor: theme.blueSoft }}>
        <Text style={{ color: theme.blue, fontSize: 11, fontWeight: "900", marginBottom: 8 }}>CHECKPOINT</Text>
        {rich(htmlValue(content.prompt))}
        <View style={{ gap: 8, marginTop: 12 }}>
          {choices.map((choice, index) => {
            const id = String(choice.id || `choice-${index + 1}`);
            const selected = selectedChoices.includes(id);
            return <Pressable key={id} accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityState={{ checked: selected }} onPress={() => setSelectedChoices((current) => multiple ? (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]) : [id])} style={{ minHeight: 44, borderWidth: 1, borderColor: selected ? theme.blue : theme.border, backgroundColor: theme.surface, borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 9 }}><MaterialCommunityIcons name={selected ? "radiobox-marked" : "radiobox-blank"} size={18} color={selected ? theme.blue : theme.muted} /><View style={{ flex: 1 }}>{rich(htmlValue(choice.html))}</View></Pressable>;
          })}
        </View>
      </View>
    );
  }

  if (normalized.type === "image") {
    const uri = htmlValue(content.legacyUrl) || htmlValue(content.url);
    const fileId = htmlValue(content.fileId);
    const source = uri
      ? { uri }
      : fileId
        ? buildProtectedImageSource(`/files/${encodeURIComponent(fileId)}/download`)
        : undefined;
    const caption = htmlValue(content.caption) || htmlValue(content.fileName) || "Lesson image";
    return <View testID={`lesson-block-${block.id}`} style={card}>{source ? <Image source={source} resizeMode="contain" accessibilityLabel={caption} style={{ width: "100%", height: 210, backgroundColor: theme.active, borderRadius: 10 }} /> : <View style={{ minHeight: 100, alignItems: "center", justifyContent: "center", backgroundColor: theme.active, borderRadius: 10 }}><MaterialCommunityIcons name="image-outline" size={30} color={theme.muted} /></View>}<Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>{caption}</Text></View>;
  }

  if (normalized.type === "video") {
    const url = htmlValue(content.url);
    const caption = htmlValue(content.caption) || "Lesson video";
    return <View testID={`lesson-block-${block.id}`} style={card}><Text style={{ color: theme.text, fontWeight: "900" }}>{caption}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Open ${caption}`} disabled={!url} onPress={() => void Linking.openURL(url)} style={{ minHeight: 44, marginTop: 10, borderRadius: 10, backgroundColor: theme.redSoft, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialCommunityIcons name="play-circle-outline" size={20} color={theme.redText} /><Text style={{ color: theme.redText, fontWeight: "900" }}>{url ? "Open video" : "Add a video link"}</Text></Pressable></View>;
  }

  const fileId = htmlValue(content.fileId);
  const fileName = htmlValue(content.fileName) || "Lesson file";
  return <View testID={`lesson-block-${block.id}`} style={card}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><MaterialCommunityIcons name="file-outline" size={24} color={theme.green} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: "900" }}>{fileName}</Text><Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>{htmlValue(content.mimeType) || "Attached resource"}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel={`Open ${fileName}`} disabled={!fileId || !onOpenFile} onPress={() => onOpenFile?.(fileId, fileName)} style={{ minHeight: 44, marginTop: 10, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.greenSoft }}><Text style={{ color: theme.green, fontWeight: "900" }}>Open file</Text></Pressable></View>;
}
