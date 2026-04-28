import { useMemo } from "react";
import type { PropsWithChildren } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { EmptyState, Refreshable, ScreenScroll } from "../components/ui/primitives";
import { peekAppError } from "../api/http";
import { useClassDetail, useModuleDetail } from "../api/hooks";
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
  if (item.itemType === "assessment") {
    return `Due ${formatDate(item.assessment?.dueDate)} - ${item.assessment?.totalPoints ?? 0} pts`;
  }
  return "Attachment";
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

function DarkSectionLabel({ title, meta, metaColor = theme.red }: { title: string; meta?: string; metaColor?: string }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 18,
        marginBottom: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
        {title}
      </Text>
      {meta ? <Text style={{ fontSize: 11, fontWeight: "600", color: metaColor }}>{meta}</Text> : null}
    </View>
  );
}

function ToneTag({ label, tone }: { label: string; tone: "blue" | "green" | "amber" | "red" }) {
  const toneStyle = {
    blue: { backgroundColor: theme.blueSoft, color: "#6AABFF" },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    red: { backgroundColor: theme.redSoft, color: "#FF6B87" },
  }[tone];

  return (
    <View style={{ borderRadius: 4, backgroundColor: toneStyle.backgroundColor, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: toneStyle.color }}>{label}</Text>
    </View>
  );
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
  const flatItems = useMemo(() => visibleSections.flatMap((section) => section.items), [visibleSections]);
  const sectionCount = visibleSections.length;
  const lessonCount = flatItems.filter((item) => item.itemType === "lesson").length;
  const assessmentCount = flatItems.filter((item) => item.itemType === "assessment").length;
  const completedCount = flatItems.filter((item) => item.completed).length;
  const requiredItems = flatItems.filter((item) => item.isRequired);
  const requiredCompleted = requiredItems.length > 0 ? requiredItems.filter((item) => item.completed).length : completedCount;
  const requiredVisible = requiredItems.length > 0 ? requiredItems.length : flatItems.length;
  const progress = moduleEntry?.progressPercent ?? 0;
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
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading module" subtitle="Preparing the module detail view." />
        </View>
      </ScreenScroll>
    );
  }

  if (moduleNotFound) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Module not found" subtitle="This module is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  if (!moduleEntry && primaryError) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <DarkPanel style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Module data is partially unavailable</Text>
          <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#999999" }}>{peekAppError(primaryError).message}</Text>
        </DarkPanel>
      </ScreenScroll>
    );
  }

  if (!moduleEntry) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Module not found" subtitle="This module is unavailable right now." />
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
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>M{moduleEntry.order}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                {classItem?.subjectCode || "Class"} - Module {moduleEntry.order}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 22, lineHeight: 27, fontWeight: "800", color: theme.text }}>
                {moduleEntry.title || "Module Detail"}
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

          <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: "#999999" }}>
            {stripRichText(moduleEntry.description) || "Explore lessons, assessments, and required checkpoints."}
          </Text>

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ToneTag label={`${lessonCount} lessons`} tone="blue" />
            <ToneTag label={`${assessmentCount} tasks`} tone="amber" />
            <ToneTag label={`${requiredCompleted}/${requiredVisible} required`} tone="green" />
            <ToneTag label={`${progress}% progress`} tone="red" />
          </View>
        </View>
      </View>

      {primaryError ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Module data is partially unavailable</Text>
          <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#999999" }}>{peekAppError(primaryError).message}</Text>
        </DarkPanel>
      ) : null}

      <DarkPanel style={{ overflow: "hidden", paddingHorizontal: 0, paddingVertical: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>Module Snapshot</Text>
          <Text style={{ fontSize: 11, fontWeight: "600", color: theme.green }}>{progress}% complete</Text>
        </View>
        <View style={{ height: 2, backgroundColor: "rgba(255,255,255,0.07)" }}>
          <View style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: "100%", backgroundColor: theme.green }} />
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12 }}>
          {[
            { label: "Sections", value: String(sectionCount) },
            { label: "Lessons", value: String(lessonCount) },
            { label: "Tasks", value: String(assessmentCount) },
          ].map((item, index) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                alignItems: "center",
                borderRightWidth: index === 2 ? 0 : 1,
                borderRightColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>{item.value}</Text>
              <Text style={{ marginTop: 2, fontSize: 10, color: theme.muted }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </DarkPanel>

      {moduleEntry.isLocked ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Module locked</Text>
          <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: "#999999" }}>
            Your teacher still needs to unlock this module before students can open its learning items.
          </Text>
        </DarkPanel>
      ) : null}

      {visibleSections.length === 0 ? (
        <DarkPanel>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>No module items yet</Text>
          <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: "#999999" }}>
            This module does not have published content yet.
          </Text>
        </DarkPanel>
      ) : (
        visibleSections.map((section, sectionIndex) => (
          <View key={section.id}>
            <DarkSectionLabel title={section.title || `Section ${sectionIndex + 1}`} meta={`${section.items.length} items`} />
            {section.items.map((item, itemIndex) => {
              const isLesson = item.itemType === "lesson";
              const isAssessment = item.itemType === "assessment";
              const iconName = isLesson ? "book-open-page-variant-outline" : isAssessment ? "clipboard-text-outline" : "file-document-outline";
              const iconColor = isLesson ? theme.blue : isAssessment ? theme.amber : theme.purple;
              const iconBg = isLesson ? theme.blueSoft : isAssessment ? theme.amberSoft : theme.purpleSoft;

              return (
                <Pressable
                  key={item.id}
                  disabled={!item.lessonId && !item.assessmentId}
                  onPress={() => openItem(item)}
                  style={{
                    marginHorizontal: 16,
                    marginTop: itemIndex === 0 ? 6 : 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: !item.lessonId && !item.assessmentId ? 0.7 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: iconBg,
                      }}
                    >
                      <MaterialCommunityIcons name={iconName} size={16} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                        {item.isRequired ? <ToneTag label="Required" tone="red" /> : null}
                        {item.completed ? <ToneTag label="Done" tone="green" /> : null}
                      </View>
                      <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, fontWeight: "600", color: theme.text }}>
                        {getItemTitle(item)}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>{getItemMeta(item)}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.dim} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </ScreenScroll>
  );
}
