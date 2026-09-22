import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppAlert as Alert } from "../components/ui/AppAlert";
import {
  useTeacherSectionDetail,
  useTeacherSectionRoster,
  useTeacherSectionSchedule,
} from "../api/hooks";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { formatStudentIdentityLine } from "../utils/studentIdentity";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherSegmentedTabs,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherSectionDetail">;

type Tab = "roster" | "schedule";

export function TeacherSectionDetailScreen({ navigation, route }: Props) {
  const { sectionId } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>("roster");
  const [search, setSearch] = useState("");
  const detailQuery = useTeacherSectionDetail(sectionId);
  const rosterQuery = useTeacherSectionRoster(sectionId);
  const scheduleQuery = useTeacherSectionSchedule(sectionId);
  const topError = detailQuery.error || rosterQuery.error || scheduleQuery.error;
  const normalizedSearch = search.trim().toLowerCase();

  const visibleRoster = useMemo(
    () =>
      (rosterQuery.data ?? []).filter((student) => {
        if (!normalizedSearch) return true;
        return [
          student.firstName,
          student.lastName,
          student.email,
          student.studentId,
          student.lrn,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [normalizedSearch, rosterQuery.data],
  );

  const visibleSchedule = useMemo(
    () =>
      (scheduleQuery.data?.classes ?? []).filter((entry) => {
        if (!normalizedSearch) return true;
        return [
          entry.subjectCode,
          entry.subjectName,
          entry.room,
          ...entry.schedules.flatMap((slot) => [
            slot.days.join(" "),
            slot.startTime,
            slot.endTime,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [normalizedSearch, scheduleQuery.data?.classes],
  );

  return (
    <TeacherScreen
      title="Section"
      subtitle="Review the roster or meeting schedule without losing context."
      icon="google-classroom"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={
        detailQuery.isRefetching ||
        rosterQuery.isRefetching ||
        scheduleQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          detailQuery.refetch(),
          rosterQuery.refetch(),
          scheduleQuery.refetch(),
        ]);
      }}
    >
      <TeacherContextStrip
        title={detailQuery.data?.name || "Section detail"}
        subtitle={
          detailQuery.data
            ? "Grade " +
              detailQuery.data.gradeLevel +
              " · " +
              detailQuery.data.schoolYear +
              " · Room " +
              (detailQuery.data.roomNumber || "TBA")
            : "Loading section context"
        }
        status={(rosterQuery.data?.length ?? 0) + " learners"}
        icon="account-group-outline"
      />
      <TeacherSegmentedTabs
        accessibilityLabel="Section views"
        activeKey={activeTab}
        onSelect={(tab) => {
          setActiveTab(tab);
          setSearch("");
        }}
        items={[
          { key: "roster", label: "Roster", count: rosterQuery.data?.length ?? 0 },
          { key: "schedule", label: "Schedule", count: scheduleQuery.data?.classes?.length ?? 0 },
        ]}
      />
      <TeacherSearch
        value={search}
        onChangeText={setSearch}
        placeholder={
          activeTab === "roster"
            ? "Search learner name, email, ID, or LRN"
            : "Search subject, room, day, or time"
        }
      />

      {topError ? (
        <TeacherFlatSection
          title="Unable to load section"
          subtitle={toAppError(topError).message}
        >
          <TeacherEmpty
            title="Section details unavailable"
            subtitle="Pull to refresh after the backend is available."
          />
        </TeacherFlatSection>
      ) : null}

      {activeTab === "roster" ? (
        <TeacherFlatSection
          title="Student roster"
          subtitle={visibleRoster.length + " learner" + (visibleRoster.length === 1 ? "" : "s") + " shown"}
          action={
            <TeacherActionButton
              label="Add students"
              icon="account-plus-outline"
              tone="blue"
              onPress={() =>
                navigation.navigate("TeacherSectionAddStudents", { sectionId })
              }
            />
          }
        >
          {visibleRoster.length ? (
            visibleRoster.map((student) => {
              const name =
                [student.firstName, student.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                student.email ||
                "Student";
              return (
                <TeacherRow
                  key={student.id}
                  title={name}
                  subtitle={formatStudentIdentityLine(
                    student,
                    "No profile details",
                  )}
                  onPress={() =>
                    navigation.navigate("TeacherSectionStudentProfile", {
                      sectionId,
                      studentId: student.studentId || student.id,
                    })
                  }
                  right={
                    <TeacherActionButton
                      label="Remove"
                      tone="neutral"
                      onPress={() => {
                        void sectionsApi
                          .removeStudent(
                            sectionId,
                            student.studentId || student.id,
                          )
                          .then(() => rosterQuery.refetch())
                          .catch((error) =>
                            Alert.alert(
                              "Unable to remove student",
                              toAppError(error).message,
                            ),
                          );
                      }}
                    />
                  }
                />
              );
            })
          ) : (
            <TeacherEmpty
              title={search ? "No learners match this search" : "No students yet"}
              subtitle={
                search
                  ? "Try a different name, email, ID, or LRN."
                  : "Students added to this section will appear here."
              }
              icon="account-group-outline"
            />
          )}
        </TeacherFlatSection>
      ) : (
        <TeacherFlatSection
          title="Section class schedule"
          subtitle={visibleSchedule.length + " class" + (visibleSchedule.length === 1 ? "" : "es") + " shown"}
        >
          {visibleSchedule.length ? (
            visibleSchedule.map((entry) => (
              <TeacherRow
                key={entry.classId}
                title={entry.subjectCode + " · " + entry.subjectName}
                subtitle={
                  entry.schedules?.length
                    ? entry.schedules
                        .map(
                          (slot) =>
                            slot.days.join(", ") +
                            " " +
                            slot.startTime +
                            "-" +
                            slot.endTime +
                            (entry.room ? " · Room " + entry.room : ""),
                        )
                        .join(" • ")
                    : "Room " + (entry.room || "TBA") + " · No schedule slots"
                }
              />
            ))
          ) : (
            <TeacherEmpty
              title={search ? "No schedules match this search" : "No class schedules"}
              subtitle={
                search
                  ? "Try another subject, room, day, or time."
                  : "Classes assigned to this section will appear here."
              }
              icon="calendar-blank-outline"
            />
          )}
        </TeacherFlatSection>
      )}
    </TeacherScreen>
  );
}
