import { useEffect, useMemo, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AdminButton,
  AdminDataRow,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import { normalizeApiError } from "../api/errors";
import { useAdminMaintenance } from "../hooks/useAdminMaintenance";
import type { RootStackParamList } from "../navigation/types";
import {
  ADMIN_MAINTENANCE_ACKNOWLEDGEMENTS,
  type AdminMaintenanceAcknowledgement,
} from "../types/admin-maintenance";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AdminSettingsMaintenance"
>;

const ACKNOWLEDGEMENT_LABELS: Record<AdminMaintenanceAcknowledgement, string> =
  {
    LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE:
      "Live classes, sections, rosters, and account state can change",
    FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED:
      "Finalized grades, submitted evidence, and audit history stay protected outside Full Reset",
  };

export function AdminMaintenanceSettingsScreen({ navigation }: Props) {
  const maintenance = useAdminMaintenance();
  const [currentPassword, setCurrentPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<
    AdminMaintenanceAcknowledgement[]
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") setCurrentPassword("");
    });
    return () => subscription.remove();
  }, []);

  const openingReady = useMemo(
    () =>
      Boolean(currentPassword) &&
      reason.trim().length >= 10 &&
      reason.trim().length <= 240 &&
      confirmation === "OPEN MAINTENANCE ACCESS" &&
      ADMIN_MAINTENANCE_ACKNOWLEDGEMENTS.every((entry) =>
        acknowledgements.includes(entry),
      ) &&
      !maintenance.isOffline &&
      !maintenance.isMutating,
    [
      acknowledgements,
      confirmation,
      currentPassword,
      maintenance.isMutating,
      maintenance.isOffline,
      reason,
    ],
  );

  const submitOpen = async () => {
    if (!openingReady) return;
    try {
      setActionError(null);
      await maintenance.open({
        currentPassword,
        confirmation: "OPEN MAINTENANCE ACCESS",
        reason: reason.trim(),
        acknowledgements,
      });
      setCurrentPassword("");
      setReason("");
      setConfirmation("");
      setAcknowledgements([]);
    } catch (error) {
      setCurrentPassword("");
      setActionError(normalizeApiError(error, { present: false }).message);
      await maintenance.refresh();
    }
  };

  const confirmOpen = () => {
    Alert.alert(
      "Open Maintenance Access?",
      "Your 15-minute, actor-bound cleanup window will start now.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open access",
          style: "destructive",
          onPress: () => void submitOpen(),
        },
      ],
    );
  };

  const confirmClose = () => {
    Alert.alert(
      "Close Maintenance Access?",
      "Normal workflow checks resume immediately for your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close now",
          style: "destructive",
          onPress: () => void maintenance.close(),
        },
      ],
    );
  };

  const toggle = (entry: AdminMaintenanceAcknowledgement) => {
    setAcknowledgements((current) =>
      current.includes(entry)
        ? current.filter((value) => value !== entry)
        : [...current, entry],
    );
  };

  const status = maintenance.status;
  return (
    <AdminScreen
      title="Maintenance Access"
      subtitle="Short, audited administrator access for academic cleanup"
      showBackButton
      onBackPress={navigation.goBack}
      refreshing={maintenance.isFetching}
      onRefresh={() => void maintenance.refresh()}
    >
      {maintenance.isOffline ? (
        <AdminNotice
          title={
            maintenance.isCachedOffline ? "Offline · cached status" : "Offline"
          }
          description="Reconnect before opening or closing access. Maintenance writes are never queued."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {maintenance.error && !status ? (
        <AdminNotice
          title="Maintenance Access unavailable"
          description="No relaxed capability is assumed. Pull to refresh."
          tone="red"
          icon="alert-circle-outline"
        />
      ) : null}
      {actionError ? (
        <AdminNotice
          title="Action rejected"
          description={actionError}
          tone="red"
          icon="alert-circle-outline"
        />
      ) : null}
      {status?.state === "unavailable" ? (
        <AdminNotice
          title="Maintenance Access is disabled"
          description="The deployment operator must enable this capability."
          tone="neutral"
          icon="shield-lock-outline"
        />
      ) : null}

      {status?.active ? (
        <AdminSection
          title="Maintenance Access is active"
          subtitle={`Expires ${status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "at an unavailable time"}`}
        >
          <View style={{ padding: 16 }}>
            <AdminButton
              label={maintenance.isMutating ? "Closing…" : "Close access now"}
              tone="red"
              variant="solid"
              onPress={confirmClose}
              disabled={maintenance.isOffline || maintenance.isMutating}
            />
          </View>
        </AdminSection>
      ) : status?.available ? (
        <>
          <AdminNotice
            title="Normal safeguards are active"
            description="Open access once, then use the regular administrator screens without repeated password prompts."
            tone="green"
            icon="shield-check-outline"
          />
          <AdminSection
            title="Open a 15-minute window"
            subtitle="All fields are required; the password is cleared after every attempt"
          >
            <View style={{ padding: 16, gap: 12 }}>
              <AdminField
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Describe the academic cleanup"
                multiline
                maxLength={240}
              />
              <Text style={{ fontSize: 11, color: "#64748B" }}>
                {reason.trim().length}/240 · minimum 10 characters
              </Text>
              <AdminField
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <AdminField
                label="Type OPEN MAINTENANCE ACCESS"
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </AdminSection>
          <AdminSection
            title="Confirm the boundary"
            subtitle="Tap every statement before opening access"
          >
            {ADMIN_MAINTENANCE_ACKNOWLEDGEMENTS.map((entry) => (
              <AdminDataRow
                key={entry}
                title={ACKNOWLEDGEMENT_LABELS[entry]}
                status={
                  acknowledgements.includes(entry) ? "Confirmed" : "Required"
                }
                statusTone={
                  acknowledgements.includes(entry) ? "green" : "amber"
                }
                onPress={() => toggle(entry)}
              />
            ))}
            <View style={{ padding: 16 }}>
              <AdminButton
                label={maintenance.isMutating ? "Opening…" : "Review and open"}
                tone="red"
                variant="solid"
                onPress={confirmOpen}
                disabled={!openingReady}
              />
            </View>
          </AdminSection>
        </>
      ) : null}

      {status ? (
        <AdminSection
          title="Still protected"
          subtitle="Full Reset is the separate whole-school exception"
        >
          {status.protectedRules.map((rule) => (
            <AdminDataRow
              key={rule.code}
              title={rule.label}
              subtitle={rule.description}
              status="Protected"
              statusTone="green"
            />
          ))}
        </AdminSection>
      ) : null}
    </AdminScreen>
  );
}
