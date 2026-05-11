import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { useLessonDetail, useTeacherLessonDraftStateMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { extractLessonBlockText, resolveLessonBlockMeta } from "../utils/lessonBlocks";
import {
  TeacherActionButton,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherLessonDetail">;

function resolveBlockUrl(block: { content?: unknown; metadata?: unknown }) {
  if (block.content && typeof block.content === "object") {
    const content = block.content as Record<string, unknown>;
    if (typeof content.url === "string") return content.url;
  }
  if (block.metadata && typeof block.metadata === "object") {
    const metadata = block.metadata as Record<string, unknown>;
    if (typeof metadata.url === "string") return metadata.url;
  }
  return null;
}

export function TeacherLessonDetailScreen({ navigation, route }: Props) {
  const { classId, lessonId } = route.params;
  const lessonQuery = useLessonDetail(lessonId);
  const lesson = lessonQuery.data;
  const draftMutation = useTeacherLessonDraftStateMutation(classId || lesson?.classId, lessonId);

  const blockCount = lesson?.contentBlocks?.length ?? 0;
  const interactiveCount = useMemo(
    () => (lesson?.contentBlocks ?? []).filter((entry) => resolveLessonBlockMeta(entry.type).interactive).length,
    [lesson?.contentBlocks],
  );

  const togglePublish = async () => {
    if (!lesson) return;
    try {
      await draftMutation.mutateAsync({
        lessonIds: [lesson.id],
        isDraft: !lesson.isDraft,
      });
    } catch (error) {
      Alert.alert("Unable to update lesson", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title={lesson?.title || "Lesson detail"}
      subtitle={lesson?.description || "Read lesson blocks and change draft or published state from mobile."}
      icon="text-box-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={lessonQuery.isRefetching}
      onRefresh={() => {
        void lessonQuery.refetch();
      }}
    >
      {lesson ? (
        <>
          <TeacherStats
            items={[
              { label: "Blocks", value: blockCount, tone: "red" },
              { label: "Interactive", value: interactiveCount, tone: "blue" },
              { label: "State", value: lesson.isDraft ? "Draft" : "Published", tone: lesson.isDraft ? "amber" : "green" },
            ]}
          />

          <TeacherPanel title="Lesson controls" subtitle="This screen stays read-manage only and avoids deeper authoring UI.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <TeacherActionButton
                label={lesson.isDraft ? "Publish lesson" : "Move back to draft"}
                icon={lesson.isDraft ? "publish" : "file-hidden"}
                tone={lesson.isDraft ? "green" : "amber"}
                onPress={() => void togglePublish()}
                disabled={draftMutation.isPending}
              />
            </View>
          </TeacherPanel>

          <TeacherPanel title="Lesson content" subtitle="Teachers can review the same block sequence students consume.">
            {(lesson.contentBlocks ?? []).map((block, index) => {
              const meta = resolveLessonBlockMeta(block.type);
              const blockText = extractLessonBlockText(block);
              const imageUrl = resolveBlockUrl(block);
              return (
                <View
                  key={block.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: theme.red, textTransform: "uppercase", letterSpacing: 0.7 }}>
                    {meta.label} · Block {index + 1}
                  </Text>
                  {block.type === "image" && imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      resizeMode="contain"
                      style={{ marginTop: 10, width: "100%", height: 190, borderRadius: 12, backgroundColor: theme.active }}
                    />
                  ) : null}
                  <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: theme.text }}>
                    {blockText || "This block does not have text that mobile can render."}
                  </Text>
                </View>
              );
            })}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Lesson unavailable" subtitle={lessonQuery.error ? toAppError(lessonQuery.error).message : "Loading lesson"} />
      )}
    </TeacherScreen>
  );
}
