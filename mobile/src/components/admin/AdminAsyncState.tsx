import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { AdminButton, AdminNotice } from "./AdminMobilePrimitives";

type AdminAsyncStateProps = PropsWithChildren<{
  isLoading: boolean;
  hasData: boolean;
  error: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  empty?: ReactNode;
}>;

export function AdminAsyncState({
  isLoading,
  hasData,
  error,
  onRetry,
  isRetrying = false,
  empty = null,
  children,
}: AdminAsyncStateProps) {
  if (isLoading && !hasData) {
    return (
      <View accessibilityRole="progressbar">
        <AdminNotice
          title="Loading system status"
          description="Fetching the latest backend-owned evidence."
          tone="neutral"
        />
      </View>
    );
  }

  if (error && !hasData) {
    return (
      <View accessibilityRole="alert" style={{ paddingBottom: 10 }}>
        <AdminNotice
          title={error}
          description="The rest of this screen remains available. Retry this status request when ready."
          tone="red"
        />
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <AdminButton
            label={isRetrying ? "Retrying…" : "Retry"}
            onPress={onRetry}
            disabled={isRetrying}
            tone="red"
          />
        </View>
      </View>
    );
  }

  if (!hasData) return <>{empty}</>;

  return (
    <>
      {error ? (
        <View accessibilityRole="alert" style={{ paddingBottom: 10 }}>
          <AdminNotice
            title="Showing the last successful data"
            description={error}
            tone="amber"
          />
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <AdminButton
              label={isRetrying ? "Retrying…" : "Retry"}
              onPress={onRetry}
              disabled={isRetrying}
              tone="amber"
            />
          </View>
        </View>
      ) : null}
      {children}
    </>
  );
}
