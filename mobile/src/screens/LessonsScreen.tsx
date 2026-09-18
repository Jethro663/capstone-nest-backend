import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { peekAppError } from "../api/http";
import { queryKeys } from "../api/hooks";
import { mobileWorkspaceApi } from "../api/services/mobile-workspace";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  StudentClassesView,
  type StudentClassFilter,
} from "./student-classes/StudentClassesView";
import { OfflineWorkspaceNotice } from "../components/offline/OfflineWorkspaceNotice";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Classes">,
  NativeStackScreenProps<RootStackParamList>
>;

type ClassFilterKey = StudentClassFilter;

type DerivedClassItem = {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  sectionName: string;
  teacherName: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  classmatesCount: number;
  totalAssessments: number;
  pendingCount: number;
  status: "inProgress" | "completed";
};

export function LessonsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ClassFilterKey>("inProgress");

  const overviewQuery = useQuery({
    queryKey: [...queryKeys.mobileStudentOverview, user?.id],
    queryFn: () => mobileWorkspaceApi.getStudentOverviewForUser(user!.id),
    enabled: !!user?.id,
  });
  const offlineState = overviewQuery.data?.offlineState;
  const offline = !!offlineState;

  const derivedClasses = useMemo<DerivedClassItem[]>(() => {
    return (overviewQuery.data?.courses ?? []).map((classItem) => {
      const completedLessons = classItem.completedLessonCount;
      const totalLessons = classItem.totalLessons;
      const progress = classItem.progress;

      return {
        id: classItem.id,
        subjectName: classItem.subjectName,
        subjectCode: classItem.subjectCode || "CLASS",
        subjectGradeLevel:
          classItem.subjectGradeLevel || classItem.sectionGradeLevel || "—",
        sectionName: classItem.sectionName,
        teacherName: classItem.teacherName,
        progress,
        completedLessons,
        totalLessons,
        classmatesCount: Math.max(0, classItem.classmateCount - 1),
        totalAssessments: classItem.totalAssessments,
        pendingCount:
          Math.max(totalLessons - completedLessons, 0) +
          classItem.totalAssessments,
        status:
          totalLessons > 0 && progress >= 100 ? "completed" : "inProgress",
      };
    });
  }, [overviewQuery.data?.courses]);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return derivedClasses.filter((classItem) => {
      const matchesFilter = classItem.status === activeFilter;

      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : [
              classItem.subjectName,
              classItem.subjectCode,
              classItem.sectionName,
              classItem.teacherName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, derivedClasses, searchQuery]);

  const refreshing = overviewQuery.isRefetching;
  const primaryError = overviewQuery.error;
  const handleRefresh = () => void overviewQuery.refetch();

  return (
    <StudentClassesView
      navigation={navigation}
      classes={filteredClasses}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      loading={overviewQuery.isLoading}
      errorMessage={
        primaryError ? peekAppError(primaryError).message : undefined
      }
      readOnlyOffline={offline}
      offlineNotice={
        offlineState ? (
          <OfflineWorkspaceNotice lastSyncedAt={offlineState.lastSyncedAt} />
        ) : undefined
      }
    />
  );
}
