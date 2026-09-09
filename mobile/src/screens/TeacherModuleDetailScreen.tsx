import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
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
import { navigateTeacherDetailBack } from "../navigation/teacher-detail-back";
import { fileUploadApi } from "../api/services/file-upload";
import { assessmentsApi } from "../api/services/assessments";
import { lessonsApi } from "../api/services/lessons";
import { modulesApi } from "../api/services/modules";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import {
  TeacherActionButton,
  TeacherAccordionSection,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherActionSheet,
  TeacherBottomActionBar,
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherQuickActionRail,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherModuleDetail">;

export function TeacherModuleDetailScreen({ navigation, route }: Props) {
  const { classId, moduleId } = route.params;
  const handleBack = () =>
    navigateTeacherDetailBack(navigation, "TeacherModuleDetail", route.params);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [deletingSection, setDeletingSection] = useState<{ id: string; title: string } | null>(null);
  const [detachingItem, setDetachingItem] = useState<{ id: string; title: string } | null>(null);
  const [attachingSectionId, setAttachingSectionId] = useState<string | null>(null);
  const [attachItemType, setAttachItemType] = useState<"lesson" | "assessment" | "file">("assessment");
  const [attachTargetId, setAttachTargetId] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [editingSection, setEditingSection] = useState<{ id: string; title: string; description: string } | null>(null);
  const [gradingScaleDraft, setGradingScaleDraft] = useState("");
  const [savingExtendedControl, setSavingExtendedControl] = useState(false);
  const [moduleControlsVisible, setModuleControlsVisible] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [managingSection, setManagingSection] = useState<{ id: string; title: string; index: number } | null>(null);
  const [managingItem, setManagingItem] = useState<{ id: string; sectionId: string; title: string; index: number } | null>(null);

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

  useEffect(() => {
    if (!module) return;
    setGradingScaleDraft((module.gradingScaleEntries ?? []).map((entry) => `${entry.letter}|${entry.label}|${entry.minScore}|${entry.maxScore}`).join("\n"));
    setExpandedSectionIds((current) => current.length ? current : module.sections.slice(0, 1).map((section) => section.id));
  }, [module]);

  const managedItemSection = module?.sections.find((section) => section.id === managingItem?.sectionId);
  const managedItem = managedItemSection?.items.find((item) => item.id === managingItem?.id);

  const saveSection = async () => {
    if (!editingSection?.title.trim()) return;
    try {
      setSavingExtendedControl(true);
      await modulesApi.updateSection(editingSection.id, { title: editingSection.title.trim(), description: editingSection.description.trim() || undefined });
      setEditingSection(null);
      await moduleQuery.refetch();
    } catch (error) {
      Alert.alert("Unable to update section", toAppError(error).message);
    } finally {
      setSavingExtendedControl(false);
    }
  };

  const saveGradingScale = async () => {
    if (!module) return;
    try {
      const entries = gradingScaleDraft.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
        const [letter, label, minRaw, maxRaw] = line.split("|").map((value) => value.trim());
        const minScore = Number(minRaw);
        const maxScore = Number(maxRaw);
        if (!letter || !label || !Number.isFinite(minScore) || !Number.isFinite(maxScore) || minScore < 0 || maxScore > 100 || minScore > maxScore) {
          throw new Error(`Line ${index + 1} must use Letter|Label|Minimum|Maximum with a valid 0-100 range.`);
        }
        return { letter, label, minScore, maxScore, order: index + 1 };
      });
      if (!entries.length) throw new Error("Add at least one grading-scale entry.");
      setSavingExtendedControl(true);
      await modulesApi.replaceGradingScale(module.id, { entries });
      await moduleQuery.refetch();
      Alert.alert("Grading scale saved", "The complete module scale was replaced by the reviewed entries.");
    } catch (error) {
      Alert.alert("Unable to replace grading scale", toAppError(error).message);
    } finally {
      setSavingExtendedControl(false);
    }
  };

  const releaseCoreModule = async () => {
    if (!module?.isCoreTemplateAsset) return;
    try {
      setSavingExtendedControl(true);
      await modulesApi.releaseCoreModule(module.id, { isVisible: module.isVisible === false, isLocked: false });
      await moduleQuery.refetch();
    } catch (error) {
      Alert.alert("Core release rejected", toAppError(error).message);
    } finally {
      setSavingExtendedControl(false);
    }
  };

  const releaseCoreItem = async (itemId: string) => {
    try {
      setSavingExtendedControl(true);
      await modulesApi.releaseCoreItem(itemId, { isVisible: true, isGiven: true });
      await moduleQuery.refetch();
    } catch (error) {
      Alert.alert("Core item release rejected", toAppError(error).message);
    } finally {
      setSavingExtendedControl(false);
    }
  };

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
      navigation.navigate("TeacherLessonDetail", {
        lessonId: item.lessonId,
        classId,
        moduleId,
        source: "module",
        moduleSource: route.params.source ?? "class",
      });
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
      showBackButton
      onBackPress={handleBack}
      refreshing={moduleQuery.isRefetching}
      onRefresh={() => {
        void moduleQuery.refetch();
      }}
      bottomAction={
        module ? (
          <TeacherBottomActionBar
            primaryLabel="Add to module"
            primaryIcon="plus"
            onPrimary={() => setAddMenuVisible(true)}
          />
        ) : undefined
      }
    >
      {module ? (
        <>
          <TeacherContextStrip
            title={module.title}
            subtitle={`${module.sections?.length ?? 0} sections · ${module.isVisible === false ? "Hidden" : "Visible"}`}
            status={module.isLocked ? "Locked" : "Open"}
            icon="view-module-outline"
          />
          <TeacherQuickActionRail
            actions={[
              { label: "Module settings", icon: "tune-variant", tone: "blue", onPress: () => setModuleControlsVisible(true) },
            ]}
          />
          <TeacherFlatSection title="Module outline" subtitle="Expand a section to open its lessons, assessments, and files.">
            {module.sections?.length ? (
              module.sections.map((section, sIndex) => (
                <TeacherAccordionSection
                  key={section.id}
                  title={section.title}
                  subtitle={section.description || `${section.items.length} items`}
                  icon="folder-outline"
                  count={section.items.length}
                  expanded={expandedSectionIds.includes(section.id)}
                  onToggle={() => setExpandedSectionIds((current) => current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id])}
                  action={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Manage ${section.title}`}
                      onPress={() => setManagingSection({ id: section.id, title: section.title, index: sIndex })}
                      style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                    >
                      <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.muted} />
                    </Pressable>
                  }
                >
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
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Manage ${itemTitle}`}
                              onPress={() => setManagingItem({ id: item.id, sectionId: section.id, title: itemTitle, index: iIndex })}
                              style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.active }}
                            >
                              <MaterialCommunityIcons name="dots-horizontal" size={18} color={theme.muted} />
                            </Pressable>
                          }
                        />
                      );
                    })
                  ) : (
                    <TeacherEmpty title="No items here" subtitle="Tap the '+' button above to attach an assessment, lesson, or file." icon="playlist-remove" />
                  )}
                </TeacherAccordionSection>
              ))
            ) : (
              <TeacherEmpty title="No sections yet" subtitle="This module does not have any sections or published items yet." icon="view-module-outline" />
            )}
          </TeacherFlatSection>
        </>
      ) : (
        <TeacherFlatSection title="Module unavailable" subtitle={moduleQuery.error ? toAppError(moduleQuery.error).message : "Loading module"}>
          <TeacherEmpty title="Unable to load module" subtitle="Pull to refresh after the module endpoint is available." />
        </TeacherFlatSection>
      )}

      {module ? (
        <TeacherActionSheet visible={moduleControlsVisible} title="Module settings" subtitle="Visibility, release, cover, and grading controls." onClose={() => setModuleControlsVisible(false)}>
          <View style={{ paddingVertical: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label={module.isLocked ? "Unlock module" : "Lock module"} icon={module.isLocked ? "lock-open-variant-outline" : "lock-outline"} tone="amber" onPress={() => void toggleModuleField("isLocked")} disabled={moduleUpdateMutation.isPending} />
            <TeacherActionButton label={module.isVisible === false ? "Show module" : "Hide module"} icon={module.isVisible === false ? "eye-outline" : "eye-off-outline"} tone="blue" onPress={() => void toggleModuleField("isVisible")} disabled={moduleUpdateMutation.isPending} />
            <TeacherActionButton label={coverMutation.isPending ? "Uploading..." : "Cover image"} icon="image-outline" tone="purple" onPress={() => void handlePickCoverImage()} disabled={coverMutation.isPending} />
            {module.isCoreTemplateAsset ? <TeacherActionButton label="Release core module" icon="shield-check-outline" tone="green" onPress={() => void releaseCoreModule()} disabled={savingExtendedControl} /> : null}
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 14, gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: theme.text }}>Module grading scale</Text>
            <Text style={{ fontSize: 11, lineHeight: 16, color: theme.muted }}>One entry per line: Letter|Label|Minimum|Maximum.</Text>
            <TextInput accessibilityLabel="Module grading scale" multiline value={gradingScaleDraft} onChangeText={setGradingScaleDraft} placeholder={"A|Excellent|90|100\nB|Proficient|80|89"} placeholderTextColor={theme.muted} style={{ minHeight: 112, textAlignVertical: "top", backgroundColor: theme.active, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 13, color: theme.text }} />
            <TeacherActionButton label="Replace grading scale" icon="content-save-outline" tone="blue" onPress={() => void saveGradingScale()} disabled={savingExtendedControl || !gradingScaleDraft.trim()} />
          </View>
        </TeacherActionSheet>
      ) : null}

      <TeacherActionSheet visible={addMenuVisible} title="Add to module" subtitle="Create a section or choose where to attach content." onClose={() => setAddMenuVisible(false)}>
        <View style={{ paddingVertical: 10, flexDirection: "row", gap: 8 }}>
          <TextInput style={{ flex: 1, minHeight: 44, backgroundColor: theme.active, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: theme.text }} placeholder="New section title" placeholderTextColor={theme.muted} value={newSectionTitle} onChangeText={setNewSectionTitle} />
          <TeacherActionButton label="Add section" icon="plus" tone="green" onPress={() => { void handleAddSection(); setAddMenuVisible(false); }} disabled={sectionCreateMutation.isPending || !newSectionTitle.trim()} />
        </View>
        <Text style={{ marginTop: 6, fontSize: 11, fontWeight: "800", color: theme.muted }}>ATTACH TO A SECTION</Text>
        {(module?.sections ?? []).map((section) => (
          <Pressable key={section.id} accessibilityRole="button" accessibilityLabel={`Attach content to ${section.title}`} onPress={() => { setAddMenuVisible(false); setAttachingSectionId(section.id); }} style={{ minHeight: 48, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="folder-plus-outline" size={19} color={theme.blue} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: theme.text }}>{section.title}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.dim} />
          </Pressable>
        ))}
      </TeacherActionSheet>

      <TeacherActionSheet visible={Boolean(managingSection)} title={managingSection?.title || "Section actions"} subtitle="Manage this section without crowding the outline." onClose={() => setManagingSection(null)}>
        <View style={{ paddingVertical: 10, gap: 8 }}>
          <TeacherActionButton label="Move up" icon="arrow-up" tone="neutral" disabled={!managingSection || managingSection.index === 0 || sectionReorderMutation.isPending} onPress={() => { if (managingSection) void moveSection(managingSection.index, "up"); setManagingSection(null); }} />
          <TeacherActionButton label="Move down" icon="arrow-down" tone="neutral" disabled={!managingSection || managingSection.index === (module?.sections.length ?? 0) - 1 || sectionReorderMutation.isPending} onPress={() => { if (managingSection) void moveSection(managingSection.index, "down"); setManagingSection(null); }} />
          <TeacherActionButton label="Attach content" icon="plus-box-outline" tone="blue" onPress={() => { if (managingSection) setAttachingSectionId(managingSection.id); setManagingSection(null); }} />
          <TeacherActionButton label="Edit section" icon="pencil-outline" tone="blue" onPress={() => { const section = module?.sections.find((entry) => entry.id === managingSection?.id); if (section) setEditingSection({ id: section.id, title: section.title, description: section.description ?? "" }); setManagingSection(null); }} />
          <TeacherActionButton label="Delete section" icon="trash-can-outline" tone="red" onPress={() => { if (managingSection) handleDeleteSection(managingSection.id, managingSection.title); setManagingSection(null); }} />
        </View>
      </TeacherActionSheet>

      <TeacherActionSheet visible={Boolean(managingItem)} title={managingItem?.title || "Item actions"} subtitle="Reorder, release, hide, or detach this item." onClose={() => setManagingItem(null)}>
        <View style={{ paddingVertical: 10, gap: 8 }}>
          <TeacherActionButton label="Move up" icon="arrow-up" tone="neutral" disabled={!managingItem || managingItem.index === 0 || itemReorderMutation.isPending} onPress={() => { if (managingItem && managedItemSection) void moveItem(managingItem.sectionId, managedItemSection.items, managingItem.index, "up"); setManagingItem(null); }} />
          <TeacherActionButton label="Move down" icon="arrow-down" tone="neutral" disabled={!managingItem || !managedItemSection || managingItem.index === managedItemSection.items.length - 1 || itemReorderMutation.isPending} onPress={() => { if (managingItem && managedItemSection) void moveItem(managingItem.sectionId, managedItemSection.items, managingItem.index, "down"); setManagingItem(null); }} />
          <TeacherActionButton label={managedItem?.isVisible === false ? "Show item" : "Hide item"} icon={managedItem?.isVisible === false ? "eye-outline" : "eye-off-outline"} tone="blue" disabled={!managedItem || itemUpdateMutation.isPending} onPress={() => { if (managedItem) void toggleItemVisibility(managedItem.id, managedItem.isVisible); setManagingItem(null); }} />
          {managedItem?.isCoreTemplateAsset ? <TeacherActionButton label="Release core item" icon="shield-check-outline" tone="green" disabled={savingExtendedControl} onPress={() => { if (managedItem) void releaseCoreItem(managedItem.id); setManagingItem(null); }} /> : null}
          <TeacherActionButton label="Detach item" icon="delete-outline" tone="red" onPress={() => { if (managingItem) setDetachingItem({ id: managingItem.id, title: managingItem.title }); setManagingItem(null); }} />
        </View>
      </TeacherActionSheet>

      <Modal visible={Boolean(editingSection)} transparent animationType="fade" onRequestClose={() => setEditingSection(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 20 }} onPress={() => setEditingSection(null)}>
          <Pressable style={{ width: "100%", maxWidth: 420, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 10 }} onPress={(event) => event.stopPropagation()}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Edit module section</Text>
            <TextInput accessibilityLabel="Section title" value={editingSection?.title ?? ""} onChangeText={(title) => setEditingSection((current) => current ? { ...current, title } : current)} placeholder="Section title" placeholderTextColor={theme.muted} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 11, color: theme.text }} />
            <TextInput accessibilityLabel="Section description" multiline value={editingSection?.description ?? ""} onChangeText={(description) => setEditingSection((current) => current ? { ...current, description } : current)} placeholder="Section description" placeholderTextColor={theme.muted} style={{ minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 11, color: theme.text }} />
            <View style={{ flexDirection: "row", gap: 8 }}><TeacherActionButton label="Cancel" tone="neutral" onPress={() => setEditingSection(null)} /><TeacherActionButton label="Save section" tone="green" onPress={() => void saveSection()} disabled={savingExtendedControl || !editingSection?.title.trim()} /></View>
          </Pressable>
        </Pressable>
      </Modal>

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
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted }}>Select Assessment</Text>
                  <Pressable
                    onPress={async () => {
                      try {
                        const created = await assessmentsApi.create({ title: "New Assessment", classId });
                        await assessmentsQuery.refetch();
                        setAttachTargetId(created.id);
                        Alert.alert("Assessment Created", "Draft assessment created and selected!");
                      } catch (err) {
                        Alert.alert("Error", toAppError(err).message);
                      }
                    }}
                    style={{ borderRadius: 6, backgroundColor: theme.greenSoft, paddingHorizontal: 8, paddingVertical: 4 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.green }}>+ Create New</Text>
                  </Pressable>
                </View>
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
                    <Text style={{ padding: 10, fontSize: 12, color: theme.muted }}>No assessments found for this class. Tap "+ Create New" above.</Text>
                  )}
                </ScrollView>
              </View>
            ) : attachItemType === "lesson" ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted }}>Select Lesson</Text>
                  <Pressable
                    onPress={async () => {
                      try {
                        const created = await lessonsApi.create({ title: "New Lesson", classId });
                        await lessonsQuery.refetch();
                        setAttachTargetId(created.id);
                        Alert.alert("Lesson Created", "Draft lesson created and selected!");
                      } catch (err) {
                        Alert.alert("Error", toAppError(err).message);
                      }
                    }}
                    style={{ borderRadius: 6, backgroundColor: theme.greenSoft, paddingHorizontal: 8, paddingVertical: 4 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.green }}>+ Create New</Text>
                  </Pressable>
                </View>
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
                    <Text style={{ padding: 10, fontSize: 12, color: theme.muted }}>No lessons found for this class. Tap "+ Create New" above.</Text>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>
                  Document File Attachment
                </Text>
                <Pressable
                  disabled={uploadingFile}
                  onPress={async () => {
                    try {
                      const DocumentPicker = await import("expo-document-picker");
                      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
                      if (res.canceled || !res.assets || !res.assets[0]) return;
                      const asset = res.assets[0];
                      setUploadingFile(true);
                      setSelectedFileName(asset.name);
                      const uploaded = await fileUploadApi.upload(
                        { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/pdf" },
                        { classId, scope: "private" },
                      );
                      setAttachTargetId(uploaded.id);
                      Alert.alert("File Uploaded", `"${asset.name}" ready to attach.`);
                    } catch (err) {
                      Alert.alert("Upload Failed", toAppError(err).message);
                    } finally {
                      setUploadingFile(false);
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    padding: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={theme.blue} />
                  <Text style={{ marginTop: 6, fontSize: 13, fontWeight: "700", color: theme.text }}>
                    {uploadingFile ? "Uploading File..." : selectedFileName ? `Selected: ${selectedFileName}` : "Tap to Pick Document / File"}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>Supports PDF, DOCX, PPTX, Images, and More</Text>
                </Pressable>
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
