import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLessonDetail } from "../api/hooks";
import { toAppError } from "../api/http";
import { lessonsApi } from "../api/services/lessons";
import { fileUploadApi } from "../api/services/file-upload";
import type { RootStackParamList } from "../navigation/types";
import type { ContentBlock, LessonBlockDraft } from "../types/lesson";
import { createLessonBlockDraft, LESSON_BLOCK_CHOICES, resolveLessonBlockMeta } from "../utils/lessonBlocks";
import { LessonBlockEditorDialog } from "../components/lesson/LessonBlockEditorDialog";
import { LessonBlockRenderer } from "../components/lesson/LessonBlockRenderer";
import { MobileRichTextEditor } from "../components/ui/MobileRichTextEditor";
import {
  TeacherActionButton,
  TeacherInlineField,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherBottomActionBar,
  TeacherCenteredDialog,
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherSegmentedTabs,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherLessonEditor">;
type EditorTarget = { blockId?: string; insertIndex: number; title: string; draft: LessonBlockDraft };

function draftFromBlock(block: ContentBlock): LessonBlockDraft {
  return {
    type: block.type,
    content: typeof block.content === "string" ? block.content : { ...(block.content ?? {}) },
    metadata: { ...(block.metadata ?? {}) },
  };
}

export function TeacherLessonEditorScreen({ navigation, route }: Props) {
  const { lessonId, classId } = route.params;
  const lessonQuery = useLessonDetail(lessonId);
  const lesson = lessonQuery.data;
  const [tab, setTab] = useState<"details" | "content">("content");
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [paletteIndex, setPaletteIndex] = useState<number | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const blocks = useMemo(
    () => [...(lesson?.contentBlocks ?? [])].sort((left, right) => left.order - right.order),
    [lesson?.contentBlocks],
  );
  const currentTitle = title ?? lesson?.title ?? "";
  const currentDescription = description ?? lesson?.description ?? "";

  const reload = async () => {
    await lessonQuery.refetch();
  };

  const saveDetails = async () => {
    if (!currentTitle.trim()) {
      Alert.alert("Title required", "Give this lesson a title before saving.");
      return;
    }
    try {
      setSaving(true);
      await lessonsApi.update(lessonId, {
        title: currentTitle.trim(),
        description: currentDescription,
      });
      setTitle(null);
      setDescription(null);
      await reload();
      Alert.alert("Lesson saved", "The title and rich description are up to date.");
    } catch (error) {
      Alert.alert("Unable to save lesson", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveBlock = async (target: EditorTarget, draft: LessonBlockDraft) => {
    if (!lesson) return;
    try {
      setSaving(true);
      if (target.blockId) {
        await lessonsApi.updateBlock(target.blockId, {
          type: draft.type,
          content: draft.content,
          metadata: draft.metadata,
        });
      } else {
        const created = await lessonsApi.createBlock(lesson.id, {
          type: draft.type,
          content: draft.content,
          metadata: draft.metadata,
          order: target.insertIndex + 1,
        });
        const next = [...blocks];
        next.splice(target.insertIndex, 0, created);
        await lessonsApi.reorderBlocks(lesson.id, {
          blocks: next.map((block, index) => ({ id: block.id, order: index + 1 })),
        });
      }
      setEditor(null);
      await reload();
    } catch (error) {
      Alert.alert("Unable to save block", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const moveBlock = async (index: number, direction: -1 | 1) => {
    if (!lesson) return;
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    try {
      await lessonsApi.reorderBlocks(lesson.id, { blocks: next.map((block, order) => ({ id: block.id, order: order + 1 })) });
      await reload();
    } catch (error) {
      Alert.alert("Unable to move block", toAppError(error).message);
    }
  };

  const removeBlock = (block: ContentBlock) => {
    Alert.alert("Delete this block?", "The lesson version history will preserve the previous content.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void lessonsApi.deleteBlock(block.id).then(reload).catch((error) => Alert.alert("Unable to delete block", toAppError(error).message)) },
    ]);
  };

  const togglePublish = async () => {
    if (!lesson) return;
    try {
      if (lesson.isDraft) await lessonsApi.publish(lesson.id);
      else await lessonsApi.setDraftState(classId || lesson.classId, { lessonIds: [lesson.id], isDraft: true });
      await reload();
    } catch (error) {
      Alert.alert("Unable to change lesson status", toAppError(error).message);
    }
  };

  const pickFile = async (kind: "image" | "file") => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({ type: kind === "image" ? "image/*" : "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return null;
      const asset = result.assets[0];
      const uploaded = await fileUploadApi.upload({ uri: asset.uri, name: asset.name, type: asset.mimeType }, { classId: classId || lesson?.classId, scope: "private" });
      return { fileId: uploaded.id, fileName: uploaded.originalName || asset.name, mimeType: uploaded.mimeType || asset.mimeType || "application/octet-stream", sizeBytes: uploaded.sizeBytes };
    } catch (error) {
      Alert.alert("Unable to attach file", toAppError(error).message);
      return null;
    }
  };

  const addButton = (insertIndex: number) => (
    <TeacherActionButton label="Add here" icon="plus" tone="neutral" onPress={() => setPaletteIndex(insertIndex)} />
  );

  return (
    <TeacherScreen
      title="Lesson editor"
      subtitle={lesson?.title || "Build a student-ready lesson"}
      icon="notebook-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={lessonQuery.isRefetching}
      onRefresh={() => void reload()}
      bottomAction={tab === "details" ? <TeacherBottomActionBar primaryLabel={saving ? "Saving…" : "Save details"} primaryIcon="content-save-outline" disabled={saving} onPrimary={() => void saveDetails()} /> : undefined}
    >
      {lesson ? <>
        <TeacherContextStrip title={lesson.title} subtitle={`${blocks.length} blocks · ${lesson.isDraft ? "Not visible to learners" : "Visible to learners"}`} status={lesson.isDraft ? "Draft" : "Published"} icon="notebook-edit-outline" />
        <TeacherSegmentedTabs accessibilityLabel="Lesson editor sections" activeKey={tab} onSelect={setTab} items={[{ key: "details", label: "Details" }, { key: "content", label: "Content", count: blocks.length }]} />

        {tab === "details" ? <TeacherFlatSection title="Lesson details" subtitle="Keep the introduction useful and easy to scan.">
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, gap: 14 }}>
            <TeacherInlineField label="Title" value={currentTitle} onChangeText={setTitle} />
            <MobileRichTextEditor label="Description" value={currentDescription} onChange={setDescription} extendedFormatting />
            <TeacherActionButton label={lesson.isDraft ? "Publish lesson" : "Move to draft"} icon={lesson.isDraft ? "publish" : "file-hidden"} tone={lesson.isDraft ? "green" : "amber"} onPress={() => void togglePublish()} />
          </View>
        </TeacherFlatSection> : <TeacherFlatSection title="Lesson content" subtitle="Add at any boundary; edit without losing structure.">
          <View style={{ paddingHorizontal: 16, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.border, gap: 12 }}>
            <View style={{ alignItems: "center", paddingTop: 10 }}>{addButton(0)}</View>
            {blocks.map((block, index) => {
              const meta = resolveLessonBlockMeta(block.type);
              return <View key={block.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>{index + 1}. {meta.label}</Text></View>
                  <TeacherActionButton label={`Edit block ${index + 1}`} icon="pencil-outline" tone="blue" onPress={() => setEditor({ blockId: block.id, insertIndex: index, title: `Edit ${meta.label}`, draft: draftFromBlock(block) })} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move block ${index + 1} up`} disabled={index === 0} onPress={() => void moveBlock(index, -1)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: index === 0 ? 0.35 : 1 }}><MaterialCommunityIcons name="arrow-up" size={19} color={theme.muted} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move block ${index + 1} down`} disabled={index === blocks.length - 1} onPress={() => void moveBlock(index, 1)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: index === blocks.length - 1 ? 0.35 : 1 }}><MaterialCommunityIcons name="arrow-down" size={19} color={theme.muted} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete block ${index + 1}`} onPress={() => removeBlock(block)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="trash-can-outline" size={19} color={theme.redText} /></Pressable>
                </View>
                <LessonBlockRenderer block={block} onOpenFile={(fileId, fileName) => void fileUploadApi.open(fileId, fileName)} />
                <View style={{ alignItems: "center" }}>{addButton(index + 1)}</View>
              </View>;
            })}
            {!blocks.length ? <Text style={{ color: theme.muted, textAlign: "center", lineHeight: 19 }}>Start with an objective, paragraph, checkpoint, or resource.</Text> : null}
          </View>
        </TeacherFlatSection>}

        <TeacherCenteredDialog visible={paletteIndex !== null} title="Add lesson content" subtitle="Choose the shape learners need next." onClose={() => setPaletteIndex(null)}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LESSON_BLOCK_CHOICES.map((choice) => <Pressable key={choice.key} accessibilityRole="button" accessibilityLabel={`Add ${choice.label}`} onPress={() => { const index = paletteIndex ?? blocks.length; setPaletteIndex(null); setEditor({ insertIndex: index, title: `Add ${choice.label}`, draft: createLessonBlockDraft(choice.key) }); }} style={{ width: "48%", minHeight: 74, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 11, backgroundColor: theme.surface }}><MaterialCommunityIcons name={choice.icon as never} size={19} color={theme.redText} /><Text style={{ marginTop: 6, color: theme.text, fontWeight: "900", fontSize: 12 }}>{choice.label}</Text><Text style={{ marginTop: 2, color: theme.muted, fontSize: 10 }}>{choice.description}</Text></Pressable>)}
          </View>
        </TeacherCenteredDialog>

        {editor ? <LessonBlockEditorDialog visible title={editor.title} initialDraft={editor.draft} saving={saving} onClose={() => setEditor(null)} onSave={(draft) => void saveBlock(editor, draft)} onPickFile={pickFile} /> : null}
      </> : <TeacherFlatSection title="Lesson unavailable" subtitle={lessonQuery.error ? toAppError(lessonQuery.error).message : "Loading lesson"} />}
    </TeacherScreen>
  );
}
