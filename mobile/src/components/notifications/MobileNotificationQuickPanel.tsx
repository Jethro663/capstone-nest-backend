import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { studentDarkTheme, stripRichText } from "../../theme/studentDark";
import { colors, hexToRgba, shadow } from "../../theme/tokens";
import type { MobileNotification } from "../../types/notification";
import {
  getMobileNotificationMessage,
  openMobileNotification,
  resolveMobileNotificationAction,
} from "../../utils/mobile-notification-routing";

type Props = {
  visible: boolean;
  role: string | null;
  onClose: () => void;
  navigate: (name: string, params?: unknown) => void;
};

const theme = studentDarkTheme;

async function getNotificationsApi() {
  const module = await import("../../api/services/notifications");
  return module.notificationsApi;
}

function formatTime(value?: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notificationColor(notification: MobileNotification) {
  const joined = `${notification.type} ${notification.title} ${getMobileNotificationMessage(notification)}`.toLowerCase();
  if (joined.includes("intervention") || joined.includes("at risk")) return "#BE123C";
  if (joined.includes("assessment") || joined.includes("task")) return "#1D4ED8";
  if (joined.includes("announcement")) return "#B45309";
  return colors.primary;
}

export function MobileNotificationQuickPanel({ visible, role, onClose, navigate }: Props) {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const notificationsApi = await getNotificationsApi();
      const response = await notificationsApi.getAll({ limit: 8 });
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 15_000);
    return () => clearInterval(interval);
  }, [loadNotifications, visible]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((left, right) => {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [notifications]);

  const openNotification = async (notification: MobileNotification) => {
    if (!notification.isRead) {
      const notificationsApi = await getNotificationsApi();
      await notificationsApi.markRead(notification.id).catch(() => undefined);
      void loadNotifications();
    }
    onClose();
    await openMobileNotification(notification, role, navigate);
  };

  const seeAll = () => {
    onClose();
    navigate("Notifications");
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.42)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={[
            {
              maxHeight: "78%",
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              backgroundColor: "#F8FAFC",
              paddingBottom: 16,
              overflow: "hidden",
            },
            shadow.card,
          ]}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E2E8F0",
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 42,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#CBD5E1",
                marginBottom: 14,
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>Notifications</Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>Recent updates from your account</Text>
              </View>
              <Pressable
                accessibilityLabel="Close notifications panel"
                onPress={onClose}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#E2E8F0",
                }}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}
          >
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <MaterialCommunityIcons name="loading" size={26} color={theme.muted} />
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "800", color: theme.muted }}>Loading updates</Text>
              </View>
            ) : sortedNotifications.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  backgroundColor: colors.white,
                  paddingHorizontal: 18,
                  paddingVertical: 28,
                }}
              >
                <MaterialCommunityIcons name="inbox-outline" size={34} color={theme.muted} />
                <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "900", color: theme.text }}>
                  No recent notifications
                </Text>
                <Text style={{ marginTop: 5, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.muted }}>
                  Class updates, assessments, and alerts will appear here.
                </Text>
              </View>
            ) : (
              sortedNotifications.map((notification, index) => {
                const color = notificationColor(notification);
                const action = resolveMobileNotificationAction(notification, role);
                return (
                  <Pressable key={notification.id} onPress={() => void openNotification(notification)}>
                    <View
                      style={[
                        {
                          marginTop: index === 0 ? 0 : 9,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: notification.isRead ? "#E2E8F0" : hexToRgba(color, 0.28),
                          backgroundColor: notification.isRead ? colors.white : hexToRgba(color, 0.08),
                          paddingHorizontal: 13,
                          paddingVertical: 12,
                        },
                        shadow.card,
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                        <View
                          style={{
                            marginTop: 4,
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: notification.isRead ? "#CBD5E1" : color,
                          }}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "900", color: theme.text }}>
                              {stripRichText(notification.title)}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: theme.muted }}>
                              {formatTime(notification.createdAt)}
                            </Text>
                          </View>
                          <Text numberOfLines={2} style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.subtext }}>
                            {stripRichText(getMobileNotificationMessage(notification))}
                          </Text>
                          <Text style={{ marginTop: 8, fontSize: 10, fontWeight: "900", color }}>
                            {notification.isRead ? "READ" : "UNREAD"} - {action.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 14, paddingTop: 10 }}>
            <Pressable
              accessibilityLabel="See all notifications"
              onPress={seeAll}
              style={{
                minHeight: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: "900" }}>See All</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
