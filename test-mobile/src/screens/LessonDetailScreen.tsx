import { useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { EmptyState, Refreshable, ScreenScroll } from "../components/ui/primitives";
import { peekAppError, toAppError } from "../api/http";
import { useLessonCompleteMutation, useLessonCompletionStatus, useLessonDetail } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import type { ContentBlock } from "../types/lesson";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

function extractBlockText(block: ContentBlock) {
  if (typeof block.content === "string") {
    return stripRichText(block.content);
  }

  if (block.content && typeof block.content === "object") {
    const textValue = "text" in block.content ? block.content.text : undefined;
    const urlValue = "url" in block.content ? block.content.url : undefined;
    const htmlValue = "html" in block.content ? block.content.html : undefined;
    if (typeof textValue === "string" && textValue.trim()) return stripRichText(textValue);
    if (typeof htmlValue === "string" && htmlValue.trim()) return stripRichText(htmlValue);
    if (typeof urlValue === "string" && urlValue.trim()) return urlValue.trim();
  }

  if (block.metadata && typeof block.metadata === "object") {
    const caption = "caption" in block.metadata ? block.metadata.caption : undefined;
    if (typeof caption === "string" && caption.trim()) return stripRichText(caption);
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
      return "Checkpoint";
    case "file":
      return "Attachment";
    case "divider":
      return "Divider";
    default:
      return "Content";
  }
}

function blockIcon(type: ContentBlock["type"]) {
  switch (type) {
    case "image":
      return "image-outline";
    case "video":
      return "play-circle-outline";
    case "question":
      return "help-circle-outline";
    case "file":
      return "file-document-outline";
    case "divider":
      return "minus";
    default:
      return "book-open-variant";
  }
}

function isNotFoundError(error: unknown) {
  return peekAppError(error).status === 404;
}

function DarkPanel({ children, style }: PropsWithChildren<{ style?: object }>) {
  return (
    <View
      style={[
        {
          marginHorizontal: 16,
          marginTop: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          paddingHorizontal: 14,
          paddingVertical: 13,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function ToneTag({ label, tone }: { label: string; tone: "blue" | "green" | "amber" | "red" | "purple" }) {
  const toneStyle = {
    blue: { backgroundColor: theme.blueSoft, color: "#6AABFF" },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    red: { backgroundColor: theme.redSoft, color: "#FF6B87" },
    purple: { backgroundColor: theme.purpleSoft, color: "#C4B0FF" },
  }[tone];

  return (
    <View style={{ borderRadius: 4, backgroundColor: toneStyle.backgroundColor, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: toneStyle.color }}>{label}</Text>
    </View>
  );
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
  const lessonNotFound = !lesson && isNotFoundError(lessonQuery.error);
  const description = stripRichText(lesson?.description);
  const headerDescription =
    description.length > 180 ? `${description.slice(0, 180).trimEnd()}...` : description;

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
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading lesson" subtitle="Preparing the lesson detail view." />
        </View>
      </ScreenScroll>
    );
  }

  if (lessonNotFound) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Lesson not found" subtitle="This lesson is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  if (!lesson && primaryError) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <DarkPanel style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Lesson data is partially unavailable</Text>
          <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#999999" }}>{peekAppError(primaryError).message}</Text>
        </DarkPanel>
      </ScreenScroll>
    );
  }

  if (!lesson) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Lesson not found" subtitle="This lesson is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll backgroundColor={theme.bg} refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.red,
              }}
            >
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                {classId ? "Class lesson" : "Lesson Detail"}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 22, lineHeight: 27, fontWeight: "800", color: theme.text }}>
                {lesson.title || "Lesson"}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.active,
              }}
            >
              <MaterialCommunityIcons name="chevron-left" size={18} color={theme.text} />
            </Pressable>
          </View>

          {headerDescription ? (
            <Text numberOfLines={3} style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: "#999999" }}>
              {headerDescription}
            </Text>
          ) : null}

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ToneTag label={`${blocks.length} blocks`} tone="blue" />
            <ToneTag label={`Order ${lesson.order}`} tone="purple" />
            <ToneTag label={isCompleted ? "Completed" : "In progress"} tone={isCompleted ? "green" : "amber"} />
          </View>
        </View>
      </View>

      {primaryError ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Lesson data is partially unavailable</Text>
          <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#999999" }}>{peekAppError(primaryError).message}</Text>
        </DarkPanel>
      ) : null}

      {actionError ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#FF6B87" }}>Lesson action unavailable</Text>
          <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#999999" }}>{actionError}</Text>
        </DarkPanel>
      ) : null}

      {description ? (
        <DarkPanel style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.redSoft,
              }}
            >
              <MaterialCommunityIcons name="text-box-outline" size={15} color={theme.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>Lesson overview</Text>
              <Text style={{ marginTop: 1, fontSize: 10, color: theme.muted }}>Teacher-provided material</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 21, color: "#BDBDBD" }}>{description}</Text>
        </DarkPanel>
      ) : null}

      {blocks.length === 0 ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>No lesson content</Text>
          <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: "#999999" }}>
            This lesson does not have published content blocks yet.
          </Text>
        </DarkPanel>
      ) : (
        blocks.map((block, index) => (
          <DarkPanel key={block.id} style={{ marginTop: index === 0 ? 14 : 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: block.type === "question" ? theme.amberSoft : theme.blueSoft,
                }}
              >
                <MaterialCommunityIcons
                  name={blockIcon(block.type)}
                  size={15}
                  color={block.type === "question" ? theme.amber : theme.blue}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>{blockLabel(block.type)}</Text>
                <Text style={{ marginTop: 1, fontSize: 10, color: theme.muted }}>Block {index + 1}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, lineHeight: 21, color: "#BDBDBD" }}>
              {extractBlockText(block) || "This content block does not contain text that can be rendered in mobile yet."}
            </Text>
          </DarkPanel>
        ))
      )}

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          marginBottom: 12,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => {
            void handleComplete();
          }}
          disabled={isCompleted || completeMutation.isPending}
          style={{
            flex: 1,
            alignItems: "center",
            borderRadius: 12,
            backgroundColor: isCompleted ? theme.greenSoft : theme.red,
            paddingVertical: 13,
          }}
        >
          <Text style={{ color: isCompleted ? theme.green : "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
            {isCompleted ? "Completed" : completeMutation.isPending ? "Marking..." : "Mark Complete"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>Back</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
