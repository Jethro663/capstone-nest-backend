import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  useTeacherAddSectionStudentsMutation,
  useTeacherSectionCandidates,
  useTeacherSectionDetail,
  useTeacherSectionRoster,
  useTeacherSectionSchedule,
} from "../api/hooks";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { formatStudentIdentityLine, formatStudentIdentityWithStatus } from "../utils/studentIdentity";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherSectionDetail">;

type Tab = "roster" | "schedule";

export function TeacherSectionDetailScreen({ navigation, route }: Props) {
  const { sectionId } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>("roster");
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const detailQuery = useTeacherSectionDetail(sectionId);
  const rosterQuery = useTeacherSectionRoster(sectionId);
  const candidateQuery = useMemo(
    () => ({
      search,
      gradeLevel: detailQuery.data?.gradeLevel,
      eligibility: "eligible" as const,
      prioritizeEligible: true,
      limit: 50,
    }),
    [detailQuery.data?.gradeLevel, search],
  );
  const candidatesQuery = useTeacherSectionCandidates(sectionId, candidateQuery);
  const addStudentsMutation = useTeacherAddSectionStudentsMutation(sectionId);
  const scheduleQuery = useTeacherSectionSchedule(sectionId);

  const topError = detailQuery.error || rosterQuery.error || scheduleQuery.error;

  return (
    <TeacherScreen
      title={detailQuery.data ? detailQuery.data.name : "Section detail"}
      subtitle={
        detailQuery.data
          ? `Grade ${detailQuery.data.gradeLevel} · ${detailQuery.data.schoolYear} · Room ${detailQuery.data.roomNumber || "TBA"}`
          : "Teacher section detail view"
      }
      icon="google-classroom"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.redSoft,
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={
        detailQuery.isRefetching ||
        rosterQuery.isRefetching ||
        scheduleQuery.isRefetching ||
        candidatesQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          detailQuery.refetch(),
          rosterQuery.refetch(),
          scheduleQuery.refetch(),
          candidatesQuery.refetch(),
        ]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Roster", value: rosterQuery.data?.length ?? 0, tone: "red" },
          { label: "Classes", value: scheduleQuery.data?.classes?.length ?? 0, tone: "blue" },
          { label: "Room", value: detailQuery.data?.roomNumber || "TBA", tone: "amber" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TeacherChip label="Roster" active={activeTab === "roster"} onPress={() => setActiveTab("roster")} />
        <TeacherChip label="Schedule" active={activeTab === "schedule"} onPress={() => setActiveTab("schedule")} />
      </View>

      {topError ? (
        <TeacherPanel title="Unable to load section" subtitle={toAppError(topError).message}>
          <TeacherEmpty title="Section details unavailable" subtitle="Pull to refresh after backend is available." />
        </TeacherPanel>
      ) : null}

      {activeTab === "roster" ? (
        <TeacherPanel
          title="Student roster"
          subtitle="Students enrolled in this advisory section."
          action={
            <TeacherActionButton
              label="Add students"
              icon="account-plus-outline"
              tone="blue"
              onPress={() => navigation.navigate("TeacherSectionAddStudents", { sectionId })}
            />
          }
        >
          {showAddStudents ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <View
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.muted }}>
                  Only students matching Grade {detailQuery.data?.gradeLevel || "N/A"} and this section can be added.
                </Text>
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search candidates"
                placeholderTextColor={theme.dim}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  fontSize: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 10,
                }}
              />
              {(candidatesQuery.data ?? [])
                .filter((candidate) => !detailQuery.data?.gradeLevel || candidate.gradeLevel === detailQuery.data.gradeLevel)
                .slice(0, 15)
                .map((candidate) => {
                const fullName =
                  [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").trim() ||
                  candidate.email ||
                  "Student";
                const disabledReason = candidate.eligibilityReason || "";
                const eligible = candidate.isEligible ?? !disabledReason;
                const selected = selectedCandidateIds.includes(candidate.id);
                return (
                  <TeacherRow
                    key={`candidate-${candidate.id}`}
                    title={fullName}
                    subtitle={
                      eligible
                        ? formatStudentIdentityWithStatus(candidate, "Eligible")
                        : formatStudentIdentityWithStatus(candidate, disabledReason || "Unavailable")
                    }
                    right={
                      <Pressable
                        disabled={!eligible || addStudentsMutation.isPending}
                        onPress={() => {
                          if (!eligible) {
                            Alert.alert("Cannot add student", disabledReason || "Student is not eligible for this section.");
                            return;
                          }
                          setSelectedCandidateIds((current) =>
                            current.includes(candidate.id)
                              ? current.filter((id) => id !== candidate.id)
                              : [...current, candidate.id],
                          );
                        }}
                        style={{
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          backgroundColor: selected ? theme.greenSoft : theme.blueSoft,
                          opacity: !eligible || addStudentsMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: selected ? theme.green : theme.blue,
                          }}
                        >
                          {selected ? "Selected" : "Select"}
                        </Text>
                      </Pressable>
                    }
                  />
                );
              })}
              {selectedCandidateIds.length ? (
                <View style={{ marginTop: 10 }}>
                  <TeacherActionButton
                    label={addStudentsMutation.isPending ? "Adding..." : `Add ${selectedCandidateIds.length} student(s)`}
                    icon="account-multiple-plus-outline"
                    tone="green"
                    disabled={addStudentsMutation.isPending}
                    onPress={() => {
                      void (async () => {
                        try {
                          const visibleEligibleIds = new Set(
                            (candidatesQuery.data ?? [])
                              .filter(
                                (candidate) =>
                                  candidate.isEligible !== false &&
                                  (!detailQuery.data?.gradeLevel || candidate.gradeLevel === detailQuery.data.gradeLevel),
                              )
                              .map((candidate) => candidate.id),
                          );
                          await addStudentsMutation.mutateAsync(
                            selectedCandidateIds.filter((id) => visibleEligibleIds.has(id)),
                          );
                          setSelectedCandidateIds([]);
                          Alert.alert("Students added", "Selected students were added to this section.");
                        } catch (error) {
                          Alert.alert("Unable to add students", toAppError(error).message);
                        }
                      })();
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {rosterQuery.data?.length ? (
            rosterQuery.data.map((student) => {
              const name = [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || student.email || "Student";
              return (
                <TeacherRow
                  key={student.id}
                  title={name}
                  subtitle={formatStudentIdentityLine(student, "No profile details")}
                  onPress={() => navigation.navigate("TeacherSectionStudentProfile", { sectionId, studentId: student.studentId || student.id })}
                  right={
                    <TeacherActionButton
                      label="Remove"
                      tone="neutral"
                      onPress={() => {
                        void sectionsApi
                          .removeStudent(sectionId, student.studentId || student.id)
                          .then(() => rosterQuery.refetch())
                          .catch((error) => Alert.alert("Unable to remove student", toAppError(error).message));
                      }}
                    />
                  }
                />
              );
            })
          ) : (
            <TeacherEmpty title="No students yet" subtitle="Students added to this section will appear here." icon="account-group-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "schedule" ? (
        <TeacherPanel title="Section class schedule" subtitle="Subjects assigned to this section and their meeting slots.">
          {scheduleQuery.data?.classes?.length ? (
            scheduleQuery.data.classes.map((entry) => (
              <TeacherRow
                key={entry.classId}
                title={`${entry.subjectCode} · ${entry.subjectName}`}
                subtitle={
                  entry.schedules?.length
                    ? entry.schedules.map((slot) => `${slot.days.join(", ")} ${slot.startTime}-${slot.endTime}`).join(" • ")
                    : `Room ${entry.room || "TBA"} · No schedule slots`
                }
              />
            ))
          ) : (
            <TeacherEmpty title="No class schedules" subtitle="Classes assigned to this section will appear here." icon="calendar-blank-outline" />
          )}
        </TeacherPanel>
      ) : null}
    </TeacherScreen>
  );
}
