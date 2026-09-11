import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { assessmentsApi } from "../api/services/assessments";
import { classesApi } from "../api/services/classes";
import { toAppError } from "../api/http";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import {
  AdminButton,
  AdminDataRow,
  AdminFilterBar,
  AdminListHeader,
  AdminNotice,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import type { Assessment } from "../types/assessment";

type InventoryAssessment = Assessment & {
  class?: {
    id: string;
    subjectCode: string;
    subjectName: string;
    section?: { id: string; name: string } | null;
  } | null;
};
type Publication = "all" | "published" | "draft";
type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;

export function AdminAssessmentsScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publication, setPublication] = useState<Publication>("all");
  const [showClasses, setShowClasses] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const inventory = useInfiniteQuery({
    queryKey: ["admin-assessment-inventory", publication, debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      assessmentsApi.getAdminPage({
        page: pageParam,
        limit: 25,
        publication,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: nextAdminPage,
  });
  const classes = useQuery({
    queryKey: ["admin-assessment-class-options"],
    queryFn: () => classesApi.getPage({ page: 1, limit: 100 }),
    enabled: showClasses,
  });
  const rows = useMemo(
    () =>
      mergeAdminPages(
        inventory.data?.pages ?? [],
        (entry) => entry.id,
      ) as InventoryAssessment[],
    [inventory.data?.pages],
  );
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: <Name extends keyof RootStackParamList>(
      name: Name,
      params: RootStackParamList[Name],
    ) => void;
  };
  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <AdminDataRow
          title={item.title}
          subtitle={`${item.class?.subjectCode ?? "Class"} · ${item.type.replace(/_/g, " ")}${item.class?.section?.name ? ` · ${item.class.section.name}` : ""}`}
          meta={`${item.quarter ?? "No period"}${item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleString()}` : ""}`}
          status={item.isPublished ? "Published" : "Draft"}
          statusTone={item.isPublished ? "green" : "amber"}
          onPress={() =>
            rootNavigation.navigate("TeacherAssessmentDetail", {
              assessmentId: item.id,
              classId: item.classId,
            })
          }
        />
      )}
      header={
        <>
          <AdminListHeader
            title="Assessment Inventory"
            subtitle="Read-only cross-class shortcut; authoring opens the canonical class flow"
            rightAction={
              <AdminButton
                label={showClasses ? "Close" : "New"}
                icon={showClasses ? "close" : "plus"}
                onPress={() => setShowClasses((value) => !value)}
              />
            }
          />
          <AdminFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search assessments"
            segments={[
              { key: "all", label: "All" },
              { key: "published", label: "Published" },
              { key: "draft", label: "Draft" },
            ]}
            activeSegment={publication}
            onSegmentChange={setPublication}
            resultCount={inventory.data?.pages[0]?.total ?? rows.length}
          />
          {inventory.isError ? (
            <AdminNotice
              title="Assessment inventory unavailable"
              description={toAppError(inventory.error).message}
              tone="red"
            />
          ) : null}
          {showClasses ? (
            <AdminSection
              title="Choose a class"
              subtitle="Creation continues through the existing class assessment stack"
            >
              <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                {(classes.data?.data ?? []).map((entry) => (
                  <AdminDataRow
                    key={entry.id}
                    title={`${entry.subjectCode} · ${entry.subjectName}`}
                    subtitle={entry.section?.name ?? "No section"}
                    onPress={() =>
                      rootNavigation.navigate("TeacherCreateAssessment", {
                        classId: entry.id,
                      })
                    }
                  />
                ))}
              </View>
            </AdminSection>
          ) : null}
        </>
      }
      emptyTitle={
        search.trim() || publication !== "all"
          ? "No matching assessments"
          : "No assessments"
      }
      emptySubtitle={
        search.trim() || publication !== "all"
          ? "Clear filters to return to the complete assessment inventory."
          : "No assessments have been created yet."
      }
      emptyActionLabel={
        search.trim() || publication !== "all" ? "Clear filters" : undefined
      }
      onEmptyAction={
        search.trim() || publication !== "all"
          ? () => {
              setSearch("");
              setPublication("all");
            }
          : undefined
      }
      error={inventory.isError ? toAppError(inventory.error).message : null}
      initialLoading={inventory.isPending}
      lastUpdatedAt={inventory.dataUpdatedAt}
      refreshing={inventory.isRefetching && !inventory.isFetchingNextPage}
      onRefresh={() => void inventory.refetch()}
      hasNextPage={inventory.hasNextPage}
      isFetchingNextPage={inventory.isFetchingNextPage}
      fetchNextPage={() => void inventory.fetchNextPage()}
    />
  );
}
