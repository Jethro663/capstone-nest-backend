import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  FloatingIconButton,
  GradientHeader,
  Pill,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { useLessonCompleteMutation, useLessonCompletionStatus, useLessonDetail } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";
import type { ContentBlock } from "../types/lesson";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

function extractBlockText(block: ContentBlock) {
  if (typeof block.content === "string") {
    return block.content.replace(/<[^>]+>/g, "").trim();
  }

  if (block.content && typeof block.content === "object") {
    const textValue = "text" in block.content ? block.content.text : undefined;
    const urlValue = "url" in block.content ? block.content.url : undefined;
    if (typeof textValue === "string" && textValue.trim()) return textValue.trim();
    if (typeof urlValue === "string" && urlValue.trim()) return urlValue.trim();
  }

  if (block.metadata && typeof block.metadata === "object") {
    const caption = "caption" in block.metadata ? block.metadata.caption : undefined;
    if (typeof caption === "string" && caption.trim()) return caption.trim();
  }

  return "";
}

function blockLabel(type: ContentBlock["type"]) {
  switch (type) {
    case "text":
      return "Reading";
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "question":
      return "Question";
    case "file":
      return "Attachment";
    case "divider":
      return "Divider";
    default:
      return "Content";
  }
}

export function LessonDetailScreen({ route, navigation }: Props) {
  const { lessonId, classId } = route.params;
  const [completedOverride, setCompletedOverride] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lessonQuery = useLessonDetail(lessonId);
  const completionStatusQuery = useLessonCompletionStatus(lessonId);
  const completeMutation = useLessonCompleteMutation(classId);

  const lesson = lessonQuery.data;
  const blocks = useMemo(
    () => [...(lesson?.contentBlocks ?? [])].sort((left, right) => left.order - right.order),
    [lesson?.contentBlocks],
  );
  const isCompleted = completedOverride ?? Boolean(completionStatusQuery.data?.completed);
  const refreshing = lessonQuery.isRefetching || completionStatusQuery.isRefetching;
  const primaryError = lessonQuery.error || completionStatusQuery.error;

  const handleRefresh = () => {
    setActionError(null);
    void Promise.all([lessonQuery.refetch(), completionStatusQuery.refetch()]);
  };

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
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading lesson" subtitle="Preparing the lesson detail view." />
        </View>
      </ScreenScroll>
    );
  }

  if (!lesson && primaryError) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Lesson data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        </View>
      </ScreenScroll>
    );
  }

  if (!lesson) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Lesson not found" subtitle="This lesson is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <GradientHeader
        colors={gradients.classes}
        eyebrow={classId ? `Class ${classId}` : "Lesson Detail"}
        title={lesson.title || "Lesson"}
        rightContent={<FloatingIconButton icon="chevron-left" onPress={() => navigation.goBack()} />}
      >
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.88)", fontSize: 12 }}>
          {lesson.description || "Review the lesson blocks and mark the lesson complete when you are done."}
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 16 }}>
        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Lesson data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        <Card>
          <SectionTitle
            title="Lesson Progress"
            right={
              <Pill
                label={isCompleted ? "Completed" : "In Progress"}
                backgroundColor={isCompleted ? colors.paleGreen : colors.paleAmber}
                color={isCompleted ? colors.greenDeep : colors.orange}
              />
            }
          />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {blocks.length} content blocks • Order {lesson.order}
          </Text>
        </Card>

        {actionError ? (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.red }}>Lesson action unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{actionError}</Text>
          </Card>
        ) : null}

        {blocks.length === 0 ? (
          <EmptyState emoji=".." title="No lesson content" subtitle="This lesson does not have published content blocks yet." />
        ) : (
          blocks.map((block) => (
            <Card key={block.id} style={shadow.card}>
              <SectionTitle title={blockLabel(block.type)} />
              <Text style={{ fontSize: 13, lineHeight: 20, color: colors.text }}>
                {extractBlockText(block) || "This content block does not contain text that can be rendered in mobile yet."}
              </Text>
            </Card>
          ))
        )}

        <Pressable
          onPress={() => {
            void handleComplete();
          }}
          disabled={isCompleted || completeMutation.isPending}
          style={[
            {
              alignItems: "center",
              borderRadius: 18,
              backgroundColor: isCompleted ? colors.paleGreen : colors.text,
              paddingVertical: 16,
            },
            shadow.card,
          ]}
        >
          <Text style={{ color: isCompleted ? colors.greenDeep : colors.white, fontSize: 13, fontWeight: "900" }}>
            {isCompleted ? "Completed" : completeMutation.isPending ? "Marking..." : "Mark Complete"}
          </Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
