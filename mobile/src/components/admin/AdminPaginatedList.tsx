import type { ReactElement, ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import {
  AdminEmpty,
  AdminNotice,
  adminTheme as theme,
} from "./AdminMobilePrimitives";
import { useAdminNetworkStatus } from "../../hooks/useAdminNetworkStatus";

function AdminSkeletonRows() {
  return (
    <View accessibilityLabel="Loading records" accessibilityRole="progressbar">
      {[0, 1, 2, 3, 4].map((row) => (
        <View
          key={row}
          style={{
            minHeight: 72,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surface,
            gap: 9,
          }}
        >
          <View
            style={{
              height: 12,
              width: `${68 - row * 5}%`,
              borderRadius: 5,
              backgroundColor: theme.surfaceMuted,
            }}
          />
          <View
            style={{
              height: 9,
              width: `${48 - row * 3}%`,
              borderRadius: 5,
              backgroundColor: theme.border,
            }}
          />
        </View>
      ))}
    </View>
  );
}

export function AdminPaginatedList<Item>({
  data,
  renderItem,
  keyExtractor,
  header,
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  error,
  initialLoading = false,
  lastUpdatedAt,
  refreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  data: Item[];
  renderItem: ListRenderItem<Item>;
  keyExtractor: (item: Item) => string;
  header?: ReactNode;
  emptyTitle: string;
  emptySubtitle: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  error?: string | null;
  initialLoading?: boolean;
  lastUpdatedAt?: number;
  refreshing: boolean;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
}): ReactElement {
  const network = useAdminNetworkStatus();
  const cachedOffline = network.isOffline && data.length > 0;
  const updatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString()
    : "time unavailable";
  const listHeader = (
    <>
      <View>{header}</View>
      {cachedOffline ? (
        <AdminNotice
          title="Offline · cached read-only data"
          description={`Last updated ${updatedLabel}. Reconnect and refresh before taking an administrative action.`}
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {error && !cachedOffline ? (
        <AdminNotice
          title="Unable to load records"
          description={error}
          tone="red"
          icon="alert-circle-outline"
        />
      ) : null}
    </>
  );
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 32,
        backgroundColor: theme.bg,
      }}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        initialLoading ? (
          <AdminSkeletonRows />
        ) : (
          <AdminEmpty
            title={emptyTitle}
            subtitle={emptySubtitle}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View
            style={{
              minHeight: 64,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator color={theme.primary} />
            <Text style={{ marginTop: 6, color: theme.muted, fontSize: 11 }}>
              Loading more records…
            </Text>
          </View>
        ) : !hasNextPage && data.length ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              padding: 16,
              textAlign: "center",
              color: theme.muted,
              fontSize: 11,
            }}
          >
            All loaded records are shown.
          </Text>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.35}
    />
  );
}
