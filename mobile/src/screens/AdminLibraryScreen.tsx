import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { fileUploadApi } from "../api/services/file-upload";
import { toAppError } from "../api/http";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminField,
  AdminListHeader,
  AdminNotice,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import type { MainTabParamList } from "../navigation/types";
import {
  LIBRARY_GRADES,
  LIBRARY_SUBJECTS,
  type LibraryGradeLevel,
  type LibrarySubjectKey,
  type UploadedLibraryFile,
} from "../types/extraction";

type Props = BottomTabScreenProps<MainTabParamList, "AdminLibrary">;
type ScopeFilter = "all" | "private" | "general";
type IndexFilter =
  | "all"
  | "not_indexed"
  | "pending"
  | "processing"
  | "completed"
  | "failed";
type UploadAsset = { uri: string; name: string; type?: string | null };

const indexFilters: Array<{ key: IndexFilter; label: string }> = [
  { key: "all", label: "Any indexing" },
  { key: "completed", label: "Ready" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "not_indexed", label: "Not indexed" },
];

export function AdminLibraryScreen(_props: Props) {
  const queryClient = useQueryClient();
  const { isOffline } = useAdminNetworkStatus();
  const uploadController = useRef<AbortController | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [folderId, setFolderId] = useState<string | undefined>();
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<LibrarySubjectKey | "">(
    "",
  );
  const [gradeFilter, setGradeFilter] = useState<LibraryGradeLevel | "">("");
  const [indexFilter, setIndexFilter] = useState<IndexFilter>("all");

  const [newFolder, setNewFolder] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selected, setSelected] = useState<UploadedLibraryFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<"private" | "general">("general");
  const [editSubjectKey, setEditSubjectKey] = useState<LibrarySubjectKey | "">(
    "",
  );
  const [editGradeLevel, setEditGradeLevel] = useState<LibraryGradeLevel | "">(
    "",
  );
  const [editTeacherVisible, setEditTeacherVisible] = useState(true);
  const [editAiEnabled, setEditAiEnabled] = useState(true);

  const [uploadSubjectKey, setUploadSubjectKey] = useState<
    LibrarySubjectKey | ""
  >("");
  const [uploadGradeLevel, setUploadGradeLevel] = useState<
    LibraryGradeLevel | ""
  >("");
  const [uploadTeacherVisible, setUploadTeacherVisible] = useState(true);
  const [uploadAiEnabled, setUploadAiEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const uploadPartitionMissing = !uploadSubjectKey || !uploadGradeLevel;
  const editPartitionMissing =
    (editScope === "general" || editAiEnabled) &&
    (!editSubjectKey || !editGradeLevel);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const files = useInfiniteQuery({
    queryKey: [
      "admin-library",
      folderId,
      debouncedSearch,
      scopeFilter,
      subjectFilter,
      gradeFilter,
      indexFilter,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fileUploadApi.getPage({
        page: pageParam,
        limit: 25,
        folderId,
        search: debouncedSearch || undefined,
        scope: scopeFilter === "all" ? undefined : scopeFilter,
        subjectKey: subjectFilter || undefined,
        gradeLevel: gradeFilter || undefined,
        indexStatus: indexFilter === "all" ? undefined : indexFilter,
      }),
    getNextPageParam: nextAdminPage,
  });
  const folders = useQuery({
    queryKey: ["admin-library-folders"],
    queryFn: () => fileUploadApi.getFolders({}),
  });
  const storage = useQuery({
    queryKey: ["admin-library-storage"],
    queryFn: () => fileUploadApi.getStorageSummary(),
  });
  const rows = useMemo(
    () => mergeAdminPages(files.data?.pages ?? [], (entry) => entry.id),
    [files.data?.pages],
  );
  const selectedFolder = folders.data?.find((folder) => folder.id === folderId);

  const refresh = async () => {
    await Promise.all([files.refetch(), folders.refetch(), storage.refetch()]);
  };

  const refuseOfflineWrite = () => {
    if (!isOffline) return false;
    Alert.alert(
      "Connect before changing the library",
      "Cached files remain readable, but uploads and metadata changes are never queued offline.",
    );
    return true;
  };

  const createFolder = async () => {
    if (!newFolder.trim() || refuseOfflineWrite()) return;
    try {
      setBusy(true);
      await fileUploadApi.createFolder({
        name: newFolder.trim(),
        parentId: folderId,
        scope: "general",
      });
      setNewFolder("");
      await queryClient.invalidateQueries({
        queryKey: ["admin-library-folders"],
      });
    } catch (error) {
      Alert.alert("Folder not created", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const renameFolder = async () => {
    if (!selectedFolder || !folderName.trim() || refuseOfflineWrite()) return;
    try {
      setBusy(true);
      await fileUploadApi.updateFolder(selectedFolder.id, {
        name: folderName.trim(),
      });
      await folders.refetch();
    } catch (error) {
      Alert.alert("Folder not renamed", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = () => {
    if (!selectedFolder || refuseOfflineWrite()) return;
    Alert.alert(
      "Delete this folder?",
      "The backend will reject this if it still contains files or child folders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete folder",
          style: "destructive",
          onPress: () =>
            void fileUploadApi
              .deleteFolder(selectedFolder.id)
              .then(async () => {
                setFolderId(undefined);
                setFolderName("");
                await refresh();
              })
              .catch((error) =>
                Alert.alert("Folder not deleted", toAppError(error).message),
              ),
        },
      ],
    );
  };

  const startUpload = async (asset: UploadAsset) => {
    if (refuseOfflineWrite()) return;
    if (uploadPartitionMissing) {
      Alert.alert(
        "Classification required",
        "General library files need both a subject and grade before upload so indexing and teacher discovery use the correct partition.",
      );
      return;
    }
    const controller = new AbortController();
    uploadController.current = controller;
    setLastUpload(asset);
    setUploading(true);
    setUploadProgress(0);
    try {
      await fileUploadApi.upload(
        asset,
        {
          folderId,
          scope: "general",
          subjectKey: uploadSubjectKey || undefined,
          gradeLevel: uploadGradeLevel || undefined,
          teacherVisible: uploadTeacherVisible,
          aiEnabled: uploadAiEnabled,
        },
        {
          signal: controller.signal,
          onUploadProgress: setUploadProgress,
        },
      );
      setLastUpload(null);
      await refresh();
    } catch (error) {
      if ((error as { code?: string }).code !== "ERR_CANCELED") {
        Alert.alert("Upload failed", toAppError(error).message);
      }
    } finally {
      uploadController.current = null;
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const chooseUpload = async () => {
    if (refuseOfflineWrite()) return;
    if (uploadPartitionMissing) {
      Alert.alert(
        "Choose subject and grade",
        "Set the governed upload classification before choosing a file.",
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      await startUpload({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      });
    } catch (error) {
      Alert.alert("File not selected", toAppError(error).message);
    }
  };

  const beginEdit = (file: UploadedLibraryFile) => {
    setSelected(file);
    setFileName(file.originalName);
    setEditFolderId(file.folderId ?? null);
    setEditScope(file.scope ?? "private");
    setEditSubjectKey(file.subjectKey ?? "");
    setEditGradeLevel(file.gradeLevel ?? "");
    setEditTeacherVisible(file.teacherVisible ?? true);
    setEditAiEnabled(file.aiEnabled ?? true);
  };

  const saveMetadata = async () => {
    if (!selected || !fileName.trim() || refuseOfflineWrite()) return;
    try {
      setBusy(true);
      await fileUploadApi.update(selected.id, {
        originalName: fileName.trim(),
        folderId: editFolderId,
        scope: editScope,
        subjectKey: editSubjectKey || null,
        gradeLevel: editGradeLevel || null,
        teacherVisible: editTeacherVisible,
        aiEnabled: editAiEnabled,
      });
      setSelected(null);
      await files.refetch();
    } catch (error) {
      Alert.alert("Metadata not saved", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const retryIndex = async (file: UploadedLibraryFile) => {
    if (refuseOfflineWrite()) return;
    try {
      await fileUploadApi.retryIndex(file.id);
      await files.refetch();
    } catch (error) {
      Alert.alert("Retry failed", toAppError(error).message);
    }
  };

  const deleteFile = (file: UploadedLibraryFile) => {
    if (refuseOfflineWrite()) return;
    Alert.alert("Delete library file?", file.originalName, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void fileUploadApi
            .delete(file.id)
            .then(refresh)
            .catch((error) =>
              Alert.alert("Delete rejected", toAppError(error).message),
            ),
      },
    ]);
  };

  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <AdminDataRow
            title={item.originalName}
            subtitle={`${item.scope ?? "private"} · ${item.subjectKey ?? "unclassified"} · ${item.gradeLevel ? `Grade ${item.gradeLevel}` : "all grades"}`}
            meta={`${Math.max(1, Math.round(item.sizeBytes / 1024))} KB · ${item.teacherVisible === false ? "admin only" : "teacher visible"} · AI ${item.aiEnabled === false ? "off" : "on"}${item.indexError ? ` · ${item.indexError}` : ""}`}
            status={item.indexStatus ?? "not indexed"}
            statusTone={
              item.indexStatus === "failed"
                ? "red"
                : item.indexStatus === "completed"
                  ? "green"
                  : "amber"
            }
          />
          <View
            style={{
              paddingHorizontal: 12,
              paddingBottom: 10,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <AdminButton
              label="Open"
              variant="text"
              onPress={() =>
                void fileUploadApi
                  .open(item.id, item.originalName)
                  .catch((error) =>
                    Alert.alert("Open failed", toAppError(error).message),
                  )
              }
            />
            <AdminButton
              label="Edit metadata"
              variant="text"
              onPress={() => beginEdit(item)}
            />
            {item.indexStatus === "failed" ? (
              <AdminButton
                label="Retry index"
                variant="text"
                tone="amber"
                disabled={isOffline}
                onPress={() => void retryIndex(item)}
              />
            ) : null}
            <AdminButton
              label="Delete"
              variant="text"
              tone="red"
              disabled={isOffline}
              onPress={() => deleteFile(item)}
            />
          </View>
        </View>
      )}
      header={
        <>
          <AdminListHeader
            title="Nexora Library"
            subtitle={`${storage.data?.totalFiles ?? rows.length} files · ${storage.data?.totalMB ?? 0} MB`}
            rightAction={
              <AdminButton
                label={uploading ? "Uploading…" : "Upload"}
                icon="upload"
                disabled={uploading || isOffline || uploadPartitionMissing}
                onPress={() => void chooseUpload()}
              />
            }
          />
          {isOffline ? (
            <AdminNotice
              title="Offline · cached library"
              description="Viewing remains available. Uploads, deletes, indexing retries, and metadata changes are disabled."
              tone="amber"
            />
          ) : null}

          <AdminSection
            title="Folders"
            subtitle="Browse shared folders or create a child inside the selected folder"
          >
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="All files"
                  active={!folderId}
                  onPress={() => {
                    setFolderId(undefined);
                    setFolderName("");
                  }}
                />
                {(folders.data ?? []).map((folder) => (
                  <AdminChip
                    key={folder.id}
                    label={folder.name}
                    active={folderId === folder.id}
                    onPress={() => {
                      setFolderId(folder.id);
                      setFolderName(folder.name);
                    }}
                  />
                ))}
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
              >
                <View style={{ flex: 1 }}>
                  <AdminField
                    label={folderId ? "New child folder" : "New folder"}
                    value={newFolder}
                    onChangeText={setNewFolder}
                    placeholder="Folder name"
                  />
                </View>
                <AdminButton
                  label="Create"
                  disabled={busy || isOffline || !newFolder.trim()}
                  onPress={() => void createFolder()}
                />
              </View>
              {selectedFolder ? (
                <View style={{ gap: 8 }}>
                  <AdminField
                    label="Selected folder name"
                    value={folderName}
                    onChangeText={setFolderName}
                  />
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <AdminButton
                      label="Rename folder"
                      disabled={busy || isOffline || !folderName.trim()}
                      onPress={() => void renameFolder()}
                    />
                    <AdminButton
                      label="Delete folder"
                      tone="red"
                      disabled={busy || isOffline}
                      onPress={deleteFolder}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </AdminSection>

          <AdminSection
            title="Search and filters"
            subtitle="Every filter is sent to the paginated file endpoint"
          >
            <View style={{ padding: 16, gap: 10 }}>
              <AdminField
                label="Search files"
                value={search}
                onChangeText={setSearch}
                placeholder="Filename or metadata"
              />
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Scope
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["all", "general", "private"] as ScopeFilter[]).map(
                  (scope) => (
                    <AdminChip
                      key={scope}
                      label={
                        scope === "all"
                          ? "Any scope"
                          : scope === "general"
                            ? "General"
                            : "Private"
                      }
                      active={scopeFilter === scope}
                      onPress={() => setScopeFilter(scope)}
                    />
                  ),
                )}
              </View>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Subject
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="Any subject"
                  active={!subjectFilter}
                  onPress={() => setSubjectFilter("")}
                />
                {LIBRARY_SUBJECTS.map((subject) => (
                  <AdminChip
                    key={subject.key}
                    label={subject.label}
                    active={subjectFilter === subject.key}
                    onPress={() => setSubjectFilter(subject.key)}
                  />
                ))}
              </View>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Grade
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="Any grade"
                  active={!gradeFilter}
                  onPress={() => setGradeFilter("")}
                />
                {LIBRARY_GRADES.map((grade) => (
                  <AdminChip
                    key={grade}
                    label={`Grade ${grade}`}
                    active={gradeFilter === grade}
                    onPress={() => setGradeFilter(grade)}
                  />
                ))}
              </View>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Index status
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {indexFilters.map((status) => (
                  <AdminChip
                    key={status.key}
                    label={status.label}
                    active={indexFilter === status.key}
                    onPress={() => setIndexFilter(status.key)}
                  />
                ))}
              </View>
            </View>
          </AdminSection>

          <AdminSection
            title="Upload defaults"
            subtitle="These governed metadata fields are attached before indexing starts"
          >
            <View style={{ padding: 16, gap: 10 }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Subject
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="Unclassified"
                  active={!uploadSubjectKey}
                  onPress={() => setUploadSubjectKey("")}
                />
                {LIBRARY_SUBJECTS.map((subject) => (
                  <AdminChip
                    key={subject.key}
                    label={subject.label}
                    active={uploadSubjectKey === subject.key}
                    onPress={() => setUploadSubjectKey(subject.key)}
                  />
                ))}
              </View>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                Grade
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="All grades"
                  active={!uploadGradeLevel}
                  onPress={() => setUploadGradeLevel("")}
                />
                {LIBRARY_GRADES.map((grade) => (
                  <AdminChip
                    key={grade}
                    label={`Grade ${grade}`}
                    active={uploadGradeLevel === grade}
                    onPress={() => setUploadGradeLevel(grade)}
                  />
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AdminChip
                  label="Teacher visible"
                  active={uploadTeacherVisible}
                  onPress={() => setUploadTeacherVisible((value) => !value)}
                />
                <AdminChip
                  label="AI enabled"
                  active={uploadAiEnabled}
                  onPress={() => setUploadAiEnabled((value) => !value)}
                />
              </View>
              {uploadPartitionMissing ? (
                <AdminNotice
                  title="Choose a subject and grade"
                  description="The backend requires both values for every General library file so retrieval and AI indexing cannot mix academic partitions."
                  tone="amber"
                />
              ) : null}
              {uploading ? (
                <AdminNotice
                  title={`Uploading ${lastUpload?.name ?? "file"}`}
                  description={`${Math.round((uploadProgress ?? 0) * 100)}% sent. Keep this screen open until the server confirms the file.`}
                  tone="amber"
                />
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {uploading ? (
                  <AdminButton
                    label="Cancel upload"
                    tone="red"
                    onPress={() => uploadController.current?.abort()}
                  />
                ) : null}
                {!uploading && lastUpload ? (
                  <AdminButton
                    label="Retry upload"
                    tone="amber"
                    disabled={isOffline}
                    onPress={() => void startUpload(lastUpload)}
                  />
                ) : null}
              </View>
            </View>
          </AdminSection>

          {selected ? (
            <AdminSection
              title="File metadata"
              subtitle="Rename, move, classify, and control visibility without changing file identity"
            >
              <View style={{ padding: 16, gap: 10 }}>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  Owner: {selected.teacher?.email ?? selected.teacherId}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  Class:{" "}
                  {selected.class?.subjectCode ??
                    selected.classId ??
                    "School library"}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  {selected.mimeType} · {selected.fileKind ?? "file"} · uploaded{" "}
                  {new Date(selected.uploadedAt).toLocaleString()}
                </Text>
                <Text selectable style={{ color: theme.muted, fontSize: 11 }}>
                  Content hash: {selected.contentHash ?? "Not recorded"}
                </Text>
                <AdminField
                  label="Filename"
                  value={fileName}
                  onChangeText={setFileName}
                />
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  Destination folder
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminChip
                    label="No folder"
                    active={!editFolderId}
                    onPress={() => setEditFolderId(null)}
                  />
                  {(folders.data ?? []).map((folder) => (
                    <AdminChip
                      key={folder.id}
                      label={folder.name}
                      active={editFolderId === folder.id}
                      onPress={() => {
                        setEditFolderId(folder.id);
                        setEditScope(folder.scope);
                      }}
                    />
                  ))}
                </View>
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  Scope
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <AdminChip
                    label="General"
                    active={editScope === "general"}
                    onPress={() => setEditScope("general")}
                  />
                  <AdminChip
                    label="Private"
                    active={editScope === "private"}
                    onPress={() => setEditScope("private")}
                  />
                </View>
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  Subject
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminChip
                    label="Unclassified"
                    active={!editSubjectKey}
                    onPress={() => setEditSubjectKey("")}
                  />
                  {LIBRARY_SUBJECTS.map((subject) => (
                    <AdminChip
                      key={subject.key}
                      label={subject.label}
                      active={editSubjectKey === subject.key}
                      onPress={() => setEditSubjectKey(subject.key)}
                    />
                  ))}
                </View>
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  Grade
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminChip
                    label="All grades"
                    active={!editGradeLevel}
                    onPress={() => setEditGradeLevel("")}
                  />
                  {LIBRARY_GRADES.map((grade) => (
                    <AdminChip
                      key={grade}
                      label={`Grade ${grade}`}
                      active={editGradeLevel === grade}
                      onPress={() => setEditGradeLevel(grade)}
                    />
                  ))}
                </View>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminChip
                    label="Teacher visible"
                    active={editTeacherVisible}
                    onPress={() => setEditTeacherVisible((value) => !value)}
                  />
                  <AdminChip
                    label="AI enabled"
                    active={editAiEnabled}
                    onPress={() => setEditAiEnabled((value) => !value)}
                  />
                </View>
                {editPartitionMissing ? (
                  <AdminNotice
                    title="Classification required"
                    description="General or AI-enabled files must keep both a subject and grade. Disable AI and use Private scope before clearing this classification."
                    tone="amber"
                  />
                ) : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <AdminButton
                    label="Cancel"
                    onPress={() => setSelected(null)}
                  />
                  <AdminButton
                    label="Save metadata"
                    tone="green"
                    disabled={
                      busy ||
                      isOffline ||
                      !fileName.trim() ||
                      editPartitionMissing
                    }
                    onPress={() => void saveMetadata()}
                  />
                </View>
              </View>
            </AdminSection>
          ) : null}
          {files.isError ? (
            <AdminNotice
              title="Library unavailable"
              description={toAppError(files.error).message}
              tone="red"
            />
          ) : null}
        </>
      }
      emptyTitle={
        debouncedSearch ||
        scopeFilter !== "all" ||
        subjectFilter ||
        gradeFilter ||
        indexFilter !== "all"
          ? "No matching files"
          : "No library files"
      }
      emptySubtitle="Upload a supported file or change the folder and server filters."
      error={files.isError ? toAppError(files.error).message : null}
      initialLoading={files.isPending}
      lastUpdatedAt={files.dataUpdatedAt}
      refreshing={files.isRefetching && !files.isFetchingNextPage}
      onRefresh={() => void refresh()}
      hasNextPage={files.hasNextPage}
      isFetchingNextPage={files.isFetchingNextPage}
      fetchNextPage={() => void files.fetchNextPage()}
    />
  );
}
