import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, Text, View } from "react-native";
import { EmptyState, ScreenScroll } from "../components/ui/primitives";
import {
  StudentBottomActionBar,
  StudentContextStrip,
  StudentFlatSection,
  StudentInlineNotice,
  StudentScreen,
} from "../components/student/StudentWorkspacePrimitives";
import { peekAppError, toAppError } from "../api/http";
import { useLessonCompleteMutation, useLessonCompletionStatus, useLessonDetail } from "../api/hooks";
import { navigateStudentDetailBack } from "../navigation/student-detail-back";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import type { ContentBlock } from "../types/lesson";
import { extractLessonBlockText, resolveLessonBlockMeta } from "../utils/lessonBlocks";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

function isNotFoundError(error: unknown) {
  return peekAppError(error).status === 404;
}

function extractBlockUrl(block: ContentBlock) {
  if (block.content && typeof block.content === "object") {
    const url = (block.content as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return "";
}

export function LessonDetailScreen({ route, navigation }: Props) {
  const { lessonId, classId, moduleId, source } = route.params;
  const [completedOverride, setCompletedOverride] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [understoodBlocks, setUnderstoodBlocks] = useState<Record<string, boolean>>({});
  const lessonQuery = useLessonDetail(lessonId);
  const completionStatusQuery = useLessonCompletionStatus(lessonId);
  const completeMutation = useLessonCompleteMutation(classId);
  const lesson = lessonQuery.data;
  const blocks = useMemo(() => [...(lesson?.contentBlocks ?? [])].sort((left, right) => left.order - right.order), [lesson?.contentBlocks]);
  const isCompleted = completedOverride ?? Boolean(completionStatusQuery.data?.completed);
  const refreshing = lessonQuery.isRefetching || completionStatusQuery.isRefetching;
  const primaryError = lessonQuery.error || completionStatusQuery.error;
  const lessonNotFound = !lesson && isNotFoundError(lessonQuery.error);
  const description = stripRichText(lesson?.description);
  const understoodCount = blocks.filter((block) => understoodBlocks[block.id]).length;

  const handleRefresh = () => {
    setActionError(null);
    void Promise.all([lessonQuery.refetch(), completionStatusQuery.refetch()]);
  };
  const handleBack = () => navigateStudentDetailBack(navigation, "LessonDetail", { lessonId, classId, moduleId, source });
  const handleComplete = async () => {
    try {
      setActionError(null);
      const result = await completeMutation.mutateAsync(lessonId);
      if (result && typeof result === "object" && "completed" in result) {
        setCompletedOverride(Boolean((result as { completed?: boolean }).completed));
        return;
      }
      setCompletedOverride(true);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  if (!lesson && lessonQuery.isLoading) {
    return <ScreenScroll backgroundColor={theme.bg}><View style={{ paddingTop: 40, paddingHorizontal: 20 }}><EmptyState emoji=".." title="Loading lesson" subtitle="Preparing the lesson detail view." /></View></ScreenScroll>;
  }
  if (lessonNotFound || (!lesson && !primaryError)) {
    return <ScreenScroll backgroundColor={theme.bg}><View style={{ paddingTop: 40, paddingHorizontal: 20 }}><EmptyState emoji="?" title="Lesson not found" subtitle="This lesson is unavailable right now." /></View></ScreenScroll>;
  }
  if (!lesson && primaryError) {
    return <StudentScreen title="Lesson" showBackButton onBackPress={handleBack}><StudentInlineNotice title="Lesson data is partially unavailable" description={peekAppError(primaryError).message} tone="amber" /></StudentScreen>;
  }
  if (!lesson) return null;

  return (
    <StudentScreen
      title="Lesson"
      showBackButton
      onBackPress={handleBack}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      bottomAction={
        <StudentBottomActionBar
          primaryLabel={isCompleted ? "Completed" : completeMutation.isPending ? "Marking..." : "Mark Complete"}
          primaryIcon={isCompleted ? "check" : "check-circle-outline"}
          disabled={isCompleted || completeMutation.isPending}
          onPrimary={() => void handleComplete()}
        />
      }
    >
      <StudentContextStrip
        title={lesson.title || "Lesson"}
        subtitle={`${classId ? "Class lesson" : "Lesson"} · Order ${lesson.order} · ${blocks.length} ${blocks.length === 1 ? "section" : "sections"}`}
        status={isCompleted ? "Completed" : `${understoodCount}/${blocks.length} checked`}
        icon="book-open-page-variant-outline"
      />
      {primaryError ? <StudentInlineNotice title="Lesson data is partially unavailable" description={peekAppError(primaryError).message} tone="amber" /> : null}
      {actionError ? <StudentInlineNotice title="Lesson action unavailable" description={actionError} tone="amber" /> : null}

      {description ? (
        <StudentFlatSection title="Lesson overview" subtitle="Teacher-provided introduction">
          <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
            <Text style={{ fontSize: 13, lineHeight: 21, color: theme.subtext }}>{description}</Text>
          </View>
        </StudentFlatSection>
      ) : null}

      {blocks.length === 0 ? (
        <StudentFlatSection title="Lesson content" subtitle="0 published sections">
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>No lesson content</Text>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: theme.muted }}>This lesson does not have published content blocks yet.</Text>
          </View>
        </StudentFlatSection>
      ) : blocks.map((block, index) => {
        const meta = resolveLessonBlockMeta(block.type);
        const text = extractLessonBlockText(block);
        const url = extractBlockUrl(block);
        const understood = Boolean(understoodBlocks[block.id]);
        const toneColor = meta.tone === "amber" ? theme.amber : meta.tone === "green" ? theme.green : meta.tone === "purple" ? theme.purple : theme.redText;
        return (
          <StudentFlatSection key={block.id} title={`${index + 1}. ${meta.label}`} subtitle={`Section ${index + 1} of ${blocks.length}`}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
              {block.type === "image" && url ? <Image source={{ uri: url }} resizeMode="cover" style={{ width: "100%", height: 190, marginBottom: 12, backgroundColor: theme.active }} /> : null}
              <Text style={{ fontSize: 14, lineHeight: 23, color: theme.subtext }}>
                {text || (url ? "Open this resource from the linked material above." : "This content block does not contain text that can be rendered in mobile yet.")}
              </Text>
              {meta.interactive ? (
                <Pressable accessibilityRole="button" onPress={() => setUnderstoodBlocks((current) => ({ ...current, [block.id]: !current[block.id] }))} style={{ alignSelf: "flex-start", minHeight: 44, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: understood ? theme.greenLine : theme.border, backgroundColor: understood ? theme.greenSoft : theme.bg, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <MaterialCommunityIcons name={understood ? "check-circle" : "check-circle-outline"} size={17} color={understood ? theme.green : toneColor} />
                  <Text style={{ color: understood ? theme.green : theme.text, fontSize: 11, fontWeight: "900" }}>{understood ? "Got it" : "I understand"}</Text>
                </Pressable>
              ) : null}
            </View>
          </StudentFlatSection>
        );
      })}
      <View style={{ height: 20 }} />
    </StudentScreen>
  );
}
