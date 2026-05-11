import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, View } from "react-native";
import {
  useModuleDetail,
  useTeacherModuleItemUpdateMutation,
  useTeacherModuleUpdateMutation,
} from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherModuleDetail">;

export function TeacherModuleDetailScreen({ navigation, route }: Props) {
  const { classId, moduleId } = route.params;
  const moduleQuery = useModuleDetail(classId, moduleId);
  const moduleUpdateMutation = useTeacherModuleUpdateMutation(classId, moduleId);
  const itemUpdateMutation = useTeacherModuleItemUpdateMutation(classId, moduleId);

  const module = moduleQuery.data;

  const toggleModuleField = async (field: "isLocked" | "isVisible") => {
    if (!module) return;
    try {
      await moduleUpdateMutation.mutateAsync({ [field]: !module[field] });
    } catch (error) {
      Alert.alert("Unable to update module", toAppError(error).message);
    }
  };

  const toggleItemVisibility = async (itemId: string, current: boolean | undefined) => {
    try {
      await itemUpdateMutation.mutateAsync({ itemId, payload: { isVisible: !current } });
    } catch (error) {
      Alert.alert("Unable to update item", toAppError(error).message);
    }
  };

  const openItem = async (
    item: NonNullable<typeof module>["sections"][number]["items"][number],
  ) => {
    if (item.itemType === "lesson" && item.lessonId) {
      navigation.navigate("TeacherLessonDetail", { lessonId: item.lessonId, classId });
      return;
    }
    if (item.itemType === "assessment" && item.assessmentId) {
      navigation.navigate("TeacherAssessmentDetail", { assessmentId: item.assessmentId, classId });
      return;
    }
    if (item.itemType === "file") {
      navigation.navigate("TeacherModuleFileDetail", {
        classId,
        moduleId,
        fileId: item.fileId || item.file?.id || item.id,
        itemId: item.id,
      });
    }
  };

  return (
    <TeacherScreen
      title={module?.title || "Module detail"}
      subtitle={module?.description || "Review this module, its sections, and item visibility from mobile."}
      icon="view-module-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={moduleQuery.isRefetching}
      onRefresh={() => {
        void moduleQuery.refetch();
      }}
    >
      {module ? (
        <>
          <TeacherStats
            items={[
              { label: "Sections", value: module.sections?.length ?? 0, tone: "red" },
              { label: "Visible", value: module.isVisible === false ? "No" : "Yes", tone: "blue" },
              { label: "Locked", value: module.isLocked ? "Yes" : "No", tone: "amber" },
            ]}
          />

          <TeacherPanel title="Module controls" subtitle="Keep the controls lightweight and aligned with the current mobile shell.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <TeacherActionButton
                label={module.isLocked ? "Unlock module" : "Lock module"}
                icon={module.isLocked ? "lock-open-variant-outline" : "lock-outline"}
                tone="amber"
                onPress={() => void toggleModuleField("isLocked")}
                disabled={moduleUpdateMutation.isPending}
              />
              <TeacherActionButton
                label={module.isVisible === false ? "Show module" : "Hide module"}
                icon={module.isVisible === false ? "eye-outline" : "eye-off-outline"}
                tone="blue"
                onPress={() => void toggleModuleField("isVisible")}
                disabled={moduleUpdateMutation.isPending}
              />
            </View>
          </TeacherPanel>

          <TeacherPanel title="Sections and items" subtitle="Open lessons, assessments, or files and manage item visibility inline.">
            {module.sections?.length ? (
              module.sections.map((section) => (
                <View key={section.id} style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                  <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{section.title}</Text>
                    {section.description ? (
                      <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, color: theme.muted }}>{section.description}</Text>
                    ) : null}
                  </View>
                  {section.items.length ? (
                    section.items.map((item) => {
                      const itemTitle =
                        item.lesson?.title ||
                        item.assessment?.title ||
                        item.file?.originalName ||
                        "Module item";
                      const itemSubtitle =
                        item.itemType === "lesson"
                          ? `Lesson · ${item.lesson?.isDraft ? "Draft" : "Published"}`
                          : item.itemType === "assessment"
                            ? `Assessment · ${item.assessment?.isPublished ? "Published" : "Draft"}`
                            : "File attachment";
                      return (
                        <TeacherRow
                          key={item.id}
                          title={itemTitle}
                          subtitle={`${itemSubtitle} · ${item.isVisible === false ? "Hidden" : "Visible"}`}
                          onPress={() => void openItem(item)}
                          right={
                            <TeacherActionButton
                              label={item.isVisible === false ? "Show" : "Hide"}
                              tone="neutral"
                              onPress={() => void toggleItemVisibility(item.id, item.isVisible)}
                              disabled={itemUpdateMutation.isPending}
                            />
                          }
                        />
                      );
                    })
                  ) : (
                    <TeacherEmpty title="No items here" subtitle="Attach lessons, assessments, or files on web to populate this section." icon="playlist-remove" />
                  )}
                </View>
              ))
            ) : (
              <TeacherEmpty title="No sections yet" subtitle="This module does not have any sections or published items yet." icon="view-module-outline" />
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Module unavailable" subtitle={moduleQuery.error ? toAppError(moduleQuery.error).message : "Loading module"}>
          <TeacherEmpty title="Unable to load module" subtitle="Pull to refresh after the module endpoint is available." />
        </TeacherPanel>
      )}
    </TeacherScreen>
  );
}
