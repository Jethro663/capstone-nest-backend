import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  useModuleDetail,
  useTeacherModuleItemUpdateMutation,
  useTeacherModuleUpdateMutation,
  useTeacherModuleSectionCreateMutation,
  useTeacherModuleSectionDeleteMutation,
  useTeacherModuleSectionReorderMutation,
  useTeacherModuleItemReorderMutation,
  useTeacherModuleItemAttachMutation,
  useTeacherModuleItemDetachMutation,
  useTeacherModuleCoverMutation,
  useAssessments,
  useLessons,
} from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
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
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [deletingSection, setDeletingSection] = useState<{ id: string; title: string } | null>(null);
  const [detachingItem, setDetachingItem] = useState<{ id: string; title: string } | null>(null);
  const [attachingSectionId, setAttachingSectionId] = useState<string | null>(null);
  const [attachItemType, setAttachItemType] = useState<"lesson" | "assessment" | "file">("assessment");
  const [attachTargetId, setAttachTargetId] = useState("");

  const moduleQuery = useModuleDetail(classId, moduleId);
  const moduleUpdateMutation = useTeacherModuleUpdateMutation(classId, moduleId);
  const itemUpdateMutation = useTeacherModuleItemUpdateMutation(classId, moduleId);
  const sectionCreateMutation = useTeacherModuleSectionCreateMutation(classId, moduleId);
  const sectionDeleteMutation = useTeacherModuleSectionDeleteMutation(classId, moduleId);
  const sectionReorderMutation = useTeacherModuleSectionReorderMutation(classId, moduleId);
  const itemReorderMutation = useTeacherModuleItemReorderMutation(classId, moduleId);
  const itemAttachMutation = useTeacherModuleItemAttachMutation(classId, moduleId);
  const itemDetachMutation = useTeacherModuleItemDetachMutation(classId, moduleId);
  const coverMutation = useTeacherModuleCoverMutation(classId, moduleId);
  const assessmentsQuery = useAssessments(classId);
  const lessonsQuery = useLessons(classId);

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

  const handlePickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await coverMutation.mutateAsync({
          uri: asset.uri,
          name: asset.fileName || "cover.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        Alert.alert("Success", "Module cover uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Unable to upload cover", toAppError(error).message);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      await sectionCreateMutation.mutateAsync({ title: newSectionTitle.trim() });
      setNewSectionTitle("");
    } catch (error) {
      Alert.alert("Unable to create section", toAppError(error).message);
    }
  };

  const handleDeleteSection = (sectionId: string, sectionTitle: string) => {
    setDeletingSection({ id: sectionId, title: sectionTitle });
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    if (!module?.sections) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= module.sections.length) return;
    const nextSections = [...module.sections];
    const [moved] = nextSections.splice(index, 1);
    nextSections.splice(targetIndex, 0, moved);
    try {
      await sectionReorderMutation.mutateAsync(nextSections.map((s) => s.id));
    } catch (error) {
      Alert.alert("Unable to reorder sections", toAppError(error).message);
    }
  };

  const moveItem = async (sectionId: string, items: NonNullable<typeof module>["sections"][number]["items"], index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, moved);
    try {
      await itemReorderMutation.mutateAsync({ sectionId, itemIds: nextItems.map((i) => i.id) });
    } catch (error) {
      Alert.alert("Unable to reorder items", toAppError(error).message);
    }
  };

  const handleAttachItem = async () => {
    if (!attachingSectionId || !attachTargetId.trim()) return;
    try {
      const payload: Parameters<typeof itemAttachMutation.mutateAsync>[0]["payload"] = {
        itemType: attachItemType,
        isVisible: true,
      };
      if (attachItemType === "assessment") payload.assessmentId = attachTargetId.trim();
      else if (attachItemType === "lesson") payload.lessonId = attachTargetId.trim();
      else if (attachItemType === "file") payload.fileId = attachTargetId.trim();

      await itemAttachMutation.mutateAsync({ sectionId: attachingSectionId, payload });
      setAttachingSectionId(null);
      setAttachTargetId("");
    } catch (error) {
      Alert.alert("Unable to attach item", toAppError(error).message);
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

          <TeacherPanel title="Module controls" subtitle="Manage lock, visibility, and cover image.">
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
              <TeacherActionButton
                label={coverMutation.isPending ? "Uploading..." : "Cover image"}
                icon="image-outline"
                tone="purple"
                onPress={() => void handlePickCoverImage()}
                disabled={coverMutation.isPending}
              />
            </View>
          </TeacherPanel>

          <TeacherPanel title="Sections and items" subtitle="Add sections, reorder sections/items, and attach content.">
            {module.sections?.length ? (
              module.sections.map((section, sIndex) => (
                <View key={section.id} style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                  <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{section.title}</Text>
                      {section.description ? (
                        <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, color: theme.muted }}>{section.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Pressable
                        onPress={() => void moveSection(sIndex, "up")}
                        disabled={sIndex === 0 || sectionReorderMutation.isPending}
                        style={{ padding: 4, opacity: sIndex === 0 ? 0.3 : 1 }}
                      >
                        <MaterialCommunityIcons name="chevron-up" size={18} color={theme.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => void moveSection(sIndex, "down")}
                        disabled={sIndex === module.sections.length - 1 || sectionReorderMutation.isPending}
                        style={{ padding: 4, opacity: sIndex === module.sections.length - 1 ? 0.3 : 1 }}
                      >
                        <MaterialCommunityIcons name="chevron-down" size={18} color={theme.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => setAttachingSectionId(section.id)}
                        style={{ padding: 4, backgroundColor: theme.blueSoft, borderRadius: 6 }}
                      >
                        <MaterialCommunityIcons name="plus-box-outline" size={18} color={theme.blue} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSection(section.id, section.title)}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.red} />
                      </Pressable>
                    </View>
                  </View>

                  {section.items.length ? (
                    section.items.map((item, iIndex) => {
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
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Pressable
                                onPress={() => void moveItem(section.id, section.items, iIndex, "up")}
                                disabled={iIndex === 0 || itemReorderMutation.isPending}
                                style={{ padding: 4, opacity: iIndex === 0 ? 0.3 : 1 }}
                              >
                                <MaterialCommunityIcons name="chevron-up" size={16} color={theme.text} />
                              </Pressable>
                              <Pressable
                                onPress={() => void moveItem(section.id, section.items, iIndex, "down")}
                                disabled={iIndex === section.items.length - 1 || itemReorderMutation.isPending}
                                style={{ padding: 4, opacity: iIndex === section.items.length - 1 ? 0.3 : 1 }}
                              >
                                <MaterialCommunityIcons name="chevron-down" size={16} color={theme.text} />
                              </Pressable>
                              <TeacherActionButton
                                label={item.isVisible === false ? "Show" : "Hide"}
                                tone="neutral"
                                onPress={() => void toggleItemVisibility(item.id, item.isVisible)}
                                disabled={itemUpdateMutation.isPending}
                              />
                              <Pressable
                                onPress={() => setDetachingItem({ id: item.id, title: itemTitle })}
                                style={{ padding: 4 }}
                              >
                                <MaterialCommunityIcons name="delete-outline" size={16} color={theme.red} />
                              </Pressable>
                            </View>
                          }
                        />
                      );
                    })
                  ) : (
                    <TeacherEmpty title="No items here" subtitle="Tap the '+' button above to attach an assessment, lesson, or file." icon="playlist-remove" />
                  )}
                </View>
              ))
            ) : (
              <TeacherEmpty title="No sections yet" subtitle="This module does not have any sections or published items yet." icon="view-module-outline" />
            )}

            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginBottom: 8 }}>Add Section</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, color: theme.text }}
                  placeholder="Section title..."
                  placeholderTextColor={theme.muted}
                  value={newSectionTitle}
                  onChangeText={setNewSectionTitle}
                />
                <TeacherActionButton
                  label="Add"
                  icon="plus"
                  tone="green"
                  onPress={handleAddSection}
                  disabled={sectionCreateMutation.isPending || !newSectionTitle.trim()}
                />
              </View>
            </View>
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Module unavailable" subtitle={moduleQuery.error ? toAppError(moduleQuery.error).message : "Loading module"}>
          <TeacherEmpty title="Unable to load module" subtitle="Pull to refresh after the module endpoint is available." />
        </TeacherPanel>
      )}

      {/* Delete Section Modal */}
      <TeacherConfirmModal
        visible={Boolean(deletingSection)}
        title="Delete Section"
        description={deletingSection ? `Are you sure you want to delete "${deletingSection.title}"?` : ""}
        loading={sectionDeleteMutation.isPending}
        onCancel={() => setDeletingSection(null)}
        onConfirm={async () => {
          if (!deletingSection) return;
          try {
            await sectionDeleteMutation.mutateAsync(deletingSection.id);
            setDeletingSection(null);
          } catch (error) {
            Alert.alert("Unable to delete section", toAppError(error).message);
          }
        }}
      />

      {/* Detach Item Modal */}
      <TeacherConfirmModal
        visible={Boolean(detachingItem)}
        title="Detach Item"
        description={detachingItem ? `Are you sure you want to remove "${detachingItem.title}" from this section?` : ""}
        loading={itemDetachMutation.isPending}
        onCancel={() => setDetachingItem(null)}
        onConfirm={async () => {
          if (!detachingItem) return;
          try {
            await itemDetachMutation.mutateAsync(detachingItem.id);
            setDetachingItem(null);
          } catch (error) {
            Alert.alert("Unable to detach item", toAppError(error).message);
          }
        }}
      />

      {/* Attach Item Modal */}
      <Modal visible={Boolean(attachingSectionId)} transparent animationType="fade" onRequestClose={() => setAttachingSectionId(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 20 }}
          onPress={() => setAttachingSectionId(null)}
        >
          <Pressable
            style={{ width: "100%", maxWidth: 420, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Attach Item to Section</Text>
              <Pressable onPress={() => setAttachingSectionId(null)}>
                <MaterialCommunityIcons name="close" size={20} color={theme.text} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>Select Item Type</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["assessment", "lesson", "file"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => {
                    setAttachItemType(type);
                    setAttachTargetId("");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: attachItemType === type ? theme.blue : theme.border,
                    backgroundColor: attachItemType === type ? theme.blueSoft : theme.active,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: attachItemType === type ? theme.blue : theme.text, textTransform: "capitalize" }}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            {attachItemType === "assessment" ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>Select Assessment</Text>
                <ScrollView style={{ maxHeight: 160, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 6 }}>
                  {assessmentsQuery.data?.length ? (
                    assessmentsQuery.data.map((assessment) => (
                      <Pressable
                        key={assessment.id}
                        onPress={() => setAttachTargetId(assessment.id)}
                        style={{
                          padding: 10,
                          borderRadius: 6,
                          backgroundColor: attachTargetId === assessment.id ? theme.blueSoft : "transparent",
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: attachTargetId === assessment.id ? theme.blue : theme.text }}>
                          {assessment.title}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={{ padding: 10, fontSize: 12, color: theme.muted }}>No assessments found for this class.</Text>
                  )}
                </ScrollView>
              </View>
            ) : attachItemType === "lesson" ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>Select Lesson</Text>
                <ScrollView style={{ maxHeight: 160, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 6 }}>
                  {lessonsQuery.data?.length ? (
                    lessonsQuery.data.map((lesson) => (
                      <Pressable
                        key={lesson.id}
                        onPress={() => setAttachTargetId(lesson.id)}
                        style={{
                          padding: 10,
                          borderRadius: 6,
                          backgroundColor: attachTargetId === lesson.id ? theme.blueSoft : "transparent",
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: attachTargetId === lesson.id ? theme.blue : theme.text }}>
                          {lesson.title}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={{ padding: 10, fontSize: 12, color: theme.muted }}>No lessons found for this class.</Text>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>
                  Enter File ID
                </Text>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: theme.text }}
                  placeholder="Enter file UUID..."
                  placeholderTextColor={theme.muted}
                  value={attachTargetId}
                  onChangeText={setAttachTargetId}
                />
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setAttachingSectionId(null)}
                style={{ flex: 1, height: 42, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleAttachItem()}
                disabled={itemAttachMutation.isPending || !attachTargetId.trim()}
                style={{ flex: 1, height: 42, borderRadius: 8, backgroundColor: theme.blue, alignItems: "center", justifyContent: "center", opacity: !attachTargetId.trim() ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>
                  {itemAttachMutation.isPending ? "Attaching..." : "Attach"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </TeacherScreen>
  );
}
