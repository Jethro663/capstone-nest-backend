import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppAlert as Alert } from "../components/ui/AppAlert";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { MobileAppBar } from "../components/ui/MobileAppBar";
import { MobileFilterSheet } from "../components/ui/MobileFilterSheet";
import { notificationsApi } from "../api/services/notifications";
import type { RootStackParamList } from "../navigation/types";
import { resolveMobileRole } from "../navigation/role-resolver";
import { useAuth } from "../providers/AuthProvider";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import { colors, shadow } from "../theme/tokens";
import type { MobileNotification } from "../types/notification";
import { openMobileNotification } from "../utils/mobile-notification-routing";
import { mobileBrand } from "../theme/mobileBrand";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;
type FilterMode = "all" | "unread" | "interventions" | "assessments";

const FILTER_OPTIONS: Array<{ key: FilterMode; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "interventions", label: "Interventions" },
  { key: "assessments", label: "Assessments" },
];

function formatDate(value?: string | null) {
  if (!value) return "Just now";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Just now";
  return timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationBody(notification: MobileNotification) {
  return stripRichText(notification.message || notification.body || "Tap to view details.");
}

function toneForNotification(notification: MobileNotification) {
  const joined = `${notification.type} ${notification.title} ${notificationBody(notification)}`.toLowerCase();
  if (joined.includes("intervention") || joined.includes("at risk") || joined.includes("learner path")) {
    return {
      icon: "alert-decagram-outline" as const,
      bg: mobileBrand.redSoft,
      line: mobileBrand.dangerBorder,
      text: mobileBrand.danger,
      soft: mobileBrand.redSoft,
      label: "Intervention",
    };
  }
  if (joined.includes("assessment") || joined.includes("quiz") || joined.includes("task")) {
    return {
      icon: "clipboard-text-clock-outline" as const,
      bg: mobileBrand.infoSoft,
      line: mobileBrand.infoBorder,
      text: mobileBrand.info,
      soft: mobileBrand.infoSoft,
      label: "Assessment",
    };
  }
  if (joined.includes("announcement")) {
    return {
      icon: "bullhorn-outline" as const,
      bg: mobileBrand.warningSoft,
      line: mobileBrand.warningBorder,
      text: mobileBrand.warning,
      soft: mobileBrand.warningSoft,
      label: "Announcement",
    };
  }
  return {
    icon: "bell-ring-outline" as const,
    bg: mobileBrand.infoSoft,
    line: mobileBrand.infoBorder,
    text: colors.primary,
    soft: mobileBrand.infoSoft,
    label: "Nexora",
  };
}

function matchesFilter(notification: MobileNotification, mode: FilterMode) {
  if (mode === "all") return true;
  if (mode === "unread") return !notification.isRead;
  const tone = toneForNotification(notification);
  if (mode === "interventions") return tone.label === "Intervention";
  if (mode === "assessments") return tone.label === "Assessment";
  return true;
}

function CountFact({ emoji, label, value }: { emoji: string; label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8 }}>
      <Text accessibilityElementsHidden style={{ fontSize: 22 }}>{emoji}</Text>
      <View>
        <Text style={{ fontSize: 17, fontWeight: "900", color: mobileBrand.navy }}>{value}</Text>
        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted }}>{label}</Text>
      </View>
    </View>
  );
}

export function NotificationsInboxScreen({ navigation }: Props) {
  const { user } = useAuth();
  const role = resolveMobileRole(user?.roles);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const notificationsQuery = useQuery({
    queryKey: ["mobile-notifications", "inbox"],
    queryFn: () => notificationsApi.getAll({ limit: 60 }),
  });
  const unreadQuery = useQuery({
    queryKey: ["mobile-notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
  });

  const notifications = useMemo(() => {
    return [...(notificationsQuery.data?.data ?? [])].sort((left, right) => {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [notificationsQuery.data?.data]);

  const unreadCount = Number(unreadQuery.data?.count ?? notifications.filter((entry) => !entry.isRead).length);
  const interventionCount = notifications.filter((entry) => toneForNotification(entry).label === "Intervention").length;
  const assessmentCount = notifications.filter((entry) => toneForNotification(entry).label === "Assessment").length;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredNotifications = notifications.filter((entry) => {
    if (!matchesFilter(entry, filterMode)) return false;
    if (!normalizedSearch) return true;
    return `${entry.title} ${notificationBody(entry)} ${toneForNotification(entry).label}`.toLowerCase().includes(normalizedSearch);
  });
  const refreshing = notificationsQuery.isRefetching || unreadQuery.isRefetching;

  const returnFromNotifications = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (role === "teacher") {
      navigation.navigate("TeacherDrawer", { screen: "Home" });
      return;
    }
    navigation.navigate("MainTabs", {
      screen: role === "admin" ? "Home" : "Dashboard",
    });
  };

  const openNotification = async (notification: MobileNotification) => {
    if (!notification.isRead) {
      await notificationsApi.markRead(notification.id).catch(() => undefined);
      void notificationsQuery.refetch();
      void unreadQuery.refetch();
    }

    const nav = navigation as unknown as { navigate: (name: string, params?: unknown) => void };
    await openMobileNotification(notification, role, nav.navigate);
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      setActionError("");
      await notificationsApi.markAllRead();
      await Promise.all([notificationsQuery.refetch(), unreadQuery.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const dismissOne = async (notification: MobileNotification) => {
    try {
      setDeletingId(notification.id);
      setActionError("");
      await notificationsApi.dismissOne(notification.id);
      await Promise.all([notificationsQuery.refetch(), unreadQuery.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete this notification.");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDismissAll = () => {
    Alert.alert(
      "Clear all notifications?",
      "This removes every notification from your account inbox. Announcements, grades, and class activity will remain available in their original pages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setClearingAll(true);
                setActionError("");
                await notificationsApi.dismissAll();
                await Promise.all([notificationsQuery.refetch(), unreadQuery.refetch()]);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Unable to clear notifications.");
              } finally {
                setClearingAll(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([notificationsQuery.refetch(), unreadQuery.refetch()]);
          }}
        />
      }
    >
      <MobileAppBar
        title="Notifications"
        navigationLabel="Back"
        navigationIcon="arrow-left"
        onNavigationPress={returnFromNotifications}
        rightAction={
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              disabled={markingAll || unreadCount === 0}
              onPress={() => void markAllRead()}
              style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: mobileBrand.inverseSurface, opacity: markingAll || unreadCount === 0 ? 0.5 : 1 }}
            >
              <MaterialCommunityIcons name={markingAll ? "progress-clock" : "email-check-outline"} size={20} color={mobileBrand.white} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all notifications"
              disabled={clearingAll || notifications.length === 0}
              onPress={confirmDismissAll}
              style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: mobileBrand.inverseSurface, opacity: clearingAll || notifications.length === 0 ? 0.5 : 1 }}
            >
              <MaterialCommunityIcons name={clearingAll ? "progress-clock" : "delete-sweep-outline"} size={20} color={mobileBrand.white} />
            </Pressable>
          </View>
        }
      />

      {actionError ? (
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 12, backgroundColor: mobileBrand.redSoft, padding: 12 }}>
          <Text accessibilityLiveRegion="polite" style={{ color: mobileBrand.danger, fontSize: 12 }}>{actionError}</Text>
        </View>
      ) : null}

      <View testID="notification-count-facts" style={{ marginHorizontal: 16, marginTop: 12, flexDirection: "row", borderRadius: 16, borderWidth: 1, borderColor: mobileBrand.border, backgroundColor: mobileBrand.surface }}>
        <CountFact emoji="🔔" label="Unread" value={unreadCount} />
        <CountFact emoji="🧭" label="Interventions" value={interventionCount} />
        <CountFact emoji="📝" label="Tasks" value={assessmentCount} />
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
        <View style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: mobileBrand.borderStrong, backgroundColor: mobileBrand.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="magnify" size={19} color={mobileBrand.muted} />
          <TextInput accessibilityLabel="Search notifications" value={search} onChangeText={setSearch} placeholder="Search notifications" placeholderTextColor={mobileBrand.dim} style={{ flex: 1, color: mobileBrand.text, fontSize: 13, paddingVertical: 10 }} />
          {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear notification search" onPress={() => setSearch("")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="close-circle" size={18} color={mobileBrand.muted} /></Pressable> : null}
        </View>
        <MobileFilterSheet label="Filter notifications" activeKey={filterMode} options={FILTER_OPTIONS} onSelect={setFilterMode} resultCount={filteredNotifications.length} compact />
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={[{ marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: colors.white, padding: 22, alignItems: "center" }, shadow.card]}>
          <MaterialCommunityIcons name="inbox-outline" size={34} color={theme.muted} />
          <Text style={{ marginTop: 12, fontSize: 15, fontWeight: "900", color: theme.text }}>No notifications here yet</Text>
          <Text style={{ marginTop: 6, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.muted }}>
            Pull down to refresh. New alerts will also pop up while you are using the app.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 8, paddingBottom: 20 }}>
          {filteredNotifications.map((notification, index) => {
            const tone = toneForNotification(notification);
            return (
              <Pressable key={notification.id} onPress={() => void openNotification(notification)}>
                <View
                  style={[
                    {
                      marginHorizontal: 16,
                      marginTop: index === 0 ? 6 : 10,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: tone.line,
                      backgroundColor: tone.bg,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                    },
                    shadow.card,
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: tone.soft,
                      }}
                    >
                      <MaterialCommunityIcons name={tone.icon} size={19} color={tone.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "900", color: theme.text }}>
                          {stripRichText(notification.title)}
                        </Text>
                        {!notification.isRead ? (
                          <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: mobileBrand.info }} />
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${stripRichText(notification.title)}`}
                          disabled={deletingId === notification.id}
                          onPress={(event) => {
                            event.stopPropagation();
                            void dismissOne(notification);
                          }}
                          hitSlop={8}
                          style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: mobileBrand.inverseMuted, opacity: deletingId === notification.id ? 0.5 : 1 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={17} color={mobileBrand.danger} />
                        </Pressable>
                      </View>
                      <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>
                        {tone.label} - {formatDate(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 19, color: theme.subtext }}>
                    {notificationBody(notification)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenScroll>
  );
}
