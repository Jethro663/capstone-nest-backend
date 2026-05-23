import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { notificationsApi } from "../api/services/notifications";
import type { MainTabParamList } from "../navigation/types";
import { resolveMobileRole } from "../navigation/role-resolver";
import { useAuth } from "../providers/AuthProvider";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import { colors, hexToRgba, shadow } from "../theme/tokens";
import type { MobileNotification } from "../types/notification";
import { openMobileNotification } from "../utils/mobile-notification-routing";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;
type FilterMode = "all" | "unread" | "interventions" | "assessments";

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "interventions", label: "Interventions" },
  { id: "assessments", label: "Assessments" },
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
      bg: "#FFF1F2",
      line: "#FDA4AF",
      text: "#BE123C",
      soft: "#FFE4E6",
      label: "Intervention",
    };
  }
  if (joined.includes("assessment") || joined.includes("quiz") || joined.includes("task")) {
    return {
      icon: "clipboard-text-clock-outline" as const,
      bg: "#EFF6FF",
      line: "#93C5FD",
      text: "#1D4ED8",
      soft: "#DBEAFE",
      label: "Assessment",
    };
  }
  if (joined.includes("announcement")) {
    return {
      icon: "bullhorn-outline" as const,
      bg: "#FFFBEB",
      line: "#FCD34D",
      text: "#B45309",
      soft: "#FEF3C7",
      label: "Announcement",
    };
  }
  return {
    icon: "bell-ring-outline" as const,
    bg: "#F8FAFC",
    line: "#CBD5E1",
    text: colors.primary,
    soft: "#EEF2FF",
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

function CountPill({ label, value, color = colors.primary }: { label: string; value: string | number; color?: string }) {
  return (
    <View
      style={[
        {
          flex: 1,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: hexToRgba(color, 0.22),
          backgroundColor: colors.white,
          paddingHorizontal: 12,
          paddingVertical: 12,
        },
        shadow.card,
      ]}
    >
      <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
        {label}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "900", color }}>{value}</Text>
    </View>
  );
}

export function NotificationsInboxScreen({ navigation }: Props) {
  const { user } = useAuth();
  const role = resolveMobileRole(user?.roles);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const notificationsQuery = useQuery({
    queryKey: ["mobile-notifications", "inbox"],
    queryFn: () => notificationsApi.getAll({ limit: 60 }),
    refetchInterval: 15_000,
  });
  const unreadQuery = useQuery({
    queryKey: ["mobile-notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 15_000,
  });

  const notifications = useMemo(() => {
    return [...(notificationsQuery.data?.data ?? [])].sort((left, right) => {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [notificationsQuery.data?.data]);

  const unreadCount = Number(unreadQuery.data?.count ?? notifications.filter((entry) => !entry.isRead).length);
  const interventionCount = notifications.filter((entry) => toneForNotification(entry).label === "Intervention").length;
  const assessmentCount = notifications.filter((entry) => toneForNotification(entry).label === "Assessment").length;
  const filteredNotifications = notifications.filter((entry) => matchesFilter(entry, filterMode));
  const refreshing = notificationsQuery.isRefetching || unreadQuery.isRefetching;

  const openNotification = async (notification: MobileNotification) => {
    if (!notification.isRead) {
      await notificationsApi.markRead(notification.id).catch(() => undefined);
      void notificationsQuery.refetch();
      void unreadQuery.refetch();
    }

    const nav = navigation as unknown as { navigate: (name: string, params?: unknown) => void };
    await openMobileNotification(notification, role, nav.navigate);
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
      <View style={{ backgroundColor: "#071832", borderBottomWidth: 1, borderBottomColor: hexToRgba(colors.primary, 0.22) }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#1D4ED8",
              }}
            >
              <MaterialCommunityIcons name="bell-badge-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", color: "#93C5FD" }}>
                Notification Center
              </Text>
              <Text style={{ marginTop: 4, fontSize: 25, fontWeight: "900", color: colors.white }}>Notifications</Text>
            </View>
          </View>
          <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.78)" }}>
            All notifications appear here: announcements, pending assessments, Learners Path alerts, and class updates.
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: "row", gap: 8 }}>
        <CountPill label="Unread" value={unreadCount} color="#1D4ED8" />
        <CountPill label="Intervention" value={interventionCount} color="#BE123C" />
        <CountPill label="Tasks" value={assessmentCount} color="#B45309" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
        {FILTERS.map((filter) => {
          const active = filterMode === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setFilterMode(filter.id)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? colors.primary : "#CBD5E1",
                backgroundColor: active ? "#DBEAFE" : colors.white,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "900", color: active ? colors.primary : theme.muted }}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
                          <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: "#2563EB" }} />
                        ) : null}
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
