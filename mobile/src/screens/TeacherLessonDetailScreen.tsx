import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, Text, View } from "react-native";
import { useLessonDetail, useTeacherLessonDraftStateMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import { lessonsApi } from "../api/services/lessons";
import type { RootStackParamList } from "../navigation/types";
import { navigateTeacherDetailBack } from "../navigation/teacher-detail-back";
import { extractLessonBlockText, resolveLessonBlockMeta } from "../utils/lessonBlocks";
import {
  TeacherActionButton,
  TeacherScreen,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherActionSheet,
  TeacherBottomActionBar,
  TeacherContextStrip,
  TeacherFlatSection,
} from "../components/teacher/TeacherWorkspacePrimitives";

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

function buildLessonSubtitle(description?: string | null) {
  const stripped = stripRichText(description || "").replace(/\s+/g, " ").trim();
  if (!stripped) return "Read lesson blocks and change draft or published state from mobile.";
  return stripped.length > 180 ? `${stripped.slice(0, 177).trim()}...` : stripped;
}

export function TeacherLessonDetailScreen({ navigation, route }: Props) {
  const { classId, lessonId } = route.params;
  const handleBack = () =>
    navigateTeacherDetailBack(navigation, "TeacherLessonDetail", route.params);
  const lessonQuery = useLessonDetail(lessonId);
  const lesson = lessonQuery.data;
  const [controlsVisible, setControlsVisible] = useState(false);
  const draftMutation = useTeacherLessonDraftStateMutation(classId || lesson?.classId, lessonId);
  const versionsQuery = useQuery({ queryKey: ["lesson-versions", lessonId], queryFn: () => lessonsApi.getVersions(lessonId) });

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

  const createSnapshot = async () => {
    try {
      await lessonsApi.createVersion(lessonId, { label: `Mobile snapshot ${new Date().toLocaleString()}` });
      await versionsQuery.refetch();
      Alert.alert("Version saved", "A restorable lesson snapshot was created.");
    } catch (error) {
      Alert.alert("Unable to save version", toAppError(error).message);
    }
  };

  const restoreSnapshot = async (versionId: string) => {
    try {
      await lessonsApi.restoreVersion(lessonId, versionId);
      await Promise.all([lessonQuery.refetch(), versionsQuery.refetch()]);
      Alert.alert("Version restored", "The lesson now uses the selected snapshot.");
    } catch (error) {
      Alert.alert("Unable to restore version", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title={lesson?.title || "Lesson detail"}
      subtitle={buildLessonSubtitle(lesson?.description)}
      icon="text-box-outline"
      showBackButton
      onBackPress={handleBack}
      refreshing={lessonQuery.isRefetching}
      onRefresh={() => {
        void lessonQuery.refetch();
      }}
      bottomAction={
        lesson ? (
          <TeacherBottomActionBar
            primaryLabel="Edit lesson"
            primaryIcon="notebook-edit-outline"
            onPrimary={() => navigation.navigate("TeacherLessonEditor", { lessonId: lesson.id, classId: classId || lesson.classId })}
            secondary={
              <TeacherActionButton
                label="Options"
                icon="dots-horizontal"
                tone="neutral"
                onPress={() => setControlsVisible(true)}
              />
            }
          />
        ) : undefined
      }
    >
      {lesson ? (
        <>
          <TeacherContextStrip
            title={lesson.title}
            subtitle={`${blockCount} blocks · ${interactiveCount} interactive · ${buildLessonSubtitle(lesson.description)}`}
            status={lesson.isDraft ? "Draft" : "Published"}
            icon="text-box-outline"
          />
          <TeacherFlatSection title="Lesson content" subtitle="The same block sequence students consume.">
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
          </TeacherFlatSection>

          <TeacherActionSheet visible={controlsVisible} title="Lesson options" subtitle="Publishing and server-owned version history." onClose={() => setControlsVisible(false)}>
            <View style={{ paddingVertical: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <TeacherActionButton label={lesson.isDraft ? "Publish lesson" : "Move back to draft"} icon={lesson.isDraft ? "publish" : "file-hidden"} tone={lesson.isDraft ? "green" : "amber"} onPress={() => void togglePublish()} disabled={draftMutation.isPending} />
              <TeacherActionButton label="Save version" icon="content-save-check-outline" tone="blue" onPress={() => void createSnapshot()} />
            </View>
            <TeacherFlatSection title="Version history" subtitle="Create and restore server-owned lesson snapshots.">
              {(versionsQuery.data ?? []).length ? (versionsQuery.data ?? []).map((version) => (
                <View key={version.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>Version {version.versionNumber}{version.label ? ` - ${version.label}` : ""}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{new Date(version.createdAt).toLocaleString()}</Text>
                  </View>
                  <TeacherActionButton label="Restore" icon="history" tone="amber" onPress={() => void restoreSnapshot(version.id)} />
                </View>
              )) : <View style={{ padding: 14 }}><Text style={{ color: theme.muted }}>No saved versions yet.</Text></View>}
            </TeacherFlatSection>
          </TeacherActionSheet>
        </>
      ) : (
        <TeacherFlatSection title="Lesson unavailable" subtitle={lessonQuery.error ? toAppError(lessonQuery.error).message : "Loading lesson"} />
      )}
    </TeacherScreen>
  );
}
