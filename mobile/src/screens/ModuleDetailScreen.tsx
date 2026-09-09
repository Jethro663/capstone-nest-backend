import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { EmptyState, ScreenScroll } from "../components/ui/primitives";
import {
  StudentContextStrip,
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
} from "../components/student/StudentWorkspacePrimitives";
import { peekAppError } from "../api/http";
import { useClassDetail, useModuleDetail } from "../api/hooks";
import { modulesApi } from "../api/services/modules";
import { navigateStudentDetailBack } from "../navigation/student-detail-back";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import type { ModuleItem } from "../types/module";

type Props = NativeStackScreenProps<RootStackParamList, "ModuleDetail">;
type ModuleContentItem = ModuleItem & {
  lessonId?: string;
  assessmentId?: string;
  completed?: boolean;
  isRequired?: boolean;
  lessonPoints?: number;
  lesson?: { title?: string; isDraft?: boolean } | null;
  assessment?: { title?: string; totalPoints?: number; dueDate?: string; isPublished?: boolean } | null;
  file?: { originalName?: string } | null;
};
type ModuleContentSection = { id: string; title: string; order: number; items: ModuleContentItem[] };

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getItemTitle(item: ModuleContentItem) {
  if (item.itemType === "lesson") return item.lesson?.title || "Untitled lesson";
  if (item.itemType === "assessment") return item.assessment?.title || "Untitled assessment";
  return item.file?.originalName || "Attachment";
}

function getItemMeta(item: ModuleContentItem) {
  if (item.itemType === "lesson") return `${item.lessonPoints ?? 0} pts`;
  if (item.itemType === "assessment") return `Due ${formatDate(item.assessment?.dueDate)} · ${item.assessment?.totalPoints ?? 0} pts`;
  return "Reference file";
}

function isNotFoundError(error: unknown) {
  return peekAppError(error).status === 404;
}

function isVisibleModuleItem(item: ModuleContentItem, moduleLocked?: boolean) {
  if (moduleLocked) return false;
  if (item.itemType === "lesson") return Boolean(item.lessonId) && !item.lesson?.isDraft;
  if (item.itemType === "assessment") return Boolean(item.assessmentId) && item.assessment?.isPublished !== false;
  return true;
}

export function ModuleDetailScreen({ route, navigation }: Props) {
  const { classId, moduleId, source } = route.params;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [fileActionError, setFileActionError] = useState<string | null>(null);
  const classQuery = useClassDetail(classId);
  const moduleQuery = useModuleDetail(classId, moduleId);
  const moduleEntry = moduleQuery.data;
  const classItem = classQuery.data;
  const visibleSections = useMemo(
    () =>
      (moduleEntry?.sections ?? [])
        .map((section) => ({
          ...section,
          items: (section.items as ModuleContentItem[]).filter((item) => isVisibleModuleItem(item, moduleEntry?.isLocked)),
        }))
        .filter((section) => section.items.length > 0)
        .sort((left, right) => left.order - right.order) as ModuleContentSection[],
    [moduleEntry?.isLocked, moduleEntry?.sections],
  );
  const flatItems = useMemo(() => visibleSections.flatMap((section) => section.items), [visibleSections]);
  const lessonCount = flatItems.filter((item) => item.itemType === "lesson").length;
  const assessmentCount = flatItems.filter((item) => item.itemType === "assessment").length;
  const progress = moduleEntry?.progressPercent ?? 0;
  const refreshing = classQuery.isRefetching || moduleQuery.isRefetching;
  const primaryError = moduleQuery.error || classQuery.error;
  const moduleNotFound = !moduleEntry && (isNotFoundError(moduleQuery.error) || isNotFoundError(classQuery.error));

  const handleRefresh = () => void Promise.all([classQuery.refetch(), moduleQuery.refetch()]);
  const handleBack = () => navigateStudentDetailBack(navigation, "ModuleDetail", { classId, moduleId, source });
  const runFileAction = async (actionKey: string, action: () => Promise<unknown>) => {
    try {
      setBusyAction(actionKey);
      setFileActionError(null);
      await action();
    } catch (error) {
      setFileActionError(peekAppError(error).message);
    } finally {
      setBusyAction((current) => (current === actionKey ? null : current));
    }
  };

  if (!moduleEntry && moduleQuery.isLoading) {
    return <ScreenScroll backgroundColor={theme.bg}><View style={{ paddingTop: 40, paddingHorizontal: 20 }}><EmptyState emoji=".." title="Loading module" subtitle="Preparing the module detail view." /></View></ScreenScroll>;
  }
  if (moduleNotFound || (!moduleEntry && !primaryError)) {
    return <ScreenScroll backgroundColor={theme.bg}><View style={{ paddingTop: 40, paddingHorizontal: 20 }}><EmptyState emoji="?" title="Module not found" subtitle="This module is unavailable right now." /></View></ScreenScroll>;
  }
  if (!moduleEntry && primaryError) {
    return <StudentScreen title="Module" showBackButton onBackPress={handleBack}><StudentInlineNotice title="Module data is partially unavailable" description={peekAppError(primaryError).message} tone="amber" /></StudentScreen>;
  }
  if (!moduleEntry) return null;

  return (
    <StudentScreen title="Module" showBackButton onBackPress={handleBack} refreshing={refreshing} onRefresh={handleRefresh}>
      <StudentContextStrip
        title={moduleEntry.title || "Module Detail"}
        subtitle={`${classItem?.subjectCode || "Class"} · Module ${moduleEntry.order} · ${lessonCount} lessons · ${assessmentCount} tasks`}
        status={`${progress}%`}
        icon="book-open-page-variant-outline"
      />
      {stripRichText(moduleEntry.description) ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 13, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <Text style={{ fontSize: 12, lineHeight: 18, color: theme.subtext }}>{stripRichText(moduleEntry.description)}</Text>
        </View>
      ) : null}
      {primaryError ? <StudentInlineNotice title="Module data is partially unavailable" description={peekAppError(primaryError).message} tone="amber" /> : null}
      {fileActionError ? <StudentInlineNotice title="Attachment action unavailable" description={fileActionError} tone="amber" /> : null}
      {moduleEntry.isLocked ? <StudentInlineNotice title="Module locked" description="Your teacher still needs to unlock this module before students can open its learning items." icon="lock-outline" tone="amber" /> : null}

      {visibleSections.length === 0 ? (
        <StudentFlatSection title="Module content" subtitle="0 published items">
          <StudentListRow title="No module items yet" subtitle="This module does not have published content yet." icon="book-off-outline" />
        </StudentFlatSection>
      ) : visibleSections.map((section, sectionIndex) => (
        <StudentFlatSection key={section.id} title={section.title || `Section ${sectionIndex + 1}`} subtitle={`${section.items.length} ${section.items.length === 1 ? "item" : "items"}`}>
          {section.items.map((item) => {
            const isLesson = item.itemType === "lesson";
            const isAssessment = item.itemType === "assessment";
            const isFile = item.itemType === "file";
            const icon = isLesson ? "book-open-page-variant-outline" : isAssessment ? "clipboard-text-outline" : "file-document-outline";
            const tone = isLesson ? "red" : isAssessment ? "amber" : "purple";
            const status = item.completed ? "Done" : item.isRequired ? "Required" : undefined;
            if (isFile) {
              return (
                <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: 10 }}>
                  <StudentListRow title={getItemTitle(item)} subtitle={getItemMeta(item)} icon={icon} tone={tone} />
                  <View style={{ flexDirection: "row", gap: 8, paddingLeft: 63, paddingRight: 16 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.file?.originalName || "reference file"}`} disabled={busyAction === `open-${item.id}`} onPress={() => void runFileAction(`open-${item.id}`, () => modulesApi.openAttachedFile(item.id, item.file?.originalName || "module-attachment"))} style={{ minHeight: 40, justifyContent: "center", borderRadius: 10, backgroundColor: theme.redSoft, paddingHorizontal: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.redText }}>{busyAction === `open-${item.id}` ? "Opening..." : "Open"}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Download ${item.file?.originalName || "reference file"}`} disabled={busyAction === `download-${item.id}`} onPress={() => void runFileAction(`download-${item.id}`, () => modulesApi.downloadAttachedFile(item.id, item.file?.originalName || "module-attachment"))} style={{ minHeight: 40, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.text }}>{busyAction === `download-${item.id}` ? "Downloading..." : "Download"}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }
            return (
              <StudentListRow
                key={item.id}
                title={getItemTitle(item)}
                subtitle={getItemMeta(item)}
                icon={icon}
                tone={tone}
                status={status}
                onPress={() => {
                  if (isLesson && item.lessonId) navigation.navigate("LessonDetail", { lessonId: item.lessonId, classId, moduleId, source: "module" });
                  else if (isAssessment && item.assessmentId) navigation.navigate("AssessmentDetail", { assessmentId: item.assessmentId, classId, source: "class" });
                }}
              />
            );
          })}
        </StudentFlatSection>
      ))}
      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}
