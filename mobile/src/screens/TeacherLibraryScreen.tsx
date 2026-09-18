import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { fileUploadApi } from "../api/services/file-upload";
import { mobileWorkspaceApi } from "../api/services/mobile-workspace";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherSelectMenu,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherSegmentedTabs,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherLibrary">;
type LibraryTab = "files" | "modules";

export function TeacherLibraryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const queryClient = useQueryClient();
  const classesQuery = useTeacherClasses(teacherId);

  const [activeTab, setActiveTab] = useState<LibraryTab>("files");
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState("");

  const libraryIndexQuery = useQuery({
    queryKey: ["mobile-workspace", "teacher-library-index", teacherId],
    queryFn: () => mobileWorkspaceApi.getTeacherLibraryIndex(),
    enabled: Boolean(teacherId),
  });

  const selectedClass =
    selectedClassId === "all"
      ? undefined
      : classesQuery.data?.find((entry) => entry.id === selectedClassId);

  const filesQuery = useQuery({
    queryKey: ["library-files", selectedClassId, selectedFolderId, search],
    queryFn: () =>
      fileUploadApi.getAll({
        classId: selectedClassId !== "all" ? selectedClassId : undefined,
        folderId: selectedFolderId !== "all" ? selectedFolderId : undefined,
        search: search.trim() || undefined,
      }),
  });
  const foldersQuery = useQuery({
    queryKey: ["library-folders"],
    queryFn: () => fileUploadApi.getFolders(),
  });
  const storageQuery = useQuery({
    queryKey: ["library-storage-summary"],
    queryFn: () => fileUploadApi.getStorageSummary(),
  });
  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      fileUploadApi.createFolder({ name, scope: "private" }),
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

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;
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
      Alert.alert(
        "File Asset Uploaded",
        `"${asset.name}" (ID: ${uploaded?.id?.slice(0, 8) || "uploaded"}) has been successfully added to your Nexora Library.`,
      );
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

  const moduleRecords = libraryIndexQuery.data?.modules ?? [];

  const filteredModules = useMemo(() => {
    return moduleRecords.filter((record) => {
      if (selectedClassId !== "all" && record.classId !== selectedClassId)
        return false;
      if (!search.trim()) return true;
      const haystack =
        `${record.title} ${record.description || ""} ${record.classLabel}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [moduleRecords, search, selectedClassId]);

  return (
    <TeacherScreen
      title="Nexora Library"
      subtitle="Manage source files or reusable class content."
      icon="folder-open-outline"
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || libraryIndexQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          libraryIndexQuery.refetch(),
          filesQuery.refetch(),
          foldersQuery.refetch(),
          storageQuery.refetch(),
        ]);
      }}
    >
      <TeacherSegmentedTabs
        accessibilityLabel="Library views"
        activeKey={activeTab}
        onSelect={setActiveTab}
        items={[
          {
            key: "files",
            label: "Files",
            count:
              storageQuery.data?.totalFiles ?? filesQuery.data?.length ?? 0,
          },
          { key: "modules", label: "Modules", count: moduleRecords.length },
        ]}
      />

      <TeacherSearch
        value={search}
        onChangeText={setSearch}
        placeholder="Search library resources or modules..."
      />
      <TeacherSelectMenu
        label="Class scope"
        selectedValue={selectedClassId}
        options={[
          { value: "all", label: "All assigned classes" },
          ...(classesQuery.data ?? []).map((entry) => ({
            value: entry.id,
            label: `${entry.subjectCode} · ${entry.subjectName}`,
          })),
        ]}
        onSelect={setSelectedClassId}
      />
      <TeacherContextStrip
        title={activeTab === "files" ? "Source files" : "Reusable modules"}
        subtitle={
          selectedClass
            ? `${selectedClass.subjectCode} · ${selectedClass.subjectName}`
            : "Across assigned classes"
        }
        status={
          activeTab === "files"
            ? `${storageQuery.data?.totalMB ?? 0} MB`
            : `${moduleRecords.length} modules`
        }
        icon={
          activeTab === "files"
            ? "file-document-multiple-outline"
            : "view-module-outline"
        }
      />

      {activeTab === "files" ? (
        <TeacherFlatSection
          title="Folders"
          subtitle="Filter the source library or create a private folder."
        >
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 7,
            }}
          >
            <TeacherChip
              label="All folders"
              active={selectedFolderId === "all"}
              onPress={() => setSelectedFolderId("all")}
            />
            {(foldersQuery.data ?? []).map((folder) => (
              <TeacherChip
                key={folder.id}
                label={folder.name}
                active={selectedFolderId === folder.id}
                onPress={() => setSelectedFolderId(folder.id)}
              />
            ))}
          </View>
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TextInput
              accessibilityLabel="New folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="New folder name"
              placeholderTextColor={teacherTheme.muted}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: teacherTheme.border,
                borderRadius: 10,
                color: teacherTheme.text,
                paddingHorizontal: 11,
                paddingVertical: 9,
              }}
            />
            <TeacherActionButton
              label="Create"
              icon="folder-plus-outline"
              tone="blue"
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              onPress={() =>
                void createFolderMutation
                  .mutateAsync(newFolderName.trim())
                  .catch((error) =>
                    Alert.alert(
                      "Unable to create folder",
                      toAppError(error).message,
                    ),
                  )
              }
            />
          </View>
        </TeacherFlatSection>
      ) : null}

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        {activeTab === "files" ? (
          <TeacherActionButton
            label={uploading ? "Uploading..." : "Upload file"}
            icon="upload-outline"
            tone="green"
            disabled={uploading}
            onPress={() => void handleUploadFile()}
          />
        ) : (
          <TeacherActionButton
            label="New module"
            icon="plus-box-outline"
            tone="green"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherCreateModule", {
                classId: selectedClass.id,
              });
            }}
          />
        )}
      </View>

      {activeTab === "modules" ? (
        <TeacherFlatSection
          title="Modules"
          subtitle="Reusable class content with current lifecycle state."
        >
          {filteredModules.length ? (
            filteredModules.map((module) => (
              <TeacherRow
                key={module.id}
                title={module.title}
                subtitle={`${module.classLabel} · ${module.sectionCount} sections · ${module.lessonCount} lessons · ${module.isVisible === false ? "Hidden" : "Visible"}`}
                onPress={() =>
                  navigation.navigate("TeacherModuleDetail", {
                    classId: module.classId,
                    moduleId: module.id,
                    source: "library",
                  })
                }
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
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: teacherTheme.muted,
                      }}
                    >
                      {module.sectionCount} sections
                    </Text>
                  </View>
                }
              />
            ))
          ) : (
            <TeacherEmpty
              title="No modules found"
              subtitle="No modules match the current class filter or search."
              icon="folder-search-outline"
            />
          )}
        </TeacherFlatSection>
      ) : (
        <TeacherFlatSection
          title="Files"
          subtitle="Document sources with type, size, date, scope, and indexing evidence."
        >
          {filesQuery.data?.length ? (
            filesQuery.data.map((file) => {
              const name =
                file.originalName || file.filename || "Uploaded File";
              const sizeLabel = file.sizeBytes
                ? `${Math.round(file.sizeBytes / 1024)} KB`
                : "";
              const dateLabel = file.createdAt
                ? new Date(file.createdAt).toLocaleDateString()
                : "";
              return (
                <TeacherRow
                  key={file.id}
                  title={name}
                  subtitle={[
                    file.mimeType || "Document",
                    sizeLabel,
                    dateLabel,
                    file.scope || "private",
                    file.indexStatus ? `Index ${file.indexStatus}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  right={
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <TeacherActionButton
                        label="Open"
                        tone="blue"
                        onPress={() => void fileUploadApi.open(file.id, name)}
                      />
                      {file.indexStatus === "failed" ? (
                        <TeacherActionButton
                          label="Retry index"
                          tone="amber"
                          onPress={() =>
                            void fileUploadApi
                              .retryIndex(file.id)
                              .then(() => filesQuery.refetch())
                              .catch((error) =>
                                Alert.alert(
                                  "Retry failed",
                                  toAppError(error).message,
                                ),
                              )
                          }
                        />
                      ) : null}
                      <Pressable
                        onPress={() => setDeletingFile({ id: file.id, name })}
                        style={{ padding: 6 }}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={teacherTheme.red}
                        />
                      </Pressable>
                    </View>
                  }
                />
              );
            })
          ) : (
            <TeacherEmpty
              title="Nexora File Asset Bank"
              subtitle="Tap 'Upload File Asset' above to upload PDFs, PPTs, or Docs directly to your Nexora Library."
              icon="cloud-upload-outline"
            />
          )}
        </TeacherFlatSection>
      )}

      {/* Delete Confirm Modal */}
      <TeacherConfirmModal
        visible={Boolean(deletingFile)}
        title="Delete Library Asset?"
        description={
          deletingFile
            ? `Are you sure you want to delete "${deletingFile.name}"? This action cannot be undone.`
            : ""
        }
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
