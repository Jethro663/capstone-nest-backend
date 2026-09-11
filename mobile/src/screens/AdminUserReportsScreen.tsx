import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { adminApi } from "../api/services/admin";
import { toAppError } from "../api/http";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import {
  AdminDataRow,
  AdminFilterBar,
  AdminListHeader,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminUserReports">;
type Status = "all" | "ACTIVE" | "SUSPENDED" | "DELETED";

export function AdminUserReportsScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ["admin-user-monitoring", status, debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      adminApi.getMonitoringPage({
        page: pageParam,
        limit: 25,
        status: status === "all" ? undefined : status,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: nextAdminPage,
  });
  const rows = useMemo(
    () => mergeAdminPages(query.data?.pages ?? [], (entry) => entry.id),
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? rows.length;
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };
  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <AdminDataRow
          title={
            `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
            item.email
          }
          subtitle={item.email}
          meta={`Inactive ${item.inactiveFor}${item.activityIp ? ` · ${item.activityIp}` : ""}`}
          status={
            item.isCurrentlyActive
              ? "Online"
              : item.isSuspended
                ? "Suspended"
                : item.isArchived
                  ? "Archived"
                  : "Offline"
          }
          statusTone={
            item.isCurrentlyActive
              ? "green"
              : item.isSuspended
                ? "amber"
                : item.isArchived
                  ? "red"
                  : "neutral"
          }
          onPress={() =>
            rootNavigation.navigate("AdminUserDetail", { userId: item.id })
          }
        />
      )}
      header={
        <>
          <AdminListHeader
            title="User Reports"
            subtitle="Account activity and access monitoring"
          />
          <AdminFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search monitoring records"
            segments={[
              { key: "all", label: "All" },
              { key: "ACTIVE", label: "Active" },
              { key: "SUSPENDED", label: "Suspended" },
              { key: "DELETED", label: "Archived" },
            ]}
            activeSegment={status}
            onSegmentChange={setStatus}
            resultCount={total ?? rows.length}
          />
        </>
      }
      emptyTitle="No monitoring records"
      emptySubtitle="No accounts match the current filters."
      error={query.isError ? toAppError(query.error).message : null}
      initialLoading={query.isPending}
      lastUpdatedAt={query.dataUpdatedAt}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={() => void query.fetchNextPage()}
    />
  );
}
