import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useLessonDetail, useTeacherLessonDraftStateMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import { lessonsApi } from "../api/services/lessons";
import { fileUploadApi } from "../api/services/file-upload";
import type { RootStackParamList } from "../navigation/types";
import { navigateTeacherDetailBack } from "../navigation/teacher-detail-back";
import type { ContentBlock, LessonVersionDetail } from "../types/lesson";
import { LessonBlockRenderer } from "../components/lesson/LessonBlockRenderer";
import { RichTextContent } from "../components/ui/RichTextContent";
import { TeacherActionButton, TeacherScreen, stripRichText, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";
import { TeacherActionSheet, TeacherBottomActionBar, TeacherCenteredDialog, TeacherFlatSection, TeacherInlineNotice, TeacherSegmentedTabs } from "../components/teacher/TeacherWorkspacePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherLessonDetail">;
type PreviewMode = "mobile" | "web";

function buildLessonSubtitle(description?: string | null) {
  const stripped = stripRichText(description || "").replace(/\s+/g, " ").trim();
  if (!stripped) return "Preview the student experience before publishing.";
  return stripped.length > 120 ? `${stripped.slice(0, 117).trim()}...` : stripped;
}

export function TeacherLessonDetailScreen({ navigation, route }: Props) {
  const { classId, lessonId } = route.params;
  const handleBack = () => navigateTeacherDetailBack(navigation, "TeacherLessonDetail", route.params);
  const lessonQuery = useLessonDetail(lessonId);
  const lesson = lessonQuery.data;
  const [controlsVisible, setControlsVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [webPreviewUrl, setWebPreviewUrl] = useState<string | null>(null);
  const [webPreviewLoading, setWebPreviewLoading] = useState(false);
  const [webPreviewError, setWebPreviewError] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<LessonVersionDetail | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const draftMutation = useTeacherLessonDraftStateMutation(classId || lesson?.classId, lessonId);
  const versionsQuery = useQuery({ queryKey: ["lesson-versions", lessonId], queryFn: () => lessonsApi.getVersions(lessonId) });
  const blocks = useMemo(() => [...(lesson?.contentBlocks ?? [])].sort((left, right) => left.order - right.order), [lesson?.contentBlocks]);

  const loadWebPreview = async () => {
    try {
      setWebPreviewLoading(true);
      setWebPreviewError(null);
      const session = await lessonsApi.createPreviewSession(lessonId);
      setWebPreviewUrl(session.url);
    } catch (error) {
      setWebPreviewError(toAppError(error).message);
      setWebPreviewUrl(null);
    } finally {
      setWebPreviewLoading(false);
    }
  };

  const selectPreviewMode = (mode: PreviewMode) => {
    setPreviewMode(mode);
    if (mode === "web" && !webPreviewUrl && !webPreviewLoading) void loadWebPreview();
  };

  const togglePublish = async () => {
    if (!lesson) return;
    try {
      await draftMutation.mutateAsync({ lessonIds: [lesson.id], isDraft: !lesson.isDraft });
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

  const reviewSnapshot = async (versionId: string) => {
    try {
      setVersionLoading(true);
      const detail = await lessonsApi.getVersionDetail(lessonId, versionId);
      setControlsVisible(false);
      setVersionDetail(detail);
    } catch (error) {
      Alert.alert("Unable to open version", toAppError(error).message);
    } finally {
      setVersionLoading(false);
    }
  };

  const restoreSnapshot = async () => {
    if (!versionDetail) return;
    try {
      setRestoring(true);
      await lessonsApi.restoreVersion(lessonId, versionDetail.id, { expectedLessonUpdatedAt: versionDetail.inspectedLessonUpdatedAt });
      setVersionDetail(null);
      setWebPreviewUrl(null);
      await Promise.all([lessonQuery.refetch(), versionsQuery.refetch()]);
      Alert.alert("Version restored", "The reviewed snapshot is now the current lesson.");
    } catch (error) {
      const appError = toAppError(error);
      Alert.alert(appError.status === 409 ? "Lesson changed" : "Unable to restore version", appError.status === 409 ? "Refresh version history and review the snapshot again before restoring." : appError.message);
      if (appError.status === 409) setVersionDetail(null);
    } finally {
      setRestoring(false);
    }
  };

  const mobilePreview = <View style={{ gap: 10 }}>
    {lesson?.description ? <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, backgroundColor: theme.surface }}><RichTextContent html={lesson.description} color={theme.text} mutedColor={theme.muted} accentColor={theme.redText} /></View> : null}
    {blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} onOpenFile={(fileId, fileName) => void fileUploadApi.open(fileId, fileName)} />)}
    {!blocks.length ? <Text style={{ color: theme.muted, textAlign: "center", paddingVertical: 24 }}>This lesson does not have blocks yet.</Text> : null}
  </View>;

  const webPreview = <View style={{ minHeight: 440, borderWidth: 1, borderColor: theme.border, borderRadius: 14, overflow: "hidden", backgroundColor: theme.surface }}>
    {webPreviewLoading ? <View style={{ flex: 1, minHeight: 440, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.muted }}>Creating secure web preview…</Text></View>
      : webPreviewError ? <View style={{ minHeight: 440, alignItems: "center", justifyContent: "center", padding: 20 }}><Text style={{ color: theme.text, fontWeight: "900", textAlign: "center" }}>Web preview unavailable</Text><Text style={{ color: theme.muted, textAlign: "center", marginTop: 6, lineHeight: 18 }}>{webPreviewError}</Text><View style={{ marginTop: 12 }}><TeacherActionButton label="Try web preview again" icon="refresh" tone="blue" onPress={() => void loadWebPreview()} /></View></View>
        : webPreviewUrl ? <View style={{ minHeight: 560 }}><View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: theme.border, alignItems: "flex-end" }}><TeacherActionButton label="Refresh web preview" icon="refresh" tone="neutral" onPress={() => void loadWebPreview()} /></View><WebView source={{ uri: webPreviewUrl }} javaScriptEnabled sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} cacheEnabled={false} nestedScrollEnabled scrollEnabled onError={() => setWebPreviewError("The secure web preview could not be loaded.")} style={{ minHeight: 508, flex: 1 }} /></View>
          : <View style={{ minHeight: 440, alignItems: "center", justifyContent: "center" }}><TeacherActionButton label="Open web preview" icon="web" tone="blue" onPress={() => void loadWebPreview()} /></View>}
  </View>;

  const snapshotBlocks: ContentBlock[] = ((versionDetail?.snapshot.contentBlocks ?? []) as Array<Partial<ContentBlock>>).map((block, index) => ({ id: block.id || `snapshot-${index + 1}`, lessonId, type: block.type || "text", order: block.order ?? index + 1, content: block.content, metadata: block.metadata }));

  return <TeacherScreen
    title={lesson?.title || "Lesson preview"}
    subtitle={buildLessonSubtitle(lesson?.description)}
    icon="text-box-outline"
    showBackButton
    onBackPress={handleBack}
    refreshing={lessonQuery.isRefetching}
    onRefresh={() => void lessonQuery.refetch()}
    bottomAction={lesson ? <TeacherBottomActionBar primaryLabel="Edit lesson" primaryIcon="notebook-edit-outline" onPrimary={() => navigation.navigate("TeacherLessonEditor", { lessonId: lesson.id, classId: classId || lesson.classId })} secondary={<TeacherActionButton label="Options" icon="tune-variant" tone="neutral" onPress={() => setControlsVisible(true)} />} /> : undefined}
  >
    {lesson ? <>
      <TeacherSegmentedTabs accessibilityLabel="Lesson preview modes" activeKey={previewMode} onSelect={selectPreviewMode} items={[{ key: "mobile", label: "Mobile" }, { key: "web", label: "Web" }]} />
      <TeacherFlatSection title={previewMode === "mobile" ? "Student mobile preview" : "Student web preview"} subtitle="Read-only; editing stays in the lesson editor.">
        <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
          {previewMode === "mobile" ? mobilePreview : webPreview}
        </View>
      </TeacherFlatSection>

      <TeacherActionSheet visible={controlsVisible} title="Lesson options" subtitle="Publication and server-owned version history." onClose={() => setControlsVisible(false)}>
        <View style={{ paddingVertical: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}><TeacherActionButton label={lesson.isDraft ? "Publish lesson" : "Move back to draft"} icon={lesson.isDraft ? "publish" : "file-hidden"} tone={lesson.isDraft ? "green" : "amber"} onPress={() => void togglePublish()} disabled={draftMutation.isPending} /><TeacherActionButton label="Save version" icon="content-save-check-outline" tone="blue" onPress={() => void createSnapshot()} /></View>
        <TeacherFlatSection title="Version history" subtitle="Review the snapshot before any restore.">
          {(versionsQuery.data ?? []).length ? (versionsQuery.data ?? []).map((version) => <View key={version.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: "800" }}>Version {version.versionNumber}{version.label ? ` · ${version.label}` : ""}</Text><Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{new Date(version.createdAt).toLocaleString()}</Text></View><TeacherActionButton label={versionLoading ? "Opening…" : "Review"} icon="eye-outline" tone="amber" disabled={versionLoading} onPress={() => void reviewSnapshot(version.id)} /></View>) : <View style={{ padding: 14 }}><Text style={{ color: theme.muted }}>No saved versions yet.</Text></View>}
        </TeacherFlatSection>
      </TeacherActionSheet>

      <TeacherCenteredDialog visible={Boolean(versionDetail)} title={versionDetail ? `Review version ${versionDetail.versionNumber}` : "Review version"} subtitle="Nothing changes until you confirm restore." onClose={() => setVersionDetail(null)} footer={<View style={{ flexDirection: "row", gap: 8 }}><TeacherActionButton label="Keep current lesson" icon="close" tone="neutral" onPress={() => setVersionDetail(null)} /><View style={{ flex: 1 }}><TeacherActionButton label={restoring ? "Restoring…" : "Restore selected version"} icon="history" tone="amber" disabled={restoring} onPress={() => void restoreSnapshot()} /></View></View>}>
        {versionDetail ? <View style={{ gap: 12 }}><TeacherInlineNotice title="Change summary" description={`${versionDetail.summary.titleChanged ? "Title changes. " : ""}${versionDetail.summary.descriptionChanged ? "Description changes. " : ""}${versionDetail.summary.publicationChanged ? "Publication state changes. " : ""}${versionDetail.summary.currentBlockCount} current blocks → ${versionDetail.summary.snapshotBlockCount} snapshot blocks.`} tone="amber" /><View><Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>{versionDetail.snapshot.title || "Untitled lesson"}</Text>{versionDetail.snapshot.description ? <View style={{ marginTop: 8 }}><RichTextContent html={versionDetail.snapshot.description} color={theme.text} mutedColor={theme.muted} accentColor={theme.redText} /></View> : null}</View>{snapshotBlocks.map((block) => <LessonBlockRenderer key={block.id} block={block} />)}</View> : null}
      </TeacherCenteredDialog>
    </> : <TeacherFlatSection title="Lesson unavailable" subtitle={lessonQuery.error ? toAppError(lessonQuery.error).message : "Loading lesson"} />}
  </TeacherScreen>;
}
