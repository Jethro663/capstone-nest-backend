import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import {
  useTeacherClasses,
  useTeacherInterventionsHistory,
  useTeacherInterventionsQueue,
  useTeacherPendingInterventions,
} from "../api/hooks";
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

type Props = NativeStackScreenProps<RootStackParamList, "TeacherInterventions">;
type FeedMode = "queue" | "history";

function asScore(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

export function TeacherInterventionsScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>(route.params?.classId || "");
  const [mode, setMode] = useState<FeedMode>("queue");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedClassId && classesQuery.data?.length) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  useEffect(() => {
    if (route.params?.classId && route.params.classId !== selectedClassId) {
      setSelectedClassId(route.params.classId);
    }
  }, [route.params?.classId, selectedClassId]);

  const queueQuery = useTeacherInterventionsQueue(selectedClassId || undefined);
  const historyQuery = useTeacherInterventionsHistory(selectedClassId || undefined);
  const pendingQuery = useTeacherPendingInterventions();

  const queueItems = queueQuery.data?.queue ?? [];
  const historyItems = historyQuery.data?.queue ?? [];
  const selectedClass = useMemo(
    () => classesQuery.data?.find((entry) => entry.id === selectedClassId),
    [classesQuery.data, selectedClassId],
  );

  const visibleItems = useMemo(() => {
    const source = mode === "queue" ? queueItems : historyItems;
    if (!search.trim()) return source;
    const query = search.trim().toLowerCase();
    return source.filter((entry) => {
      const text = `${entry.studentName || ""} ${entry.status || ""} ${entry.className || ""}`.toLowerCase();
      return text.includes(query);
    });
  }, [historyItems, mode, queueItems, search]);

  const isRefreshing =
    classesQuery.isRefetching ||
    queueQuery.isRefetching ||
    historyQuery.isRefetching ||
    pendingQuery.isRefetching;

  return (
    <TeacherScreen
      title="Interventions"
      subtitle="Monitor active intervention queue, history, and class-level support status using live LXP endpoints."
      icon="account-alert-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={isRefreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          queueQuery.refetch(),
          historyQuery.refetch(),
          pendingQuery.refetch(),
        ]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Pending", value: pendingQuery.data?.pendingCount ?? 0, tone: "amber" },
          { label: "Queue", value: queueItems.length, tone: "red" },
          { label: "History", value: historyItems.length, tone: "blue" },
          { label: "Shown", value: visibleItems.length, tone: "green" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(classesQuery.data ?? []).map((classItem) => (
          <TeacherChip
            key={classItem.id}
            label={classItem.subjectCode}
            active={selectedClassId === classItem.id}
            onPress={() => setSelectedClassId(classItem.id)}
          />
        ))}
      </View>

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search student or status" />

      <TeacherPanel
        title="Intervention actions"
        subtitle={selectedClass ? `${selectedClass.subjectCode} | ${selectedClass.subjectName}` : "Select a class"}
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherChip label="Queue" active={mode === "queue"} onPress={() => setMode("queue")} />
          <TeacherChip label="History" active={mode === "history"} onPress={() => setMode("history")} />
        </View>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Open performance"
            icon="chart-line"
            tone="blue"
            onPress={() => navigation.navigate("TeacherPerformance")}
          />
          <TeacherActionButton
            label="Open class students"
            icon="account-group-outline"
            tone="purple"
            disabled={!selectedClass}
            onPress={() => {
              if (!selectedClass) return;
              navigation.navigate("TeacherClassDetail", { classId: selectedClass.id, initialTab: "students" });
            }}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel
        title={mode === "queue" ? "Active queue" : "Intervention history"}
        subtitle={mode === "queue" ? "Current intervention cases requiring support." : "Resolved or closed intervention cases."}
      >
        {visibleItems.length ? (
          visibleItems.map((entry, index) => {
            const statusText = String(entry.status || (mode === "queue" ? "pending" : "resolved"));
            const badgeColor = mode === "queue" ? teacherTheme.amber : teacherTheme.green;
            return (
              <TeacherRow
                key={`${entry.caseId || entry.id || mode}-${index}`}
                title={entry.studentName || "Student"}
                subtitle={`Status: ${statusText} | Trigger: ${asScore(entry.triggerScore)} | Threshold: ${asScore(entry.thresholdApplied)} | ${mode === "history" ? `Closed: ${entry.closedAt || "N/A"}` : "Awaiting action"}`}
                onPress={() => navigation.navigate("TeacherPerformance")}
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
                    <Text style={{ fontSize: 10, fontWeight: "700", color: badgeColor }}>
                      {statusText.toUpperCase()}
                    </Text>
                  </View>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title={mode === "queue" ? "No active interventions" : "No intervention history"}
            subtitle={
              mode === "queue"
                ? "No open intervention cases for this class right now."
                : "Resolved interventions will appear here once cases are closed."
            }
            icon={mode === "queue" ? "check-decagram-outline" : "history"}
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
