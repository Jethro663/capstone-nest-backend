import { useMemo, useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Text, View } from "react-native";
import { queryKeys, useActiveTransmutationTable, useClassRecordPreviewGrades, useClassRecordSpreadsheet, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { classRecordApi } from "../api/services/class-record";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";
import { MobileClassRecordWorkbook } from "../components/teacher/MobileClassRecordWorkbook";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherClassRecord">;
type StatusFilter = "all" | "draft" | "finalized" | "locked";

function isFinalized(status?: string) {
  return String(status || "").toLowerCase() === "finalized";
}

export function TeacherClassRecordScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const activeTableQuery = useActiveTransmutationTable();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">("Q1");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const queryClient = useQueryClient();

  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];
  const recordQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.teacherClassRecords(classId),
      queryFn: () => classRecordApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const selectedClass =
    selectedClassId === "all"
      ? undefined
      : classesQuery.data?.find((entry) => entry.id === selectedClassId);

  const records = useMemo(
    () =>
      recordQueries.flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!query.data || !classItem) return [];
        return query.data.map((record) => ({
          ...record,
          classLabel: `${classItem.subjectCode} | ${classItem.subjectName}`,
          classItem,
        }));
      }),
    [classesQuery.data, recordQueries],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (selectedClassId !== "all" && record.classId !== selectedClassId) return false;
      if (statusFilter === "all") return true;
      return String(record.status || "").toLowerCase() === statusFilter;
    });
  }, [records, selectedClassId, statusFilter]);

  const selectedRecord = filteredRecords.find((entry) => entry.id === selectedRecordId) || filteredRecords[0];
  const previewQuery = useClassRecordPreviewGrades(selectedRecord?.id);
  const spreadsheetQuery = useClassRecordSpreadsheet(selectedRecord?.id);

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedClass) {
        throw new Error("Select a class first.");
      }
      return classRecordApi.generate({ classId: selectedClass.id, gradingPeriod: selectedQuarter });
    },
    onSuccess: async (record) => {
      setSelectedRecordId(record.id);
      await queryClient.invalidateQueries({ queryKey: ["class-records"] });
      await Promise.all(recordQueries.map((query) => query.refetch()));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (recordId: string) => classRecordApi.finalize(recordId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-records"] });
      await previewQuery.refetch();
      await Promise.all(recordQueries.map((query) => query.refetch()));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (recordId: string) => classRecordApi.reopen(recordId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-records"] });
      await previewQuery.refetch();
      await Promise.all(recordQueries.map((query) => query.refetch()));
    },
  });

  const finalizedCount = records.filter((record) => isFinalized(record.status)).length;

  const isRefreshing =
    classesQuery.isRefetching ||
    recordQueries.some((query) => query.isRefetching) ||
    spreadsheetQuery.isRefetching ||
    previewQuery.isRefetching;

  const recordActionBusy =
    generateMutation.isPending || finalizeMutation.isPending || reopenMutation.isPending;

  return (
    <TeacherScreen
      title="Class Record"
      subtitle="Create, finalize, reopen, and preview grading records with the same backend workflows used on web."
      icon="clipboard-list-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={isRefreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          ...recordQueries.map((query) => query.refetch()),
          spreadsheetQuery.refetch(),
          previewQuery.refetch(),
        ]);
      }}
    >
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: "#fff1f2",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#fecdd3",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#9f1239" }}>
          Transmutation Standard:
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "800", color: "#be123c", flex: 1 }} numberOfLines={1}>
          {activeTableQuery.data?.title || "DepEd Order No. 8 s. 2015 Transmutation Table"}
        </Text>
      </View>

      <TeacherStats
        items={[
          { label: "Records", value: records.length, tone: "red" },
          { label: "Finalized", value: finalizedCount, tone: "green" },
          { label: "Filtered", value: filteredRecords.length, tone: "blue" },
        ]}
      />

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

      <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["all", "draft", "finalized", "locked"] as StatusFilter[]).map((entry) => (
          <TeacherChip
            key={entry}
            label={entry === "all" ? "All statuses" : entry}
            active={statusFilter === entry}
            onPress={() => setStatusFilter(entry)}
          />
        ))}
      </View>

      <TeacherPanel
        title="Record actions"
        subtitle={
          selectedClass
            ? `${selectedClass.subjectCode} | ${selectedClass.subjectName}`
            : "Choose a class to enable class-specific record actions."
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {classRecordApi.listQuarters().map((quarter) => (
            <TeacherChip
              key={quarter}
              label={quarter}
              active={selectedQuarter === quarter}
              onPress={() => setSelectedQuarter(quarter)}
            />
          ))}
        </View>

        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Create record"
            icon="plus-box-outline"
            tone="green"
            disabled={!selectedClass || recordActionBusy}
            onPress={() => {
              void generateMutation.mutateAsync().catch((error) => {
                Alert.alert("Unable to create record", toAppError(error).message);
              });
            }}
          />
          <TeacherActionButton
            label="Finalize selected"
            icon="check-circle-outline"
            tone="blue"
            disabled={!selectedRecord || isFinalized(selectedRecord.status) || recordActionBusy}
            onPress={() => {
              if (!selectedRecord) return;
              void finalizeMutation.mutateAsync(selectedRecord.id).catch((error) => {
                Alert.alert("Unable to finalize record", toAppError(error).message);
              });
            }}
          />
          <TeacherActionButton
            label="Reopen selected"
            icon="lock-open-variant-outline"
            tone="amber"
            disabled={!selectedRecord || !isFinalized(selectedRecord.status) || recordActionBusy}
            onPress={() => {
              if (!selectedRecord) return;
              void reopenMutation.mutateAsync(selectedRecord.id).catch((error) => {
                Alert.alert("Unable to reopen record", toAppError(error).message);
              });
            }}
          />
          <TeacherActionButton
            label="Open class"
            icon="book-open-variant"
            tone="purple"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherClassDetail", {
                classId: selectedClass.id,
                initialTab: "classRecord",
              });
            }}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Record list" subtitle="Tap any row to inspect its grade preview panel below.">
        {filteredRecords.length ? (
          filteredRecords.map((record) => {
            const normalizedStatus = String(record.status || "draft").toLowerCase();
            const statusTone =
              normalizedStatus === "finalized"
                ? teacherTheme.green
                : normalizedStatus === "locked"
                  ? teacherTheme.amber
                  : teacherTheme.red;

            return (
              <TeacherRow
                key={record.id}
                title={record.classLabel || "Class record"}
                subtitle={`${record.gradingPeriod || "N/A"} | ${record.status || "draft"}`}
                onPress={() => setSelectedRecordId(record.id)}
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
                    <Text style={{ fontSize: 10, fontWeight: "700", color: statusTone }}>
                      {(record.status || "draft").toUpperCase()}
                    </Text>
                  </View>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title="No class records yet"
            subtitle="Create a record for a grading period, then review and finalize it here."
            icon="clipboard-text-search-outline"
          />
        )}
      </TeacherPanel>

      {selectedRecord ? (
        <MobileClassRecordWorkbook workbook={spreadsheetQuery.data} />
      ) : null}

      <TeacherPanel
        title="Grade preview"
        subtitle={
          selectedRecord
            ? `Previewing ${selectedRecord.classLabel || "class"} | ${selectedRecord.gradingPeriod || "N/A"}`
            : "Pick a record to show computed final grades."
        }
      >
        {selectedRecord ? (
          previewQuery.data?.length ? (
            previewQuery.data.slice(0, 8).map((entry) => {
              const studentName =
                `${entry.student?.firstName || ""} ${entry.student?.lastName || ""}`.trim() || entry.studentId;
              return (
                <TeacherRow
                  key={`${selectedRecord.id}-${entry.studentId}`}
                  title={studentName}
                  subtitle={`Initial: ${entry.finalPercentage.toFixed(2)} | Transmuted: ${entry.quarterlyGrade.toFixed(0)} | ${entry.remarks}`}
                />
              );
            })
          ) : (
            <TeacherEmpty
              title="No preview rows yet"
              subtitle="Enter scores for this record and pull to refresh to see transmuted final grades."
              icon="calculator-variant-outline"
            />
          )
        ) : (
          <TeacherEmpty
            title="Select a record first"
            subtitle="Tap a record above to preview final grades and intervention remarks."
            icon="cursor-default-click-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
