import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
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
      await fileUploadApi.upload(
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
        },
        {
          classId: selectedClassId !== "all" ? selectedClassId : undefined,
          scope: scopeFilter !== "all" ? scopeFilter : "general",
        },
      );

      Alert.alert("File Uploaded", `"${asset.name}" has been added to your Nexora Library.`);
      await queryClient.invalidateQueries({ queryKey: ["library-files"] });
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
        void Promise.all([classesQuery.refetch(), ...moduleQueries.map((query) => query.refetch())]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Modules", value: moduleRecords.length, tone: "red" },
          { label: "Classes", value: classesQuery.data?.length ?? 0, tone: "blue" },
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
          <TeacherEmpty title="Nexora File Asset Bank" subtitle="Tap 'Upload File Asset' above to upload PDFs, PPTs, or Docs directly to your Nexora Library." icon="cloud-upload-outline" />
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
