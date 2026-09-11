import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
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
  AdminDataRow,
  AdminField,
  AdminListHeader,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminAudit">;
const dateKey = (value: Date | null) =>
  value
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : "";

export function AdminAuditScreen(_props: Props) {
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [datePicker, setDatePicker] = useState<"from" | "to" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: [
      "admin-audit",
      action,
      actorId,
      dateKey(dateFrom),
      dateKey(dateTo),
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      adminApi.getAuditPage({
        page: pageParam,
        limit: 25,
        action: action.trim() || undefined,
        actorId: actorId.trim() || undefined,
        dateFrom: dateKey(dateFrom) || undefined,
        dateTo: dateKey(dateTo) || undefined,
      }),
    getNextPageParam: nextAdminPage,
  });
  const rows = useMemo(
    () => mergeAdminPages(query.data?.pages ?? [], (entry) => entry.id),
    [query.data?.pages],
  );
  const selected = rows.find((entry) => entry.id === selectedId);
  const exportActivity = async () => {
    try {
      const { csv, fileName } = await adminApi.exportActivity({
        dateFrom: dateKey(dateFrom) || undefined,
        dateTo: dateKey(dateTo) || undefined,
      });
      const FileSystem = await import("expo-file-system/legacy");
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Share audited activity export",
          UTI: "public.comma-separated-values-text",
        });
    } catch (error) {
      Alert.alert("Export failed", toAppError(error).message);
    }
  };
  const changeDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (!datePicker || !value) {
      setDatePicker(null);
      return;
    }
    if (datePicker === "from") setDateFrom(value);
    else setDateTo(value);
    setDatePicker(null);
  };
  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <AdminDataRow
          title={item.action}
          subtitle={`${item.targetType} · ${item.actor?.email ?? item.actorId}`}
          meta={new Date(item.createdAt).toLocaleString()}
          status={selectedId === item.id ? "Open" : undefined}
          statusTone="primary"
          onPress={() => setSelectedId(selectedId === item.id ? null : item.id)}
        />
      )}
      header={
        <>
          <AdminListHeader
            title="Audit Trail"
            subtitle="Immutable, server-paged administrator history"
            rightAction={
              <AdminButton
                label="Export"
                icon="download"
                onPress={() => void exportActivity()}
              />
            }
          />
          <AdminSection
            title="Server filters"
            subtitle="Action text, exact actor ID, and readable date boundaries"
          >
            <View style={{ padding: 16, gap: 10 }}>
              <AdminField
                label="Action contains"
                value={action}
                onChangeText={setAction}
                placeholder="user, class, report…"
              />
              <AdminField
                label="Actor ID"
                value={actorId}
                onChangeText={setActorId}
                autoCapitalize="none"
              />
              <Text style={{ color: theme.text, fontWeight: "800" }}>
                From: {dateFrom?.toLocaleDateString() ?? "Any date"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <AdminButton
                  label="Choose from date"
                  onPress={() => setDatePicker("from")}
                />
                <AdminButton
                  label="Clear from"
                  disabled={!dateFrom}
                  onPress={() => setDateFrom(null)}
                />
              </View>
              <Text style={{ color: theme.text, fontWeight: "800" }}>
                To: {dateTo?.toLocaleDateString() ?? "Any date"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <AdminButton
                  label="Choose to date"
                  onPress={() => setDatePicker("to")}
                />
                <AdminButton
                  label="Clear to"
                  disabled={!dateTo}
                  onPress={() => setDateTo(null)}
                />
              </View>
              {datePicker ? (
                <DateTimePicker
                  value={
                    datePicker === "from"
                      ? (dateFrom ?? new Date())
                      : (dateTo ?? new Date())
                  }
                  mode="date"
                  onChange={changeDate}
                />
              ) : null}
            </View>
          </AdminSection>
          {selected ? (
            <AdminSection title="Event evidence" subtitle={selected.id}>
              <View style={{ padding: 16, gap: 8 }}>
                <Text
                  selectable
                  style={{ color: theme.text, fontSize: 12, lineHeight: 18 }}
                >
                  Target: {selected.targetType} / {selected.targetId}
                </Text>
                <Text
                  selectable
                  style={{ color: theme.subtext, fontSize: 12, lineHeight: 18 }}
                >
                  Actor: {selected.actor?.email ?? selected.actorId}
                </Text>
                <Text
                  selectable
                  style={{ color: theme.text, fontSize: 11, lineHeight: 17 }}
                >
                  {selected.metadata
                    ? Object.entries(selected.metadata)
                        .map(
                          ([key, value]) =>
                            `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
                        )
                        .join("\n")
                    : "No metadata attached."}
                </Text>
              </View>
            </AdminSection>
          ) : null}
        </>
      }
      emptyTitle="No audit events"
      emptySubtitle="No immutable events match the current server filters."
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
