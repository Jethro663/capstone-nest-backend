import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { LessonBlockDraft } from "../../types/lesson";
import { teacherTheme as theme, TeacherActionButton } from "../teacher/TeacherMobilePrimitives";
import { TeacherCenteredDialog } from "../teacher/TeacherWorkspacePrimitives";
import { MobileRichTextEditor } from "../ui/MobileRichTextEditor";

type FileSelection = {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

type Props = {
  visible: boolean;
  title: string;
  initialDraft: LessonBlockDraft;
  saving?: boolean;
  onClose(): void;
  onSave(draft: LessonBlockDraft): void;
  onPickFile?(kind: "image" | "file"): Promise<FileSelection | null>;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function Field({ label, value, onChangeText, multiline = false }: { label: string; value: string; onChangeText(value: string): void; multiline?: boolean }) {
  return <View style={{ gap: 6 }}><Text style={{ color: theme.text, fontWeight: "800", fontSize: 12 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} style={{ minHeight: multiline ? 82 : 46, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, color: theme.text, backgroundColor: theme.surface, textAlignVertical: multiline ? "top" : "center" }} /></View>;
}

export function LessonBlockEditorDialog({ visible, title, initialDraft, saving = false, onClose, onSave, onPickFile }: Props) {
  const [draft, setDraft] = useState<LessonBlockDraft>(initialDraft);
  useEffect(() => {
    if (visible) setDraft(JSON.parse(JSON.stringify(initialDraft)) as LessonBlockDraft);
  }, [initialDraft, visible]);
  const content = useMemo(() => record(draft.content), [draft.content]);
  const metadata = useMemo(() => record(draft.metadata), [draft.metadata]);
  const setContent = (patch: Record<string, unknown>) => setDraft((current) => ({ ...current, content: { ...record(current.content), ...patch } }));
  const setMetadata = (patch: Record<string, unknown>) => setDraft((current) => ({ ...current, metadata: { ...record(current.metadata), ...patch } }));
  const variant = stringValue(metadata.variant) || "body";

  const renderTextEditor = () => {
    if (variant === "objectives" || variant === "key_points") {
      const items = Array.isArray(content.items) ? content.items.map(record) : [];
      return <View style={{ gap: 12 }}><Field label="Heading" value={stringValue(content.heading)} onChangeText={(heading) => setContent({ heading })} />{items.map((item, index) => <View key={stringValue(item.id) || String(index)} style={{ gap: 6, borderLeftWidth: 3, borderLeftColor: theme.redLine, paddingLeft: 10 }}><MobileRichTextEditor label={`${variant === "objectives" ? "Objective" : "Key point"} ${index + 1}`} value={stringValue(item.html)} onChange={(html) => setContent({ items: items.map((entry, itemIndex) => itemIndex === index ? { ...entry, html } : entry) })} /><TeacherActionButton label="Remove item" icon="close" tone="neutral" onPress={() => setContent({ items: items.filter((_, itemIndex) => itemIndex !== index) })} /></View>)}<TeacherActionButton label="Add item" icon="plus" tone="blue" onPress={() => setContent({ items: [...items, { id: `${variant}-${Date.now()}`, html: "<p>Write the next item.</p>" }] })} /></View>;
    }
    if (variant === "example") {
      const steps = Array.isArray(content.steps) ? content.steps.map(record) : [];
      return <View style={{ gap: 12 }}><Field label="Heading" value={stringValue(content.heading)} onChangeText={(heading) => setContent({ heading })} /><MobileRichTextEditor label="Scenario" value={stringValue(content.scenarioHtml)} onChange={(scenarioHtml) => setContent({ scenarioHtml })} />{steps.map((step, index) => <View key={stringValue(step.id) || String(index)} style={{ gap: 7, borderLeftWidth: 3, borderLeftColor: theme.blue, paddingLeft: 10 }}><Field label={`Step ${index + 1} title`} value={stringValue(step.title)} onChangeText={(stepTitle) => setContent({ steps: steps.map((entry, stepIndex) => stepIndex === index ? { ...entry, title: stepTitle } : entry) })} /><MobileRichTextEditor label={`Step ${index + 1} explanation`} value={stringValue(step.html)} onChange={(html) => setContent({ steps: steps.map((entry, stepIndex) => stepIndex === index ? { ...entry, html } : entry) })} /><TeacherActionButton label="Remove step" icon="close" tone="neutral" onPress={() => setContent({ steps: steps.filter((_, stepIndex) => stepIndex !== index) })} /></View>)}<TeacherActionButton label="Add step" icon="plus" tone="blue" onPress={() => setContent({ steps: [...steps, { id: `step-${Date.now()}`, title: `Step ${steps.length + 1}`, html: "<p>Explain this step.</p>" }] })} /><MobileRichTextEditor label="Why it works" value={stringValue(content.answerHtml)} onChange={(answerHtml) => setContent({ answerHtml })} /></View>;
    }
    if (variant === "recap") return <View style={{ gap: 12 }}><Field label="Heading" value={stringValue(content.heading)} onChangeText={(heading) => setContent({ heading })} /><MobileRichTextEditor label="Main takeaway" value={stringValue(content.takeawayHtml)} onChange={(takeawayHtml) => setContent({ takeawayHtml })} /></View>;
    if (variant === "reflection") return <View style={{ gap: 12 }}><Field label="Heading" value={stringValue(content.heading)} onChangeText={(heading) => setContent({ heading })} /><MobileRichTextEditor label="Reflection prompt" value={stringValue(content.promptHtml)} onChange={(promptHtml) => setContent({ promptHtml })} /></View>;
    return <View style={{ gap: 12 }}><Field label="Heading (optional)" value={stringValue(content.heading)} onChangeText={(heading) => setContent({ heading })} /><MobileRichTextEditor label="Paragraph" value={stringValue(content.html)} onChange={(html) => setContent({ html })} /></View>;
  };

  const renderQuestionEditor = () => {
    const choices = Array.isArray(content.choices) ? content.choices.map(record) : [];
    const correct = Array.isArray(metadata.correctAnswers) ? metadata.correctAnswers.map(String) : [];
    return <View style={{ gap: 12 }}><MobileRichTextEditor label="Question" value={stringValue(content.prompt)} onChange={(prompt) => setContent({ prompt })} /><View style={{ flexDirection: "row", gap: 8 }}>{(["single_select", "multi_select"] as const).map((answerType) => <Pressable key={answerType} accessibilityRole="radio" accessibilityState={{ checked: content.answerType === answerType }} onPress={() => setContent({ answerType })} style={{ flex: 1, minHeight: 44, borderWidth: 1, borderColor: content.answerType === answerType ? theme.redText : theme.border, borderRadius: 10, alignItems: "center", justifyContent: "center" }}><Text style={{ color: content.answerType === answerType ? theme.redText : theme.muted, fontWeight: "800", fontSize: 11 }}>{answerType === "single_select" ? "One answer" : "Multiple answers"}</Text></Pressable>)}</View>{choices.map((choice, index) => { const id = stringValue(choice.id) || `choice-${index + 1}`; const checked = correct.includes(id); return <View key={id} style={{ gap: 6, borderLeftWidth: 3, borderLeftColor: checked ? theme.green : theme.border, paddingLeft: 10 }}><MobileRichTextEditor label={`Choice ${index + 1}`} value={stringValue(choice.html)} onChange={(html) => setContent({ choices: choices.map((entry, choiceIndex) => choiceIndex === index ? { ...entry, id, html } : entry) })} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setMetadata({ correctAnswers: checked ? correct.filter((entry) => entry !== id) : [...correct, id] })} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={{ color: checked ? theme.green : theme.muted, fontWeight: "900" }}>{checked ? "✓ Correct answer" : "Mark as correct"}</Text></Pressable></View>; })}<TeacherActionButton label="Add choice" icon="plus" tone="blue" onPress={() => setContent({ choices: [...choices, { id: `choice-${Date.now()}`, html: "<p>New option</p>" }] })} /><MobileRichTextEditor label="Explanation" value={stringValue(metadata.explanation)} onChange={(explanation) => setMetadata({ explanation })} /><Field label="Points" value={String(metadata.points ?? 1)} onChangeText={(points) => setMetadata({ points: Math.max(1, Number.parseInt(points, 10) || 1) })} /></View>;
  };

  const renderMediaEditor = () => {
    if (draft.type === "video") return <View style={{ gap: 12 }}><Field label="YouTube URL" value={stringValue(content.url)} onChangeText={(url) => setContent({ url })} /><Field label="Caption" value={stringValue(content.caption)} onChangeText={(caption) => setContent({ caption })} /></View>;
    if (draft.type === "divider") return <Text style={{ color: theme.muted, lineHeight: 19 }}>A simple divider gives learners a visual pause without adding another content card.</Text>;
    const kind = draft.type === "image" ? "image" : "file";
    return <View style={{ gap: 12 }}><View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12 }}><Text style={{ color: theme.text, fontWeight: "900" }}>{stringValue(content.fileName) || `No ${kind} selected`}</Text><Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{stringValue(content.mimeType) || "Choose a file from this device"}</Text></View><TeacherActionButton label={draft.type === "image" ? "Choose image" : "Choose file"} icon="paperclip" tone="blue" onPress={() => void onPickFile?.(kind).then((selected) => { if (selected) setContent(selected); })} />{draft.type === "image" ? <Field label="Caption" value={stringValue(content.caption)} onChangeText={(caption) => setContent({ caption })} /> : null}</View>;
  };

  return <TeacherCenteredDialog visible={visible} title={title} subtitle="Edit this block without changing its content shape." onClose={onClose} footer={<View style={{ flexDirection: "row", gap: 8 }}><TeacherActionButton label="Cancel" icon="close" tone="neutral" onPress={onClose} /><View style={{ flex: 1 }}><TeacherActionButton label={saving ? "Saving…" : "Save block"} icon="content-save-outline" tone="red" disabled={saving} onPress={() => onSave(draft)} /></View></View>}>
    {draft.type === "text" ? renderTextEditor() : draft.type === "question" ? renderQuestionEditor() : renderMediaEditor()}
  </TeacherCenteredDialog>;
}
