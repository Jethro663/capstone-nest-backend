import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { classesApi } from "../api/services/classes";
import { assessmentsApi } from "../api/services/assessments";
import type { MainTabParamList } from "../navigation/types";
import {
  AdminButton,
  AdminDataRow,
  AdminEmpty,
  AdminFilterBar,
  AdminMetricStrip,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;
type AssessmentFilter = "all" | "published" | "draft";

export function AdminAssessmentsScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const classes = useQuery({
    queryKey: ["admin-assessment-classes"],
    queryFn: () => classesApi.getAll(),
  });
  const queries = useQueries({
    queries: (classes.data ?? []).map((entry) => ({
      queryKey: ["admin-assessments", entry.id],
      queryFn: () => assessmentsApi.getByClass(entry.id),
      enabled: Boolean(classes.data),
    })),
  });
  const records = useMemo(
    () => queries.flatMap((query, index) =>
      (query.data ?? []).map((assessment) => ({ assessment, classItem: classes.data?.[index] }))),
    [classes.data, queries],
  );
  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return records.filter(({ assessment, classItem }) => {
      const matchesSearch = !needle || `${assessment.title} ${assessment.type} ${classItem?.subjectCode ?? ""} ${classItem?.subjectName ?? ""}`.toLowerCase().includes(needle);
      const matchesStatus = filter === "all" || (filter === "published" ? assessment.isPublished : !assessment.isPublished);
      return matchesSearch && matchesStatus;
    });
  }, [filter, records, search]);
  const published = records.filter(({ assessment }) => assessment.isPublished).length;
  const refreshing = classes.isRefetching || queries.some((query) => query.isRefetching);
  const hasFilters = Boolean(search.trim()) || filter !== "all";
  const clearFilters = () => { setSearch(""); setFilter("all"); };
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };

  return (
    <AdminScreen
      title="Assessments"
      subtitle="Cross-class assessment inventory"
      refreshing={refreshing}
      onRefresh={() => void Promise.all([classes.refetch(), ...queries.map((query) => query.refetch())])}
    >
      <AdminMetricStrip items={[
        { label: "Classes", value: classes.data?.length ?? 0 },
        { label: "Assessments", value: records.length },
        { label: "Published", value: published, tone: "green" },
        { label: "Draft", value: records.length - published, tone: "amber" },
      ]} />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search assessments"
        segments={[
          { key: "all", label: "All" },
          { key: "published", label: "Published" },
          { key: "draft", label: "Draft" },
        ]}
        activeSegment={filter}
        onSegmentChange={setFilter}
        resultCount={visibleRecords.length}
      />

      <AdminSection
        title="Assessment inventory"
        subtitle="Open a record for grading, analytics, and lifecycle controls"
        action={<AdminButton label={showCreate ? "Close" : "New"} icon={showCreate ? "close" : "plus"} onPress={() => setShowCreate((value) => !value)} />}
      >
        {showCreate ? (
          <View style={{ borderTopWidth: 1, borderTopColor: "#DDE3EA" }}>
            {(classes.data ?? []).map((entry) => (
              <AdminDataRow
                key={entry.id}
                title={`${entry.subjectCode} · ${entry.subjectName}`}
                subtitle={`Create an assessment for ${entry.section?.name ?? "this class"}`}
                onPress={() => rootNavigation?.navigate("TeacherCreateAssessment", { classId: entry.id })}
              />
            ))}
          </View>
        ) : null}

        {visibleRecords.map(({ assessment, classItem }) => (
          <AdminDataRow
            key={assessment.id}
            title={assessment.title}
            subtitle={`${classItem?.subjectCode ?? "Class"} · ${assessment.type.replace(/_/g, " ")}`}
            status={assessment.isPublished ? "Published" : "Draft"}
            statusTone={assessment.isPublished ? "green" : "amber"}
            onPress={() => rootNavigation?.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId: assessment.classId })}
          />
        ))}
        {!visibleRecords.length ? (
          <AdminEmpty
            title={refreshing ? "Loading assessments" : hasFilters ? "No matching assessments" : "No assessments found"}
            subtitle={hasFilters ? "Clear filters to return to the complete inventory." : "Create an assessment for one of the available classes."}
            icon="clipboard-search-outline"
            actionLabel={hasFilters ? "Clear filters" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
