import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { useStudentInterventionAlerts } from "../api/hooks";
import { rootNavigationRef } from "../navigation/navigation-ref";
import { resolveMobileRole } from "../navigation/role-resolver";
import { colors } from "../theme/tokens";
import type { StudentInterventionAlert } from "../types/lxp";
import { boundAcademicPercentage } from "../lib/academicScore";
import { useAuth } from "./AuthProvider";

function getSubjectLabel(alert: StudentInterventionAlert) {
  return alert.subjectCode || "Subject intervention";
}

function getScoreLabel(alert: StudentInterventionAlert) {
  if (typeof alert.triggerScore !== "number") return null;
  return `${boundAcademicPercentage(alert.triggerScore).toFixed(1)}%`;
}

export function StudentInterventionAlertProvider({
  children,
}: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const isStudent =
    isAuthenticated && resolveMobileRole(user?.roles) === "student";
  const userKey = user?.userId || user?.id || null;
  const alertsQuery = useStudentInterventionAlerts(isStudent);
  const [visible, setVisible] = useState(false);
  const [shownForUserId, setShownForUserId] = useState<string | null>(null);

  const alerts = alertsQuery.data?.alerts ?? [];
  const actionableAlert = useMemo(
    () =>
      alerts.find(
        (alert) => alert.status === "active" && alert.hasAssignedPath,
      ) ?? null,
    [alerts],
  );

  useEffect(() => {
    if (!isStudent || !userKey) {
      setVisible(false);
      setShownForUserId(null);
      return;
    }

    if ((alertsQuery.data?.count ?? 0) > 0 && shownForUserId !== userKey) {
      setShownForUserId(userKey);
      setVisible(true);
    }
  }, [alertsQuery.data?.count, isStudent, shownForUserId, userKey]);

  const close = () => setVisible(false);

  const openLearnersPath = () => {
    if (!actionableAlert) return;
    close();
    if (!rootNavigationRef.isReady()) return;
    rootNavigationRef.navigate("LXP", {
      classId: actionableAlert.classId,
      tab: "case",
    });
  };

  return (
    <>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={visible && alerts.length > 0}
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 22,
            backgroundColor: "rgba(15,23,42,0.42)",
          }}
        >
          <View
            style={{
              borderRadius: 18,
              backgroundColor: colors.white,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.22,
              shadowRadius: 30,
              elevation: 10,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFE4E6",
                }}
              >
                <MaterialCommunityIcons
                  name="account-alert-outline"
                  size={24}
                  color="#BE123C"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  Intervention Alerts
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 16, gap: 10 }}>
              {alerts.map((alert) => {
                const scoreLabel = getScoreLabel(alert);
                return (
                  <View
                    key={alert.caseId}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#FECACA",
                      backgroundColor: "#FFF7F7",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: "900",
                      }}
                    >
                      {getSubjectLabel(alert)}
                    </Text>
                    {alert.subjectName ? (
                      <Text
                        style={{
                          marginTop: 3,
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {alert.subjectName}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        marginTop: 6,
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {alert.status === "pending"
                        ? "Pending teacher review"
                        : "Support path active"}
                      {scoreLabel ? ` · Score ${scoreLabel}` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View
              style={{
                marginTop: 18,
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={close}
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  Dismiss
                </Text>
              </Pressable>
              {actionableAlert ? (
                <Pressable
                  onPress={openLearnersPath}
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: "#BE123C",
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Open LXP
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
