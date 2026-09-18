import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { toAnnouncementPreview, toSubjectCard } from "../data/mappers";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { StudentAnnouncementsView } from "./student-announcements/StudentAnnouncementsView";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;
type FilterMode = "all" | "pinned";

export function AnnouncementsScreen(_: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(
    null,
  );

  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const classIds = classesQuery.data?.map((item) => item.id) ?? [];

  const announcementQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const announcements = useMemo(() => {
    if (!classesQuery.data) return [];
    return announcementQueries
      .flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!classItem || !query.data) return [];
        const subject = toSubjectCard(classItem, [], [], null);
        return query.data.map((entry) => toAnnouncementPreview(entry, subject));
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [announcementQueries, classesQuery.data]);

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;
    if (selectedClassId !== "all") {
      list = list.filter(
        (entry) =>
          entry.classId === selectedClassId ||
          entry.subject.toLowerCase().includes(selectedClassId.toLowerCase()) ||
          entry.subject === selectedClassId,
      );
    }
    if (filterMode === "pinned") {
      list = list.filter((entry) => entry.isPinned);
    }
    return list;
  }, [announcements, filterMode, selectedClassId]);

  const refreshing =
    classesQuery.isRefetching ||
    announcementQueries.some((query) => query.isRefetching);

  return (
    <StudentAnnouncementsView
      announcements={filteredAnnouncements}
      allAnnouncementCount={announcements.length}
      classOptions={[
        { label: "All classes", value: "all" },
        ...(classesQuery.data ?? []).map((entry) => ({
          label: entry.subjectCode || entry.subjectName || "Class",
          value: entry.id,
        })),
      ]}
      selectedClassId={selectedClassId}
      onSelectClass={setSelectedClassId}
      filterMode={filterMode}
      onFilterModeChange={setFilterMode}
      selectedAnnouncement={selectedAnnouncement}
      onSelectAnnouncement={setSelectedAnnouncement}
      refreshing={refreshing}
      onRefresh={() =>
        void Promise.all([
          classesQuery.refetch(),
          ...announcementQueries.map((query) => query.refetch()),
        ])
      }
    />
  );
}
