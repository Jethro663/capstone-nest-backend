import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { peekAppError } from "../api/http";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import type {
  Assessment,
  AssessmentAttempt,
  AssessmentType,
} from "../types/assessment";
import type { ClassItem } from "../types/class";
import {
  StudentAssessmentsView,
  type StudentAssessmentFilter,
} from "./student-assessments/StudentAssessmentsView";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;
type AssessmentFilterKey = StudentAssessmentFilter;

type AssessmentRecord = {
  id: string;
  classId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  typeLabel: string;
  status: "pending" | "completed" | "past_due";
  statusLabel: string;
  dueLabel: string;
  dueTime: number | null;
  totalPoints: number;
};

const filterTabs: Array<{ key: AssessmentFilterKey; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "past_due", label: "Past Due" },
  { key: "completed", label: "Completed" },
  { key: "allAssessments", label: "All Assessments" },
];

const statusPriority: Record<AssessmentRecord["status"], number> = {
  past_due: 0,
  pending: 2,
  completed: 3,
};

function resolveSubjectName(classItem?: ClassItem) {
  return (
    classItem?.subjectName || classItem?.className || classItem?.name || "Class"
  );
}

function resolveSubjectCode(classItem?: ClassItem) {
  return classItem?.subjectCode || "CLASS";
}

function resolveAssessmentTypeLabel(type?: AssessmentType) {
  return (type || "assignment")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function resolveStatusLabel(status: AssessmentRecord["status"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "past_due":
      return "Past Due";
    case "pending":
    default:
      return "Pending";
  }
}

function formatDueDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAttemptTimestamp(attempt: AssessmentAttempt) {
  return new Date(
    attempt.submittedAt || attempt.startedAt || attempt.createdAt || 0,
  ).getTime();
}

function resolveAssessmentStatus(
  assessment: Assessment,
  attempts: AssessmentAttempt[],
) {
  const latestAttempt =
    [...attempts].sort(
      (left, right) => getAttemptTimestamp(right) - getAttemptTimestamp(left),
    )[0] || null;
  const dueTime = assessment.dueDate
    ? new Date(assessment.dueDate).getTime()
    : null;
  let status: AssessmentRecord["status"] = "pending";

  if (latestAttempt?.isSubmitted) {
    status = "completed";
  } else if (dueTime && dueTime < Date.now()) {
    status = "past_due";
  }

  return { latestAttempt, dueTime, status };
}

function buildEmptyStateSubtitle(
  activeFilter: AssessmentFilterKey,
  searchQuery: string,
) {
  if (searchQuery.trim()) {
    return "Try another search term or switch the current filter.";
  }

  if (activeFilter === "allAssessments") {
    return "No published assessments are available right now.";
  }

  const filterLabel =
    filterTabs.find((tab) => tab.key === activeFilter)?.label.toLowerCase() ||
    "assessments";
  const normalizedLabel = filterLabel.includes("assessment")
    ? filterLabel
    : `${filterLabel} assessments`;
  return `No ${normalizedLabel} match this view.`;
}

export function AssessmentsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<AssessmentFilterKey>("pending");
  const classesQuery = useStudentClasses(user?.userId || user?.id);

  const publishedAssessmentQueries = useQueries({
    queries: (classesQuery.data ?? []).map((classItem) => ({
      queryKey: queryKeys.assessments(classItem.id),
      queryFn: () => assessmentsApi.getByClass(classItem.id),
      enabled: !!classItem.id,
    })),
  });

  const baseAssessments = useMemo(
    () =>
      publishedAssessmentQueries.flatMap((query, index) => {
        const classItem = (classesQuery.data ?? [])[index];
        const items = (query.data ?? []) as Assessment[];

        return items
          .filter((assessment) => assessment.isPublished !== false)
          .map((assessment) => ({ assessment, classItem }));
      }),
    [classesQuery.data, publishedAssessmentQueries],
  );

  const attemptQueries = useQueries({
    queries: baseAssessments.map(({ assessment }) => ({
      queryKey: queryKeys.assessmentAttempts(assessment.id),
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: !!assessment.id,
    })),
  });

  const derivedAssessments = useMemo<AssessmentRecord[]>(() => {
    return baseAssessments
      .map(({ assessment, classItem }, index) => {
        const attempts = (attemptQueries[index]?.data ??
          []) as AssessmentAttempt[];
        const { dueTime, status } = resolveAssessmentStatus(
          assessment,
          attempts,
        );

        return {
          id: assessment.id,
          classId: assessment.classId,
          title: assessment.title || "Untitled assessment",
          subjectName: resolveSubjectName(classItem),
          subjectCode: resolveSubjectCode(classItem),
          typeLabel: resolveAssessmentTypeLabel(assessment.type),
          status,
          statusLabel: resolveStatusLabel(status),
          dueLabel: formatDueDate(assessment.dueDate),
          dueTime,
          totalPoints: assessment.totalPoints ?? 100,
        };
      })
      .sort((left, right) => {
        const statusGap =
          statusPriority[left.status] - statusPriority[right.status];
        if (statusGap !== 0) {
          return statusGap;
        }

        const dueGap =
          (left.dueTime ?? Number.MAX_SAFE_INTEGER) -
          (right.dueTime ?? Number.MAX_SAFE_INTEGER);
        if (dueGap !== 0) {
          return dueGap;
        }

        return left.title.localeCompare(right.title);
      });
  }, [attemptQueries, baseAssessments]);

  const filteredAssessments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return derivedAssessments.filter((assessment) => {
      const matchesFilter =
        activeFilter === "allAssessments"
          ? true
          : assessment.status === activeFilter;

      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : [
              assessment.title,
              assessment.subjectName,
              assessment.subjectCode,
              assessment.typeLabel,
              assessment.statusLabel,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, derivedAssessments, searchQuery]);

  const refreshing =
    classesQuery.isRefetching ||
    publishedAssessmentQueries.some((query) => query.isRefetching) ||
    attemptQueries.some((query) => query.isRefetching);

  const primaryError =
    classesQuery.error ||
    publishedAssessmentQueries.find((query) => query.error)?.error ||
    attemptQueries.find((query) => query.error)?.error;

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      ...publishedAssessmentQueries.map((query) => query.refetch()),
      ...attemptQueries.map((query) => query.refetch()),
    ]);
  };

  return (
    <StudentAssessmentsView
      navigation={navigation}
      assessments={filteredAssessments}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      loading={classesQuery.isLoading}
      errorMessage={
        primaryError ? peekAppError(primaryError).message : undefined
      }
      emptySubtitle={buildEmptyStateSubtitle(activeFilter, searchQuery)}
    />
  );
}
