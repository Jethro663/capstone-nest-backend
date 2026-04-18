import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  EmptyState,
  FloatingIconButton,
  GradientHeader,
  Pill,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { peekAppError, toAppError } from "../api/http";
import { useClassDetail, useModuleDetail } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";
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

type ModuleContentSection = {
  id: string;
  title: string;
  order: number;
  items: ModuleContentItem[];
};

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
  if (item.itemType === "assessment") return `Due ${formatDate(item.assessment?.dueDate)} • ${item.assessment?.totalPoints ?? 0} pts`;
  return "Attachment";
}

function getItemAction(item: ModuleContentItem) {
  if (item.itemType === "lesson") return "Open Lesson";
  if (item.itemType === "assessment") return "Open Task";
  return "View";
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
  const { classId, moduleId } = route.params;
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
  const sectionCount = visibleSections.length;
  const flatItems = useMemo(
    () => visibleSections.flatMap((section) => section.items),
    [visibleSections],
  );
  const lessonCount = flatItems.filter((item) => item.itemType === "lesson").length;
  const assessmentCount = flatItems.filter((item) => item.itemType === "assessment").length;
  const refreshing = classQuery.isRefetching || moduleQuery.isRefetching;
  const primaryError = moduleQuery.error || classQuery.error;
  const moduleNotFound = !moduleEntry && (isNotFoundError(moduleQuery.error) || isNotFoundError(classQuery.error));

  const handleRefresh = () => {
    void Promise.all([classQuery.refetch(), moduleQuery.refetch()]);
  };

  const openItem = (item: ModuleContentItem) => {
    if (item.itemType === "lesson" && item.lessonId) {
      navigation.navigate("LessonDetail", { lessonId: item.lessonId, classId });
      return;
    }
    if (item.itemType === "assessment" && item.assessmentId) {
      navigation.navigate("AssessmentDetail", { assessmentId: item.assessmentId, classId });
    }
  };

  if (!moduleEntry && moduleQuery.isLoading) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading module" subtitle="Preparing the module detail view." />
        </View>
      </ScreenScroll>
    );
  }

  if (moduleNotFound) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Module not found" subtitle="This module is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  if (!moduleEntry && primaryError) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Module data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {peekAppError(primaryError).message}
            </Text>
          </Card>
        </View>
      </ScreenScroll>
    );
  }

  if (!moduleEntry) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Module not found" subtitle="This module is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <GradientHeader
        colors={gradients.classes}
        eyebrow={`${classItem?.subjectCode || "CLASS"} • Module ${moduleEntry.order}`}
        title={moduleEntry.title || "Module Detail"}
        rightContent={<FloatingIconButton icon="chevron-left" onPress={() => navigation.goBack()} />}
      >
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.88)", fontSize: 12 }}>
          {moduleEntry.description || "Open lessons, assessments, and supporting materials from this module."}
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 18 }}>
        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Module data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {peekAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        <Card>
          <SectionTitle title="Module Snapshot" right={<Pill label={`${moduleEntry.progressPercent ?? 0}% complete`} backgroundColor={colors.paleAmber} color={colors.orange} />} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pill label={`${sectionCount} sections`} backgroundColor={colors.paleIndigo} color={colors.indigo} />
            <Pill label={`${lessonCount} lessons`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
            <Pill label={`${assessmentCount} tasks`} backgroundColor={colors.paleGreen} color={colors.greenDeep} />
          </View>
        </Card>

        {moduleEntry.isLocked ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>Module locked</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
              Your teacher still needs to unlock this module before students can open its learning items.
            </Text>
          </Card>
        ) : null}

        {visibleSections.length === 0 ? (
          <EmptyState emoji=".." title="No module items yet" subtitle="This module does not have published content yet." />
        ) : (
          visibleSections.map((section, sectionIndex) => (
            <View key={section.id} style={{ gap: 12 }}>
              <SectionTitle title={section.title || `Section ${sectionIndex + 1}`} />
              {section.items.map((item, itemIndex) => (
                <AnimatedEntrance key={item.id} delay={(sectionIndex * 3 + itemIndex) * 50}>
                  <Pressable
                    disabled={!item.lessonId && !item.assessmentId}
                    onPress={() => openItem(item)}
                    style={[
                      {
                        borderRadius: 22,
                        backgroundColor: colors.white,
                        padding: 16,
                        opacity: !item.lessonId && !item.assessmentId ? 0.8 : 1,
                      },
                      shadow.card,
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            item.itemType === "lesson"
                              ? colors.paleIndigo
                              : item.itemType === "assessment"
                                ? colors.paleAmber
                                : colors.paleBlue,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.itemType === "lesson"
                              ? "book-open-page-variant-outline"
                              : item.itemType === "assessment"
                                ? "clipboard-text-outline"
                                : "file-document-outline"
                          }
                          size={18}
                          color={item.itemType === "lesson" ? colors.indigo : item.itemType === "assessment" ? colors.orange : colors.blueDeep}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{getItemTitle(item)}</Text>
                        <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{getItemMeta(item)}</Text>
                      </View>
                      <Pill
                        label={item.completed ? "Done" : getItemAction(item)}
                        backgroundColor={item.completed ? colors.paleGreen : colors.paleIndigo}
                        color={item.completed ? colors.greenDeep : colors.indigo}
                      />
                    </View>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          ))
        )}
      </View>
    </ScreenScroll>
  );
}
