import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { Animated, AppState, Easing, Image, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notificationsApi } from "../api/services/notifications";
import { rootNavigationRef } from "../navigation/navigation-ref";
import { resolveMobileRole } from "../navigation/role-resolver";
import { colors, hexToRgba, radii, shadow } from "../theme/tokens";
import type { MobileNotification } from "../types/notification";
import { useAuth } from "./AuthProvider";

const INTERVENTION_TERMS = [
  "intervention",
  "at risk",
  "at-risk",
  "flagged",
  "learners path",
  "support plan",
  "checklist",
];
const ASSESSMENT_TYPES = new Set(["assessment_assigned", "assessment_due", "assessment_graded"]);
const NOTIFICATION_POLL_MS = 4000;
const AUTO_DISMISS_MS = 7800;
const NATIVE_NOTIFICATION_CHANNEL_ID = "nexora-live";
const NATIVE_NOTIFICATION_PREFIX = "nexora-notification";
const NOTIFICATION_TAP_RETRY_MS = 320;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch {
  // Expo notifications can be unavailable in lightweight test/runtime shells.
}

type LiveNotificationContextValue = {
  unreadCount: number;
  dismissActive: () => void;
};

const LiveNotificationContext = createContext<LiveNotificationContextValue | undefined>(undefined);

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function messageFromNotification(notification: Pick<MobileNotification, "message" | "body">) {
  const message = notification.message?.trim();
  if (message) return message;
  return notification.body?.trim() || "A new update is available.";
}

function readPayloadString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function notificationToNativeData(notification: MobileNotification, role: string | null) {
  return {
    source: NATIVE_NOTIFICATION_PREFIX,
    notificationId: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body || "",
    message: messageFromNotification(notification),
    referenceId: notification.referenceId || "",
    createdAt: notification.createdAt,
    role: role || "",
  };
}

function notificationFromNativeData(data: Record<string, unknown> | undefined): MobileNotification | null {
  if (!data || data.source !== NATIVE_NOTIFICATION_PREFIX) return null;

  const id = readPayloadString(data.notificationId) || readPayloadString(data.id);
  const title = readPayloadString(data.title);
  const type = readPayloadString(data.type);

  if (!id || !title || !type) return null;

  return {
    id,
    userId: readPayloadString(data.userId),
    type,
    title,
    body: readPayloadString(data.body),
    message: readPayloadString(data.message),
    isRead: false,
    referenceId: readPayloadString(data.referenceId) || null,
    createdAt: readPayloadString(data.createdAt) || new Date().toISOString(),
  };
}

function isInterventionAlertNotification(
  notification: Pick<MobileNotification, "type" | "title" | "message" | "body">,
) {
  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ""} ${notification.body ?? ""}`,
  );
  return INTERVENTION_TERMS.some((term) => joined.includes(term));
}

function shouldSurfaceNotificationOnHydration(notification: MobileNotification) {
  return !notification.isRead;
}

function navigateToMainTab(tabName: string) {
  if (!rootNavigationRef.isReady()) return false;
  (rootNavigationRef.navigate as unknown as (name: string, params?: unknown) => void)("MainTabs", { screen: tabName });
  return true;
}

function resolveNotificationNavigation(notification: MobileNotification, role: string | null) {
  const normalizedRole = String(role || "").toLowerCase();
  const referenceId = notification.referenceId || undefined;

  if (isInterventionAlertNotification(notification)) {
    if (normalizedRole === "teacher") {
      return referenceId
        ? () => rootNavigationRef.navigate("TeacherInterventionDetail", { caseId: referenceId })
        : () => rootNavigationRef.navigate("TeacherInterventions", undefined);
    }
    return () => rootNavigationRef.navigate("LXP", { tab: "case" });
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (normalizedRole === "teacher") {
      return referenceId
        ? () => rootNavigationRef.navigate("TeacherAssessmentDetail", { assessmentId: referenceId })
        : () => navigateToMainTab("Assessments");
    }
    return () => rootNavigationRef.navigate("AssessmentHistory", referenceId ? { assessmentId: referenceId } : undefined);
  }

  if (notification.type === "announcement_posted") {
    if (normalizedRole === "teacher") {
      return () => rootNavigationRef.navigate("TeacherAnnouncements");
    }
    return () => navigateToMainTab("Announcements");
  }

  if (notification.type === "discussion_thread_posted" || notification.type === "discussion_comment_posted") {
    return () => navigateToMainTab("Classes");
  }

  if (notification.type === "grade_updated") {
    if (normalizedRole === "teacher") {
      return () => rootNavigationRef.navigate("TeacherClassRecord");
    }
    return () => rootNavigationRef.navigate("Performance");
  }

  return () => navigateToMainTab(normalizedRole === "teacher" ? "Home" : "Dashboard");
}

function navigateToNotification(notification: MobileNotification, role: string | null) {
  if (!rootNavigationRef.isReady()) return false;
  resolveNotificationNavigation(notification, role)();
  return true;
}

const interventionCharacterSource = () => require("../../assets/ja/ja_live_notify.png");
const notificationCharacterSource = () => require("../../assets/ja/ja_wave.png");

export function LiveNotificationProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeNotification, setActiveNotification] = useState<MobileNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<MobileNotification[]>([]);
  const hydratedRef = useRef(false);
  const activeRef = useRef<MobileNotification | null>(null);
  const mountedRef = useRef(true);
  const pollInFlightRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeReadyRef = useRef(false);
  const nativeDeniedRef = useRef(false);
  const scheduledNativeIdsRef = useRef<Set<string>>(new Set());
  const pendingNativeOpenRef = useRef<MobileNotification | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const slide = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const role = resolveMobileRole(user?.roles);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, []);

  const ensureNativeNotificationsReady = useCallback(async () => {
    if (nativeReadyRef.current) return true;
    if (nativeDeniedRef.current) return false;

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(NATIVE_NOTIFICATION_CHANNEL_ID, {
          name: "Nexora live alerts",
          importance: Notifications.AndroidImportance.HIGH,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 260, 120, 260],
          lightColor: "#E3062C",
          enableVibrate: true,
          showBadge: true,
        });
      }

      const current = await Notifications.getPermissionsAsync();
      let status = current.status;

      if (status !== "granted" && current.canAskAgain !== false) {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }

      const granted = status === "granted";
      nativeReadyRef.current = granted;
      nativeDeniedRef.current = !granted;
      return granted;
    } catch {
      nativeDeniedRef.current = true;
      return false;
    }
  }, []);

  const scheduleNativeNotification = useCallback(
    async (notification: MobileNotification) => {
      if (scheduledNativeIdsRef.current.has(notification.id)) return;

      const ready = await ensureNativeNotificationsReady();
      if (!ready) return;

      scheduledNativeIdsRef.current.add(notification.id);
      const interventionAlert = isInterventionAlertNotification(notification);

      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${NATIVE_NOTIFICATION_PREFIX}:${notification.id}`,
          content: {
            title: interventionAlert ? `JA alert: ${notification.title}` : notification.title,
            body: messageFromNotification(notification),
            data: notificationToNativeData(notification, role),
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            color: interventionAlert ? "#BE123C" : "#0F172A",
            vibrate: interventionAlert ? [0, 280, 120, 280] : [0, 180],
            autoDismiss: true,
          },
          trigger: Platform.OS === "android" ? { channelId: NATIVE_NOTIFICATION_CHANNEL_ID } : null,
        });
      } catch {
        scheduledNativeIdsRef.current.delete(notification.id);
      }
    },
    [ensureNativeNotificationsReady, role],
  );

  const openOrDeferNativeNotification = useCallback(
    (notification: MobileNotification) => {
      setUnreadCount((current) => Math.max(0, current - 1));
      void notificationsApi.markRead(notification.id).catch(() => {
        // Keep the tap path resilient even if the read-state request is interrupted.
      });

      if (navigateToNotification(notification, role)) {
        pendingNativeOpenRef.current = null;
        return;
      }

      pendingNativeOpenRef.current = notification;
      setTimeout(() => {
        const pending = pendingNativeOpenRef.current;
        if (pending && navigateToNotification(pending, role)) {
          pendingNativeOpenRef.current = null;
        }
      }, NOTIFICATION_TAP_RETRY_MS);
    },
    [role],
  );

  const tryShowNext = useCallback(() => {
    if (activeRef.current || queueRef.current.length === 0) return;
    const next = queueRef.current.shift() ?? null;
    if (!next) return;
    activeRef.current = next;
    setActiveNotification(next);
  }, []);

  const dismissActive = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: -120,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!mountedRef.current) return;
      activeRef.current = null;
      setActiveNotification(null);
    });
  }, [opacity, slide]);

  const openNotification = useCallback(
    (notification: MobileNotification) => {
      if (!rootNavigationRef.isReady()) {
        pendingNativeOpenRef.current = notification;
        dismissActive();
        return;
      }

      setUnreadCount((current) => (notification.isRead ? current : Math.max(0, current - 1)));
      void notificationsApi.markRead(notification.id).catch(() => {
        // Navigation matters more than a transient read-state failure.
      });

      dismissActive();
      setTimeout(() => {
        navigateToNotification(notification, role);
      }, 230);
    },
    [dismissActive, role],
  );

  useEffect(() => {
    if (!activeNotification) {
      tryShowNext();
      return;
    }

    const interventionAlert = isInterventionAlertNotification(activeNotification);
    slide.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(0.8)),
        useNativeDriver: true,
      }),
    ]).start();

    if (interventionAlert) {
      pulse.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1250,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      autoDismissTimerRef.current = setTimeout(() => {
        dismissActive();
      }, AUTO_DISMISS_MS + 2600);

      return () => {
        loop.stop();
        pulse.stopAnimation(() => pulse.setValue(0));
        if (autoDismissTimerRef.current) {
          clearTimeout(autoDismissTimerRef.current);
          autoDismissTimerRef.current = null;
        }
      };
    }

    autoDismissTimerRef.current = setTimeout(() => {
      dismissActive();
    }, AUTO_DISMISS_MS);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeNotification, dismissActive, opacity, pulse, slide, tryShowNext]);

  const pollNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id || pollInFlightRef.current) return;

    pollInFlightRef.current = true;
    try {
      const [listResponse, unread] = await Promise.all([
        notificationsApi.getAll({ limit: 25 }),
        notificationsApi.getUnreadCount(),
      ]);

      if (!mountedRef.current) return;
      setUnreadCount(Math.max(0, Number(unread?.count ?? 0)));

      const rows = Array.isArray(listResponse.data) ? listResponse.data : [];
      if (!hydratedRef.current) {
        const urgentUnread = rows
          .filter(shouldSurfaceNotificationOnHydration)
          .sort((left, right) => {
            const leftTs = Date.parse(left.createdAt);
            const rightTs = Date.parse(right.createdAt);
            return leftTs - rightTs;
          })
          .slice(-3);

        rows.forEach((row) => {
          seenIdsRef.current.add(row.id);
        });
        hydratedRef.current = true;
        queueRef.current.push(...urgentUnread);
        urgentUnread.forEach((row) => {
          void scheduleNativeNotification(row);
        });
        tryShowNext();
        return;
      }

      const fresh = rows.filter((row) => !row.isRead && !seenIdsRef.current.has(row.id));
      if (fresh.length === 0) return;

      const orderedFresh = [...fresh].sort((left, right) => {
        const leftTs = Date.parse(left.createdAt);
        const rightTs = Date.parse(right.createdAt);
        return leftTs - rightTs;
      });

      orderedFresh.forEach((row) => {
        seenIdsRef.current.add(row.id);
        queueRef.current.push(row);
        void scheduleNativeNotification(row);
      });
      tryShowNext();
    } catch {
      // Keep UI resilient and skip transient notification failures.
    } finally {
      pollInFlightRef.current = false;
    }
  }, [isAuthenticated, scheduleNativeNotification, tryShowNext, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      seenIdsRef.current = new Set();
      queueRef.current = [];
      hydratedRef.current = false;
      activeRef.current = null;
      scheduledNativeIdsRef.current = new Set();
      pendingNativeOpenRef.current = null;
      setActiveNotification(null);
      setUnreadCount(0);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    void pollNotifications();
    pollTimerRef.current = setInterval(() => {
      void pollNotifications();
    }, NOTIFICATION_POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, pollNotifications, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === "background" || previousState === "inactive") && nextState === "active") {
        void pollNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, pollNotifications, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    void ensureNativeNotificationsReady();

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const notification = notificationFromNativeData(response.notification.request.content.data);
      if (!notification) return;
      openOrDeferNativeNotification(notification);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleResponse(response);
        if (typeof Notifications.clearLastNotificationResponseAsync === "function") {
          return Notifications.clearLastNotificationResponseAsync();
        }
        return undefined;
      })
      .catch(() => {
        // Missing or stale launch notifications should not block the app shell.
      });

    return () => {
      subscription.remove();
    };
  }, [ensureNativeNotificationsReady, isAuthenticated, openOrDeferNativeNotification, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || nativeDeniedRef.current) return;

    void Notifications.setBadgeCountAsync(Math.max(0, unreadCount)).catch(() => {
      // Some Android launchers do not support badges; the in-app count remains authoritative.
    });
  }, [isAuthenticated, unreadCount]);

  useEffect(() => {
    if (!activeNotification) {
      const pending = pendingNativeOpenRef.current;
      if (pending && navigateToNotification(pending, role)) {
        pendingNativeOpenRef.current = null;
      }
    }
  }, [activeNotification, role]);

  const interventionAlert = activeNotification ? isInterventionAlertNotification(activeNotification) : false;
  const message = activeNotification ? messageFromNotification(activeNotification) : "";
  const pulseTranslate = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const value = useMemo(
    () => ({
      unreadCount,
      dismissActive,
    }),
    [dismissActive, unreadCount],
  );

  return (
    <LiveNotificationContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {activeNotification ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 10,
              right: 10,
              zIndex: 1000,
              elevation: 1000,
            }}
          >
            <Animated.View
              style={[
                {
                  borderRadius: radii.xxl,
                  borderWidth: 1,
                  borderColor: interventionAlert ? hexToRgba("#BE123C", 0.44) : hexToRgba("#1E293B", 0.18),
                  backgroundColor: interventionAlert ? "#FFF4F4" : colors.white,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  opacity,
                  elevation: 22,
                  transform: [{ translateY: slide }],
                },
                shadow.card,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, paddingRight: 78 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: interventionAlert ? hexToRgba("#BE123C", 0.13) : hexToRgba("#4A8CF5", 0.12),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "900",
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          color: interventionAlert ? "#9F1239" : colors.blueDeep,
                        }}
                      >
                        {interventionAlert ? "Intervention alert" : "Nexora push"}
                      </Text>
                    </View>
                    {unreadCount > 0 ? (
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>
                        {unreadCount > 99 ? "99+" : unreadCount} unread
                      </Text>
                    ) : null}
                  </View>

                  <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "900", color: colors.text }}>
                    {activeNotification.title}
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{message}</Text>

                  <View style={{ marginTop: 11, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={dismissActive}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: hexToRgba("#0F172A", 0.16),
                        backgroundColor: colors.white,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.text }}>Dismiss</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openNotification(activeNotification)}
                      style={{
                        borderRadius: 14,
                        backgroundColor: interventionAlert ? "#BE123C" : "#0F172A",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.white }}>
                        View now
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: -3,
                    transform: [{ translateY: pulseTranslate }],
                  }}
                >
                  <Image
                    source={interventionAlert ? interventionCharacterSource() : notificationCharacterSource()}
                    resizeMode="contain"
                    style={{ width: 84, height: 84, opacity: interventionAlert ? 0.95 : 0.9 }}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </LiveNotificationContext.Provider>
  );
}

export function useLiveNotifications() {
  const context = useContext(LiveNotificationContext);
  if (!context) {
    throw new Error("useLiveNotifications must be used within LiveNotificationProvider");
  }
  return context;
}
