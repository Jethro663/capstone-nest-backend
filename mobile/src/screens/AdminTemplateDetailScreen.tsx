import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { classTemplatesApi } from "../api/services/class-templates";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { RootStackParamList } from "../navigation/types";
import type {
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateContent,
  ClassTemplateLesson,
  ClassTemplateModule,
} from "../types/class-template";

type Props = NativeStackScreenProps<RootStackParamList, "AdminTemplateDetail">;
type Workspace = "modules" | "lessons" | "assessments" | "announcements";

const emptyContent = (): ClassTemplateContent => ({
  modules: [],
  lessons: [],
  assessments: [],
  announcements: [],
  chunks: [],
});

export function AdminTemplateDetailScreen({ navigation, route }: Props) {
  const { templateId } = route.params;
  const queryClient = useQueryClient();
  const template = useQuery({
    queryKey: ["admin-class-template", templateId],
    queryFn: () => classTemplatesApi.getById(templateId),
  });
  const content = useQuery({
    queryKey: ["admin-class-template-content", templateId],
    queryFn: () => classTemplatesApi.getContent(templateId),
  });
  const [workspace, setWorkspace] = useState<Workspace>("modules");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>(
    [],
  );
  const [points, setPoints] = useState("10");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (template.data?.name) setTemplateName(template.data.name);
  }, [template.data?.name]);

  const current = content.data ?? emptyContent();
  const rows = useMemo(
    () =>
      workspace === "modules"
        ? current.modules
        : workspace === "lessons"
          ? (current.lessons ?? [])
          : workspace === "assessments"
            ? current.assessments
            : current.announcements,
    [current, workspace],
  );
  const resetEditor = () => {
    setShowEditor(false);
    setEditingIndex(null);
    setTitle("");
    setDescription("");
    setBody("");
    setSectionTitle("");
    setSelectedLessonIds([]);
    setSelectedAssessmentIds([]);
    setPoints("10");
    setQuestionImageUrl("");
    setPinned(false);
  };

  const edit = (index: number) => {
    const entry = rows[index];
    if (!entry) return;
    setEditingIndex(index);
    setShowEditor(true);
    setTitle(entry.title);
    if (workspace === "modules") {
      const module = entry as ClassTemplateModule;
      setDescription(module.description ?? "");
      setBody(module.teacherNotes ?? "");
      setSectionTitle(module.sections?.[0]?.title ?? "");
      setSelectedLessonIds(
        module.sections
          ?.flatMap((section) => section.items ?? [])
          .flatMap((item) =>
            item.templateLessonId ? [item.templateLessonId] : [],
          ) ?? [],
      );
      setSelectedAssessmentIds(
        module.sections
          ?.flatMap((section) => section.items ?? [])
          .flatMap((item) =>
            item.templateAssessmentId ? [item.templateAssessmentId] : [],
          ) ?? [],
      );
    } else if (workspace === "lessons") {
      const lesson = entry as ClassTemplateLesson;
      setDescription(lesson.summary ?? "");
      setBody(
        String(
          lesson.blocks?.[0]?.payload?.html ??
            lesson.blocks?.[0]?.payload?.text ??
            "",
        ),
      );
    } else if (workspace === "assessments") {
      const assessment = entry as ClassTemplateAssessment;
      setDescription(assessment.description ?? "");
      setBody(assessment.questions?.[0]?.content ?? "");
      setPoints(
        String(
          assessment.questions?.[0]?.points ?? assessment.totalPoints ?? 10,
        ),
      );
      setQuestionImageUrl(assessment.questions?.[0]?.imageUrl ?? "");
    } else {
      const announcement = entry as ClassTemplateAnnouncement;
      setBody(announcement.content);
      setPinned(Boolean(announcement.isPinned));
    }
  };

  const saveCollection = async (next: Partial<ClassTemplateContent>) => {
    try {
      setBusy(true);
      setError(null);
      await classTemplatesApi.updateContent(templateId, {
        ...current,
        ...next,
      });
      await Promise.all([
        content.refetch(),
        queryClient.invalidateQueries({ queryKey: ["admin-class-templates"] }),
      ]);
      resetEditor();
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const saveEditor = async () => {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    const index = editingIndex ?? rows.length;
    if (workspace === "modules") {
      const prior =
        editingIndex === null ? undefined : current.modules[editingIndex];
      const items = [
        ...selectedLessonIds.map((id, order) => ({
          itemType: "lesson" as const,
          templateLessonId: id,
          order,
          isRequired: true,
        })),
        ...selectedAssessmentIds.map((id, offset) => ({
          itemType: "assessment" as const,
          templateAssessmentId: id,
          order: selectedLessonIds.length + offset,
          isRequired: true,
        })),
      ];
      const entry: ClassTemplateModule = {
        ...prior,
        title: title.trim(),
        description: description.trim() || undefined,
        teacherNotes: body.trim() || undefined,
        order: prior?.order ?? index,
        isVisible: prior?.isVisible ?? false,
        isLocked: prior?.isLocked ?? true,
        sections: sectionTitle.trim()
          ? [
              {
                ...(prior?.sections?.[0] ?? {}),
                title: sectionTitle.trim(),
                order: 0,
                items,
              },
            ]
          : (prior?.sections ?? []),
      };
      const next = [...current.modules];
      next[index] = entry;
      await saveCollection({ modules: next });
      return;
    }
    if (workspace === "lessons") {
      const list = [...(current.lessons ?? [])];
      const prior = editingIndex === null ? undefined : list[editingIndex];
      const entry: ClassTemplateLesson = {
        ...prior,
        title: title.trim(),
        summary: description.trim() || undefined,
        order: prior?.order ?? index,
        blocks: body.trim()
          ? [
              {
                ...(prior?.blocks?.[0] ?? {}),
                blockType: prior?.blocks?.[0]?.blockType ?? "rich_text",
                blockVersion: prior?.blocks?.[0]?.blockVersion ?? 1,
                order: 0,
                payload: {
                  ...(prior?.blocks?.[0]?.payload ?? {}),
                  html: body.trim(),
                },
              },
            ]
          : (prior?.blocks ?? []),
      };
      list[index] = entry;
      await saveCollection({ lessons: list });
      return;
    }
    if (workspace === "assessments") {
      const parsedPoints = Number(points);
      if (!body.trim() || !Number.isInteger(parsedPoints) || parsedPoints < 0) {
        setError(
          "Assessment title, question, and non-negative whole-number points are required.",
        );
        return;
      }
      const list = [...current.assessments];
      const prior = editingIndex === null ? undefined : list[editingIndex];
      const entry: ClassTemplateAssessment = {
        ...prior,
        title: title.trim(),
        description: description.trim() || undefined,
        type: prior?.type ?? "quiz",
        order: prior?.order ?? index,
        totalPoints: parsedPoints,
        questions: [
          {
            ...(prior?.questions?.[0] ?? {}),
            type: prior?.questions?.[0]?.type ?? "short_answer",
            content: body.trim(),
            points: parsedPoints,
            order: 0,
            isRequired: true,
            imageUrl: questionImageUrl || undefined,
          },
        ],
      };
      list[index] = entry;
      await saveCollection({ assessments: list });
      return;
    }
    const list = [...current.announcements];
    const prior = editingIndex === null ? undefined : list[editingIndex];
    if (!body.trim()) {
      setError("Announcement content is required.");
      return;
    }
    list[index] = {
      ...prior,
      title: title.trim(),
      content: body.trim(),
      isPinned: pinned,
      order: prior?.order ?? index,
    };
    await saveCollection({ announcements: list });
  };
  const removeEntry = (index: number) =>
    Alert.alert(
      "Remove template content?",
      "This removes the selected item from the reusable template after you confirm.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (workspace === "modules")
              void saveCollection({
                modules: current.modules.filter((_, row) => row !== index),
              });
            else if (workspace === "lessons")
              void saveCollection({
                lessons: (current.lessons ?? []).filter(
                  (_, row) => row !== index,
                ),
              });
            else if (workspace === "assessments")
              void saveCollection({
                assessments: current.assessments.filter(
                  (_, row) => row !== index,
                ),
              });
            else
              void saveCollection({
                announcements: current.announcements.filter(
                  (_, row) => row !== index,
                ),
              });
          },
        },
      ],
    );
  const saveName = async () => {
    if (!templateName.trim()) return;
    try {
      setBusy(true);
      await classTemplatesApi.update(templateId, { name: templateName.trim() });
      await Promise.all([
        template.refetch(),
        queryClient.invalidateQueries({ queryKey: ["admin-class-templates"] }),
      ]);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const togglePublish = async () => {
    if (!template.data) return;
    const status = template.data.status === "published" ? "draft" : "published";
    try {
      setBusy(true);
      await classTemplatesApi.publish(templateId, status);
      await Promise.all([
        template.refetch(),
        queryClient.invalidateQueries({ queryKey: ["admin-class-templates"] }),
      ]);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const removeTemplate = () =>
    Alert.alert(
      "Delete class template?",
      "The reusable curriculum template will be permanently deleted. Existing classes are not changed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await classTemplatesApi.remove(templateId);
              await queryClient.invalidateQueries({
                queryKey: ["admin-class-templates"],
              });
              navigation.goBack();
            } catch (nextError) {
              setError(toAppError(nextError).message);
              setBusy(false);
            }
          },
        },
      ],
    );
  const exportEngine = async () => {
    try {
      setBusy(true);
      const exported = await classTemplatesApi.exportEngine(templateId);
      const FileSystem = await import("expo-file-system/legacy");
      const fileUri = `${FileSystem.cacheDirectory}${exported.fileName || `class-template-${templateId}.yaml`}`;
      await FileSystem.writeAsStringAsync(fileUri, exported.yaml, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/yaml",
          dialogTitle: "Share class-template engine package",
        });
      else Alert.alert("Export prepared", fileUri);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const uploadAssessmentImage = async () => {
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (selected.canceled || !selected.assets[0]?.uri) return;
    try {
      setBusy(true);
      const uploaded = await classTemplatesApi.uploadAssessmentImage(
        templateId,
        selected.assets[0].uri,
      );
      setQuestionImageUrl(uploaded.imageUrl);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminScreen
      title={template.data?.name ?? "Template detail"}
      subtitle={
        template.data
          ? `${template.data.subjectCode} · Grade ${template.data.subjectGradeLevel} · ${template.data.status}`
          : "Reusable curriculum editor"
      }
      showBackButton
      onBackPress={navigation.goBack}
      refreshing={template.isRefetching || content.isRefetching}
      onRefresh={() =>
        void Promise.all([template.refetch(), content.refetch()])
      }
    >
      {error || template.isError || content.isError ? (
        <AdminNotice
          title="Template change not saved"
          description={
            error ?? toAppError(template.error ?? content.error).message
          }
          tone="red"
        />
      ) : null}
      {template.data ? (
        <AdminSection
          title="Template controls"
          subtitle="Publishing makes this template available during compatible class creation"
        >
          <View style={{ padding: 16, gap: 10 }}>
            <AdminField
              label="Template name"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <AdminButton
                label="Save name"
                icon="content-save-outline"
                disabled={
                  busy ||
                  !templateName.trim() ||
                  templateName.trim() === template.data.name
                }
                onPress={() => void saveName()}
              />
              <AdminButton
                label={
                  template.data.status === "published"
                    ? "Return to draft"
                    : "Publish"
                }
                icon={
                  template.data.status === "published"
                    ? "pencil-outline"
                    : "publish"
                }
                tone={template.data.status === "published" ? "amber" : "green"}
                variant="solid"
                disabled={busy}
                onPress={() => void togglePublish()}
              />
              <AdminButton
                label="Export YAML"
                icon="download"
                disabled={busy}
                onPress={() => void exportEngine()}
              />
              <AdminButton
                label="Delete"
                icon="delete-outline"
                tone="red"
                disabled={busy}
                onPress={removeTemplate}
              />
            </View>
          </View>
        </AdminSection>
      ) : null}
      <AdminSection
        title="Content workspace"
        subtitle="Structured editors preserve nested IDs and fields returned by the backend"
      >
        <View
          style={{
            padding: 16,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {(
            ["modules", "lessons", "assessments", "announcements"] as const
          ).map((key) => (
            <AdminChip
              key={key}
              label={
                key === "modules"
                  ? "Modules"
                  : key === "lessons"
                    ? "Lessons"
                    : key === "assessments"
                      ? "Assessments"
                      : "Announcements"
              }
              active={workspace === key}
              onPress={() => {
                setWorkspace(key);
                resetEditor();
              }}
            />
          ))}
        </View>
      </AdminSection>
      <AdminSection
        title={
          workspace === "modules"
            ? "Modules"
            : workspace === "lessons"
              ? "Lessons"
              : workspace === "assessments"
                ? "Assessments"
                : "Announcements"
        }
        action={
          <AdminButton
            label={showEditor ? "Close" : "Add"}
            icon={showEditor ? "close" : "plus"}
            variant="text"
            onPress={() => (showEditor ? resetEditor() : setShowEditor(true))}
          />
        }
      >
        {showEditor ? (
          <View
            style={{
              padding: 16,
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <AdminField
              label={`${workspace === "announcements" ? "Announcement" : workspace === "assessments" ? "Assessment" : workspace === "lessons" ? "Lesson" : "Module"} title`}
              value={title}
              onChangeText={setTitle}
            />
            {workspace !== "announcements" ? (
              <AdminField
                label={workspace === "lessons" ? "Summary" : "Description"}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            ) : null}
            {workspace === "modules" ? (
              <>
                <AdminField
                  label="Teacher notes"
                  value={body}
                  onChangeText={setBody}
                  multiline
                />
                <AdminField
                  label="First section title"
                  value={sectionTitle}
                  onChangeText={setSectionTitle}
                />
                <Text
                  style={{
                    color: theme.subtext,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  LINK LESSONS
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(current.lessons ?? [])
                    .filter((entry) => entry.id)
                    .map((entry) => (
                      <AdminChip
                        key={entry.id}
                        label={entry.title}
                        active={selectedLessonIds.includes(entry.id!)}
                        onPress={() =>
                          setSelectedLessonIds((values) =>
                            values.includes(entry.id!)
                              ? values.filter((id) => id !== entry.id)
                              : [...values, entry.id!],
                          )
                        }
                      />
                    ))}
                </View>
                <Text
                  style={{
                    color: theme.subtext,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  LINK ASSESSMENTS
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {current.assessments
                    .filter((entry) => entry.id)
                    .map((entry) => (
                      <AdminChip
                        key={entry.id}
                        label={entry.title}
                        active={selectedAssessmentIds.includes(entry.id!)}
                        onPress={() =>
                          setSelectedAssessmentIds((values) =>
                            values.includes(entry.id!)
                              ? values.filter((id) => id !== entry.id)
                              : [...values, entry.id!],
                          )
                        }
                      />
                    ))}
                </View>
              </>
            ) : null}
            {workspace === "lessons" ? (
              <AdminField
                label="Lesson body"
                value={body}
                onChangeText={setBody}
                multiline
              />
            ) : null}
            {workspace === "assessments" ? (
              <>
                <AdminField
                  label="Question prompt"
                  value={body}
                  onChangeText={setBody}
                  multiline
                />
                <AdminField
                  label="Question points"
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="number-pad"
                />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminButton
                    label={
                      questionImageUrl
                        ? "Replace question image"
                        : "Add question image"
                    }
                    icon="image-plus"
                    disabled={busy}
                    onPress={() => void uploadAssessmentImage()}
                  />
                  {questionImageUrl ? (
                    <AdminButton
                      label="Remove image"
                      tone="red"
                      onPress={() => setQuestionImageUrl("")}
                    />
                  ) : null}
                </View>
                {questionImageUrl ? (
                  <AdminNotice
                    title="Question image attached"
                    description={questionImageUrl}
                    tone="green"
                  />
                ) : null}
              </>
            ) : null}
            {workspace === "announcements" ? (
              <>
                <AdminField
                  label="Announcement content"
                  value={body}
                  onChangeText={setBody}
                  multiline
                />
                <AdminChip
                  label="Pinned announcement"
                  active={pinned}
                  onPress={() => setPinned((value) => !value)}
                />
              </>
            ) : null}
            <AdminButton
              label={
                busy
                  ? "Saving…"
                  : editingIndex === null
                    ? "Add to template"
                    : "Save changes"
              }
              icon="content-save-outline"
              tone="green"
              variant="solid"
              disabled={busy}
              onPress={() => void saveEditor()}
            />
          </View>
        ) : null}
        {rows.map((entry, index) => (
          <View
            key={entry.id ?? `${workspace}-${index}`}
            style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
          >
            <AdminDataRow
              title={entry.title}
              subtitle={
                workspace === "modules"
                  ? `${(entry as ClassTemplateModule).sections?.length ?? 0} sections`
                  : workspace === "lessons"
                    ? `${(entry as ClassTemplateLesson).blocks?.length ?? 0} blocks`
                    : workspace === "assessments"
                      ? `${(entry as ClassTemplateAssessment).questions?.length ?? 0} questions · ${(entry as ClassTemplateAssessment).totalPoints ?? 0} points`
                      : (entry as ClassTemplateAnnouncement).isPinned
                        ? "Pinned"
                        : "Standard"
              }
            />
            <View
              style={{
                paddingHorizontal: 12,
                paddingBottom: 10,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <AdminButton
                label="Edit"
                variant="text"
                onPress={() => edit(index)}
              />
              <AdminButton
                label="Remove"
                variant="text"
                tone="red"
                onPress={() => removeEntry(index)}
              />
            </View>
          </View>
        ))}
        {!content.isLoading && !rows.length ? (
          <AdminEmpty
            title={`No ${workspace}`}
            subtitle={`Add the first ${workspace === "assessments" ? "assessment" : workspace.slice(0, -1)} to this template.`}
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
