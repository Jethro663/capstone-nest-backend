import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { fileUploadApi } from "../api/services/file-upload";
import { modulesApi } from "../api/services/modules";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherLibrary">;
type LibraryTab = "files" | "modules";
type ScopeFilter = "all" | "private" | "general";

export function TeacherLibraryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const queryClient = useQueryClient();
  const classesQuery = useTeacherClasses(teacherId);

  const [activeTab, setActiveTab] = useState<LibraryTab>("files");
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<{ id: string; name: string } | null>(null);
  const [importingFile, setImportingFile] = useState<{ id: string; name: string } | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState("");

  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];

  const moduleQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.classModules(classId),
      queryFn: () => modulesApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const selectedClass =
    selectedClassId === "all"
      ? undefined
      : classesQuery.data?.find((entry) => entry.id === selectedClassId);

  const filesQuery = useQuery({
    queryKey: ["library-files", selectedClassId, selectedFolderId, search],
    queryFn: () => fileUploadApi.getAll({ classId: selectedClassId !== "all" ? selectedClassId : undefined, folderId: selectedFolderId !== "all" ? selectedFolderId : undefined, search: search.trim() || undefined }),
  });
  const foldersQuery = useQuery({ queryKey: ["library-folders"], queryFn: () => fileUploadApi.getFolders() });
  const storageQuery = useQuery({ queryKey: ["library-storage-summary"], queryFn: () => fileUploadApi.getStorageSummary() });
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => fileUploadApi.createFolder({ name, scope: "private" }),
    onSuccess: async () => {
      setNewFolderName("");
      await foldersQuery.refetch();
    },
  });

  const handleUploadFile = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      setUploading(true);
      const uploaded = await fileUploadApi.upload(
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
        },
        {
          classId: selectedClassId !== "all" ? selectedClassId : undefined,
          folderId: selectedFolderId !== "all" ? selectedFolderId : undefined,
          scope: "private",
        },
      );

      setActiveTab("files");
      await queryClient.invalidateQueries({ queryKey: ["library-files"] });
      await filesQuery.refetch();
      Alert.alert("File Asset Uploaded", `"${asset.name}" (ID: ${uploaded?.id?.slice(0, 8) || "uploaded"}) has been successfully added to your Nexora Library.`);
    } catch (err) {
      Alert.alert("Upload Failed", toAppError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fileUploadApi.delete(id),
    onSuccess: async () => {
      setDeletingFile(null);
      await queryClient.invalidateQueries({ queryKey: ["library-files"] });
      await filesQuery.refetch();
      Alert.alert("File Deleted", "The library resource has been deleted.");
    },
  });

  const moduleRecords = useMemo(
    () =>
      moduleQueries.flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!query.data || !classItem) return [];
        return query.data.map((module) => ({
          ...module,
          classLabel: `${classItem.subjectCode} | ${classItem.subjectName}`,
        }));
      }),
    [classesQuery.data, moduleQueries],
  );

  const filteredModules = useMemo(() => {
    return moduleRecords.filter((record) => {
      if (selectedClassId !== "all" && record.classId !== selectedClassId) return false;
      if (!search.trim()) return true;
      const haystack = `${record.title} ${record.description || ""} ${record.classLabel}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [moduleRecords, search, selectedClassId]);

  return (
    <TeacherScreen
      title="Nexora Library"
      subtitle="Raw document assets & cross-class content modules with 1:1 web parity."
      icon="folder-open-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || moduleQueries.some((query) => query.isRefetching)}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), filesQuery.refetch(), foldersQuery.refetch(), storageQuery.refetch(), ...moduleQueries.map((query) => query.refetch())]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Modules", value: moduleRecords.length, tone: "red" },
          { label: "Classes", value: classesQuery.data?.length ?? 0, tone: "blue" },
          { label: "Files", value: storageQuery.data?.totalFiles ?? filesQuery.data?.length ?? 0, tone: "green" },
          { label: "Storage", value: `${storageQuery.data?.totalMB ?? 0} MB`, tone: "amber" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", gap: 8 }}>
        <TeacherChip label="Raw Asset Files" active={activeTab === "files"} onPress={() => setActiveTab("files")} />
        <TeacherChip label="Class Modules" active={activeTab === "modules"} onPress={() => setActiveTab("modules")} />
      </View>

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search library resources or modules..." />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TeacherChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
        {(classesQuery.data ?? []).slice(0, 6).map((entry) => (
          <TeacherChip
            key={entry.id}
            label={entry.subjectCode}
            active={selectedClassId === entry.id}
            onPress={() => setSelectedClassId(entry.id)}
          />
        ))}
      </View>

      {activeTab === "files" ? (
        <TeacherPanel title="Folders and storage" subtitle="Filter the complete library, create folders, and review authoritative storage totals.">
          <View style={{ paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            <TeacherChip label="All folders" active={selectedFolderId === "all"} onPress={() => setSelectedFolderId("all")} />
            {(foldersQuery.data ?? []).map((folder) => <TeacherChip key={folder.id} label={folder.name} active={selectedFolderId === folder.id} onPress={() => setSelectedFolderId(folder.id)} />)}
          </View>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput accessibilityLabel="New folder name" value={newFolderName} onChangeText={setNewFolderName} placeholder="New folder name" placeholderTextColor={teacherTheme.muted} style={{ flex: 1, borderWidth: 1, borderColor: teacherTheme.border, borderRadius: 10, color: teacherTheme.text, paddingHorizontal: 11, paddingVertical: 9 }} />
            <TeacherActionButton label="Create" icon="folder-plus-outline" tone="blue" disabled={!newFolderName.trim() || createFolderMutation.isPending} onPress={() => void createFolderMutation.mutateAsync(newFolderName.trim()).catch((error) => Alert.alert("Unable to create folder", toAppError(error).message))} />
          </View>
        </TeacherPanel>
      ) : null}

      <TeacherPanel
        title="Library actions"
        subtitle={
          selectedClass
            ? `Focused class: ${selectedClass.subjectCode} | ${selectedClass.subjectName}`
            : "Upload assets or pick a class chip to unlock class-specific actions."
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label={uploading ? "Uploading..." : "Upload File Asset"}
            icon="upload-outline"
            tone="green"
            disabled={uploading}
            onPress={() => void handleUploadFile()}
          />
          <TeacherActionButton
            label="Create module"
            icon="plus-box-outline"
            tone="blue"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherCreateModule", { classId: selectedClass.id });
            }}
          />
        </View>
      </TeacherPanel>

      {activeTab === "modules" ? (
        <TeacherPanel title="Module library" subtitle="Tap a module to open its teacher module workspace.">
          {filteredModules.length ? (
            filteredModules.map((module) => (
              <TeacherRow
                key={module.id}
                title={module.title}
                subtitle={`${module.classLabel} | ${module.sections?.length ?? 0} sections`}
                onPress={() => navigation.navigate("TeacherModuleDetail", { classId: module.classId, moduleId: module.id })}
                right={
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: teacherTheme.border,
                      backgroundColor: teacherTheme.active,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: teacherTheme.muted }}>
                      {module.sections?.length ?? 0} sections
                    </Text>
                  </View>
                }
              />
            ))
          ) : (
            <TeacherEmpty title="No modules found" subtitle="No modules match the current class filter or search." icon="folder-search-outline" />
          )}
        </TeacherPanel>
      ) : (
        <TeacherPanel title="Raw Asset Library" subtitle="Document resources, curriculum banks, and uploaded files.">
          {filesQuery.data?.length ? (
            filesQuery.data.map((file) => {
              const name = file.originalName || file.filename || "Uploaded File";
              const sizeLabel = file.sizeBytes ? `${Math.round(file.sizeBytes / 1024)} KB` : "";
              const dateLabel = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "";
              return (
                <TeacherRow
                  key={file.id}
                  title={name}
                  subtitle={[file.mimeType || "Document", sizeLabel, dateLabel].filter(Boolean).join(" · ")}
                  right={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <TeacherActionButton
                        label="Open"
                        tone="blue"
                        onPress={() => void fileUploadApi.open(file.id, name)}
                      />
                      {file.indexStatus === "failed" ? (
                        <TeacherActionButton label="Retry index" tone="amber" onPress={() => void fileUploadApi.retryIndex(file.id).then(() => filesQuery.refetch()).catch((error) => Alert.alert("Retry failed", toAppError(error).message))} />
                      ) : null}
                      <Pressable
                        onPress={() => setDeletingFile({ id: file.id, name })}
                        style={{ padding: 6 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={teacherTheme.red} />
                      </Pressable>
                    </View>
                  }
                />
              );
            })
          ) : (
            <TeacherEmpty title="Nexora File Asset Bank" subtitle="Tap 'Upload File Asset' above to upload PDFs, PPTs, or Docs directly to your Nexora Library." icon="cloud-upload-outline" />
          )}
        </TeacherPanel>
      )}

      {/* Delete Confirm Modal */}
      <TeacherConfirmModal
        visible={Boolean(deletingFile)}
        title="Delete Library Asset?"
        description={deletingFile ? `Are you sure you want to delete "${deletingFile.name}"? This action cannot be undone.` : ""}
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingFile(null)}
        onConfirm={() => {
          if (deletingFile) {
            void deleteMutation.mutateAsync(deletingFile.id).catch((err) => {
              Alert.alert("Unable to delete file", toAppError(err).message);
            });
          }
        }}
      />
    </TeacherScreen>
  );
}
