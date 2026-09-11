import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AdminStudentReadiness"
>;
type Grade = "all" | "7" | "8" | "9" | "10";

export function AdminStudentReadinessScreen({ navigation }: Props) {
  const [schoolYear, setSchoolYear] = useState("");
  const [gradeLevel, setGradeLevel] = useState<Grade>("all");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const sections = useQuery({
    queryKey: ["admin-readiness-sections", schoolYear, gradeLevel],
    queryFn: () =>
      sectionsApi.getPage({
        page: 1,
        limit: 100,
        isActive: true,
        schoolYear: schoolYear || undefined,
        gradeLevel: gradeLevel === "all" ? undefined : gradeLevel,
      }),
  });
  const effectiveSectionId = sectionId || sections.data?.data[0]?.id || "";
  const overview = useQuery({
    queryKey: [
      "admin-student-academic-readiness",
      effectiveSectionId,
      debouncedSearch,
    ],
    queryFn: () =>
      sectionsApi.getAccessStudentsOverview({
        sectionId: effectiveSectionId,
        search: debouncedSearch || undefined,
      }),
    enabled: Boolean(effectiveSectionId),
  });
  const selected = useMemo(
    () =>
      overview.data?.data
        .flatMap((bucket) => bucket.sections)
        .find((section) => section.id === effectiveSectionId),
    [effectiveSectionId, overview.data?.data],
  );
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          (sections.data?.data ?? []).map((section) => section.schoolYear),
        ),
      ).sort((left, right) => right.localeCompare(left)),
    [sections.data?.data],
  );

  return (
    <AdminScreen
      title="Student academic readiness"
      subtitle="Verified period, annual, remediation, and blocker evidence"
      showBackButton
      onBackPress={navigation.goBack}
      refreshing={sections.isRefetching || overview.isRefetching}
      onRefresh={() => {
        void sections.refetch();
        void overview.refetch();
      }}
      rightAction={
        <AdminButton
          label="Academic controls"
          onPress={() =>
            navigation.navigate("MainTabs", { screen: "AdminSettings" })
          }
        />
      }
    >
      <AdminNotice
        title="Outcomes remain transition-owned"
        description="This workspace reviews evidence only. Promotion, retention, and Grade 10 completion are applied by the verified school-year transition."
      />
      <AdminSection
        title="Section filters"
        subtitle="The learner evidence request is bounded to one selected section"
      >
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
            School year
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AdminChip
              label="Any year"
              active={!schoolYear}
              onPress={() => {
                setSchoolYear("");
                setSectionId("");
              }}
            />
            {years.map((year) => (
              <AdminChip
                key={year}
                label={year}
                active={schoolYear === year}
                onPress={() => {
                  setSchoolYear(year);
                  setSectionId("");
                }}
              />
            ))}
          </View>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Grade</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["all", "7", "8", "9", "10"] as Grade[]).map((grade) => (
              <AdminChip
                key={grade}
                label={grade === "all" ? "Any grade" : `Grade ${grade}`}
                active={gradeLevel === grade}
                onPress={() => {
                  setGradeLevel(grade);
                  setSectionId("");
                }}
              />
            ))}
          </View>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Section</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(sections.data?.data ?? []).map((section) => (
              <AdminChip
                key={section.id}
                label={`Grade ${section.gradeLevel} · ${section.name}`}
                active={effectiveSectionId === section.id}
                onPress={() => setSectionId(section.id)}
              />
            ))}
          </View>
          <AdminField
            label="Search selected section"
            value={search}
            onChangeText={setSearch}
            placeholder="Learner name, email, or LRN"
          />
        </View>
      </AdminSection>

      {sections.isError || overview.isError ? (
        <AdminNotice
          title="Readiness refresh failed"
          description={toAppError(sections.error ?? overview.error).message}
          tone="red"
        />
      ) : null}
      {selected ? (
        <>
          <AdminSection
            title={`Grade ${selected.gradeLevel} · ${selected.name}`}
            subtitle={`${selected.schoolYear} · ${selected.studentCount} learners · ${selected.finalizedClassRecordCount}/${selected.classRecordCount} class records finalized`}
          >
            {(selected.students ?? []).map((student) => {
              const workbookBlocker = student.blockers.find(
                (blocker) => blocker.classId,
              );
              return (
                <View
                  key={student.id}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <AdminDataRow
                    title={
                      [student.lastName, student.firstName]
                        .filter(Boolean)
                        .join(", ") || student.email
                    }
                    subtitle={student.lrn ?? student.email}
                    meta={`${student.finalizationLabel} · ${student.finalizedClassRecordCount}/${student.requiredClassRecordCount} required records`}
                    status={student.outcome.replace(/_/g, " ")}
                    statusTone={
                      student.isFailing
                        ? "red"
                        : student.isPassing
                          ? "green"
                          : "amber"
                    }
                  />
                  {student.blockers.length ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                      <Text
                        selectable
                        style={{
                          color: theme.subtext,
                          fontSize: 12,
                          lineHeight: 18,
                        }}
                      >
                        {student.blockers
                          .map((blocker) => blocker.message)
                          .join("\n")}
                      </Text>
                      {workbookBlocker?.classId ? (
                        <AdminButton
                          label="Open blocking class record"
                          variant="text"
                          onPress={() =>
                            navigation.navigate("TeacherClassDetail", {
                              classId: workbookBlocker.classId!,
                              initialTab: "classRecord",
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {!selected.students.length ? (
              <AdminEmpty
                title="No matching learners"
                subtitle="Clear the search or choose another section."
              />
            ) : null}
          </AdminSection>
        </>
      ) : !sections.isPending && !overview.isPending ? (
        <AdminEmpty
          title="No matching section"
          subtitle="Change the school year or grade filters."
        />
      ) : null}
    </AdminScreen>
  );
}
