import type { PropsWithChildren } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSystemReset } from "../providers/SystemResetProvider";
import { useAuth } from "../providers/AuthProvider";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import { RESET_PHASE_LABELS } from "../features/system-reset/model";
import { adminTheme as theme } from "../theme/admin";
import { rootNavigationRef } from "../navigation/navigation-ref";
import { resolveMobileRole } from "../navigation/role-resolver";

/** Root modal survives replacement of any authenticated navigator. */
export function SystemResetProgressGate({ children }: PropsWithChildren) {
  const reset = useSystemReset();
  const { isAuthenticated, user } = useAuth();
  const canReturnToSettings =
    isAuthenticated && resolveMobileRole(user?.roles) === "admin";
  const { isOffline } = useAdminNetworkStatus();
  const insets = useSafeAreaInsets();
  const completed = reset.progress === "completed";
  const aborted = reset.progress === "aborted";
  const title = completed
    ? "School data reset complete"
    : aborted
      ? "Reset aborted"
      : "School data reset progress";
  const close = async () => {
    if (reset.clearing) return;
    if (completed || aborted) {
      if (completed && !reset.signedOut) return;
      try {
        await reset.forget();
        if (aborted && canReturnToSettings && rootNavigationRef.isReady())
          rootNavigationRef.navigate("MainTabs", { screen: "AdminSettings" });
      } catch {
        reset.refresh();
      }
    } else reset.hide();
  };
  return (
    <View style={{ flex: 1 }}>
      {children}
      {reset.operationId && !reset.visible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View school data reset progress"
          onPress={reset.show}
          style={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.primary,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            View reset progress · leaving does not cancel
          </Text>
        </Pressable>
      ) : null}
      <Modal
        visible={Boolean(reset.operationId && reset.visible)}
        animationType="slide"
        onRequestClose={() => {
          if (!completed && !aborted) return;
          return close();
        }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            gap: 20,
            flexGrow: 1,
            backgroundColor: theme.bg,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ fontSize: 25, fontWeight: "800", color: theme.primary }}
          >
            {title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontSize: 18, lineHeight: 27, color: theme.text }}
          >
            {completed
              ? "The server verified the reset. Sign in again with your retained administrator credentials."
              : aborted
                ? "The server stopped before clearing school records. Your records were preserved."
                : reset.progress === "running"
                  ? (RESET_PHASE_LABELS[reset.status?.phase ?? ""] ??
                    "Server reset in progress")
                  : "Waiting for a matching server receipt. The request may still be processing. No completion has been confirmed."}
          </Text>
          {reset.progress === "running" && reset.status?.retrying ? (
            <Text style={{ color: theme.subtext }}>
              The server is retrying this phase. This operation continues
              independently of your session.
            </Text>
          ) : null}
          {isOffline ? (
            <Text accessibilityLiveRegion="polite" style={{ color: theme.red }}>
              Offline. Reconnect to receive the actual server status.
            </Text>
          ) : null}
          {reset.error ? (
            <Text accessibilityRole="alert" style={{ color: theme.red }}>
              {reset.error}
            </Text>
          ) : null}
          {reset.clearing ? (
            <Text>Clearing this device’s session and cached school data…</Text>
          ) : null}
          <Text selectable style={{ color: theme.subtext, lineHeight: 22 }}>
            Operation: {reset.operationId}
          </Text>
          {!completed && !aborted ? (
            <Text style={{ lineHeight: 23, color: theme.subtext }}>
              Leaving this screen does not cancel the reset. Reopen progress
              here or relaunch the app to reconnect. If no receipt appears, open
              reset settings to check the saved request or review again using
              its existing operation ID. A missing receipt never cancels the
              original request.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check reset progress"
            disabled={isOffline || reset.clearing}
            onPress={reset.refresh}
            style={{
              padding: 16,
              minHeight: 48,
              borderWidth: 1,
              borderColor: theme.primary,
              opacity: isOffline ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.primary, fontWeight: "700" }}>
              Check progress
            </Text>
          </Pressable>
          {reset.progress === "unknown" && canReturnToSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review saved reset in settings"
              onPress={() => {
                if (rootNavigationRef.isReady()) {
                  rootNavigationRef.navigate("AdminSettingsResetSchoolData");
                  reset.hide();
                }
              }}
              style={{
                padding: 16,
                minHeight: 48,
                borderWidth: 1,
                borderColor: theme.primary,
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: "700" }}>
                Review saved reset in settings
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={reset.clearing || Boolean(completed && !reset.signedOut)}
            onPress={() => void close()}
            style={{
              padding: 16,
              minHeight: 48,
              backgroundColor: theme.primary,
              opacity: reset.clearing ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {completed
                ? "Sign in again"
                : aborted
                  ? canReturnToSettings
                    ? "Return to settings"
                    : isAuthenticated
                      ? "Return to app"
                      : "Return to sign in"
                  : "Leave progress screen"}
            </Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}
