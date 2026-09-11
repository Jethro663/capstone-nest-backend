import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { adminApi } from "../api/services/admin";
import { toAppError } from "../api/http";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminFilterBar,
  AdminListHeader,
  AdminNotice,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import type { MainTabParamList } from "../navigation/types";
import type { BulkUserLifecycleAction } from "../types/admin";

type Props = BottomTabScreenProps<MainTabParamList, "AdminUsers">;
type Status = "all" | "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED";
type Role = "all" | "student" | "teacher" | "admin";

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function AdminUsersScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<Status>("ACTIVE");
  const [role, setRole] = useState<Role>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    succeeded: number;
    failed: number;
    firstFailure?: string;
  } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["admin-users", role, status, debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      adminApi.getUsersPage({
        page: pageParam,
        limit: 25,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        search: debouncedSearch || undefined,
        includeStatusCounts: true,
      }),
    getNextPageParam: nextAdminPage,
  });
  const users = useMemo(
    () => mergeAdminPages(query.data?.pages ?? [], (user) => user.id),
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? users.length;
  const allVisibleSelected =
    users.length > 0 && users.every((user) => selectedIds.includes(user.id));
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };

  const setStatusFilter = (next: Status) => {
    setStatus(next);
    setSelectedIds([]);
    setBulkResult(null);
  };
  const setRoleFilter = (next: Role) => {
    setRole(next);
    setSelectedIds([]);
    setBulkResult(null);
  };
  const toggleSelection = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  const selectAllVisible = () =>
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !users.some((user) => user.id === id))
        : Array.from(new Set([...current, ...users.map((user) => user.id)])),
    );

  const runBulk = async (action: BulkUserLifecycleAction) => {
    if (!selectedIds.length) return;
    if (network.isOffline) {
      Alert.alert(
        "Connection required",
        "Bulk lifecycle writes require a live connection and are never queued.",
      );
      return;
    }
    try {
      setBusy(true);
      const result = await adminApi.bulkUserLifecycle({
        action,
        userIds: selectedIds,
      });
      setBulkResult({
        succeeded: result.data.succeeded.length,
        failed: result.data.failed.length,
        firstFailure: result.data.failed[0]?.reason,
      });
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      Alert.alert("Bulk action rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const confirmBulk = (
    action: BulkUserLifecycleAction,
    label: string,
    warning: string,
  ) =>
    Alert.alert(`${label} ${selectedIds.length} users?`, warning, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: action === "reactivate" ? "default" : "destructive",
        onPress: () => void runBulk(action),
      },
    ]);

  const exportVisible = async () => {
    if (!users.length) return;
    try {
      const header = [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "status",
        "gradeLevel",
        "isEmailVerified",
      ];
      const lines = users.map((user) =>
        [
          user.id,
          user.firstName,
          user.lastName,
          user.email,
          user.roles
            .map((entry) => (typeof entry === "string" ? entry : entry.name))
            .filter(Boolean)
            .join("|"),
          user.status,
          user.gradeLevel ?? user.profile?.gradeLevel,
          user.isEmailVerified,
        ]
          .map(csvCell)
          .join(","),
      );
      const csv = [header.map(csvCell).join(","), ...lines].join("\n");
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");
      const fileUri = `${FileSystem.cacheDirectory}visible-admin-users.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export visible users",
        });
      else Alert.alert("Export prepared", fileUri);
    } catch (error) {
      Alert.alert("Export failed", toAppError(error).message);
    }
  };

  const batchHeader = (
    <AdminSection
      title="Visible records"
      subtitle={`${selectedIds.length} selected on loaded pages`}
    >
      <View
        style={{ padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        <AdminButton
          label={
            allVisibleSelected
              ? "Clear visible selection"
              : "Select all visible"
          }
          onPress={selectAllVisible}
          disabled={!users.length || busy}
        />
        <AdminButton
          label="Export visible"
          icon="download"
          tone="green"
          onPress={() => void exportVisible()}
          disabled={!users.length || busy}
        />
        {selectedIds.length ? (
          <AdminButton
            label="Clear selection"
            onPress={() => setSelectedIds([])}
            disabled={busy}
          />
        ) : null}
        {selectedIds.length && status === "SUSPENDED" ? (
          <>
            <AdminButton
              label="Reactivate selected"
              tone="green"
              onPress={() =>
                confirmBulk(
                  "reactivate",
                  "Reactivate",
                  "Selected suspended accounts regain access immediately.",
                )
              }
              disabled={busy || network.isOffline}
            />
            <AdminButton
              label="Archive selected"
              tone="red"
              onPress={() =>
                confirmBulk(
                  "archive",
                  "Archive",
                  "Selected accounts move to deleted status and remain eligible for purge.",
                )
              }
              disabled={busy || network.isOffline}
            />
          </>
        ) : null}
        {selectedIds.length && status === "DELETED" ? (
          <AdminButton
            label="Purge selected"
            tone="red"
            onPress={() =>
              confirmBulk(
                "purge",
                "Purge",
                "This permanently removes the selected deleted accounts.",
              )
            }
            disabled={busy || network.isOffline}
          />
        ) : null}
        {selectedIds.length &&
        status !== "SUSPENDED" &&
        status !== "DELETED" ? (
          <AdminButton
            label="Suspend selected"
            tone="red"
            onPress={() =>
              confirmBulk(
                "suspend",
                "Suspend",
                "Selected active or pending accounts lose login access but remain restorable.",
              )
            }
            disabled={busy || network.isOffline}
          />
        ) : null}
      </View>
    </AdminSection>
  );

  return (
    <AdminPaginatedList
      data={users}
      keyExtractor={(user) => user.id}
      renderItem={({ item: user }) => {
        const roles = (user.roles ?? [])
          .map((entry) => (typeof entry === "string" ? entry : entry.name))
          .filter(Boolean)
          .join(", ");
        const selected = selectedIds.includes(user.id);
        return (
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#E8DCDD" }}>
            <AdminDataRow
              title={
                `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                user.email
              }
              subtitle={user.email}
              meta={roles || "Account"}
              status={user.status}
              statusTone={
                user.status === "ACTIVE"
                  ? "green"
                  : user.status === "SUSPENDED"
                    ? "amber"
                    : user.status === "DELETED"
                      ? "red"
                      : "neutral"
              }
              onPress={() =>
                rootNavigation.navigate("AdminUserDetail", { userId: user.id })
              }
            />
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <AdminButton
                label={
                  selected ? `Deselect ${user.email}` : `Select ${user.email}`
                }
                icon={selected ? "checkbox-marked" : "checkbox-blank-outline"}
                variant="text"
                onPress={() => toggleSelection(user.id)}
              />
            </View>
          </View>
        );
      }}
      header={
        <>
          <AdminListHeader
            title="Users"
            subtitle={`${total} accounts · server-paginated`}
            rightAction={
              <AdminButton
                label="New user"
                icon="account-plus"
                variant="solid"
                onPress={() => rootNavigation.navigate("AdminCreateUser")}
              />
            }
          />
          <AdminFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search name or email"
            segments={[
              { key: "all", label: "All" },
              { key: "ACTIVE", label: "Active" },
              { key: "PENDING", label: "Pending" },
              { key: "SUSPENDED", label: "Suspended" },
              { key: "DELETED", label: "Archived" },
            ]}
            activeSegment={status}
            onSegmentChange={setStatusFilter}
            resultCount={total ?? users.length}
          />
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 7,
            }}
          >
            <AdminChip
              label="All roles"
              active={role === "all"}
              onPress={() => setRoleFilter("all")}
            />
            {(["student", "teacher", "admin"] as const).map((entry) => (
              <AdminChip
                key={entry}
                label={entry}
                active={role === entry}
                onPress={() => setRoleFilter(entry)}
              />
            ))}
          </View>
          {network.isOffline ? (
            <AdminNotice
              title="Offline · bulk actions disabled"
              description="Cached users remain readable. Lifecycle writes require a live connection and are never queued."
              tone="amber"
              icon="cloud-off-outline"
            />
          ) : null}
          {bulkResult ? (
            <AdminNotice
              title={`${bulkResult.succeeded} completed · ${bulkResult.failed} failed`}
              description={
                bulkResult.firstFailure ?? "Every selected user was updated."
              }
              tone={bulkResult.failed ? "amber" : "green"}
            />
          ) : null}
          {batchHeader}
        </>
      }
      emptyTitle={
        debouncedSearch || role !== "all" || status !== "all"
          ? "No matching users"
          : "No users yet"
      }
      emptySubtitle={
        debouncedSearch || role !== "all" || status !== "all"
          ? "Change or clear the current filters."
          : "Create the first administrator-managed account."
      }
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
