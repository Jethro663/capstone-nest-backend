import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { modulesApi } from "../api/services/modules";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
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

export function TeacherLibraryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];
  const moduleQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.classModules(classId),
      queryFn: () => modulesApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const records = useMemo(
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

  const filtered = useMemo(() => {
    return records.filter((record) => {
      if (selectedClassId !== "all" && record.classId !== selectedClassId) return false;
      if (!search.trim()) return true;
      const haystack = `${record.title} ${record.description || ""} ${record.classLabel}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [records, search, selectedClassId]);

  const selectedClass =
    selectedClassId === "all"
      ? undefined
      : classesQuery.data?.find((entry) => entry.id === selectedClassId);

  return (
    <TeacherScreen
      title="Nexora Library"
      subtitle="Cross-class content modules with direct creation and class workspace actions."
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
          { label: "Modules", value: filtered.length, tone: "red" },
          { label: "Classes", value: classesQuery.data?.length ?? 0, tone: "blue" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search modules or class" />

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
            : "Choose a class chip to unlock class-specific actions."
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Create module"
            icon="plus-box-outline"
            tone="green"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherCreateModule", { classId: selectedClass.id });
            }}
          />
          <TeacherActionButton
            label="Class modules"
            icon="book-open-page-variant-outline"
            tone="blue"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherClassDetail", { classId: selectedClass.id, initialTab: "modules" });
            }}
          />
          <TeacherActionButton
            label="Assessments"
            icon="clipboard-text-outline"
            tone="purple"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherClassDetail", { classId: selectedClass.id, initialTab: "assessments" });
            }}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Module library" subtitle="Tap a module to open its teacher module workspace.">
        {filtered.length ? (
          filtered.map((module) => (
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
    </TeacherScreen>
  );
}
