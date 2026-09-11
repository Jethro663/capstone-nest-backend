import { useEffect, useMemo, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import { normalizeApiError } from "../api/errors";
import { useAdminDemoMode } from "../hooks/useAdminDemoMode";
import type { RootStackParamList } from "../navigation/types";
import {
  ADMIN_DEMO_MODE_ACKNOWLEDGEMENTS,
  type AdminDemoModeAcknowledgement,
} from "../types/admin-demo-mode";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AdminSettingsDemoMode"
>;

const DURATIONS = [15, 30, 60, 120] as const;
const ACKNOWLEDGEMENT_LABELS: Record<AdminDemoModeAcknowledgement, string> = {
  SHARED_DATA_CAN_CHANGE: "Shared demonstration data can change",
  ACTIONS_REMAIN_AUDITED: "Every action remains attributed and audited",
  HARD_SAFEGUARDS_REMAIN: "Hard integrity and evidence safeguards remain",
};

export function AdminDemoModeSettingsScreen({ navigation }: Props) {
  const demoMode = useAdminDemoMode();
  const [currentPassword, setCurrentPassword] = useState("");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<15 | 30 | 60 | 120>(
    30,
  );
  const [confirmation, setConfirmation] = useState("");
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<
    AdminDemoModeAcknowledgement[]
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") setCurrentPassword("");
    });
    return () => subscription.remove();
  }, []);

  const activationReady = useMemo(
    () =>
      Boolean(currentPassword) &&
      reason.trim().length >= 10 &&
      reason.trim().length <= 240 &&
      confirmation === "ENABLE DEMO MODE" &&
      ADMIN_DEMO_MODE_ACKNOWLEDGEMENTS.every((entry) =>
        acknowledgements.includes(entry),
      ) &&
      !demoMode.isOffline &&
      !demoMode.isMutating,
    [
      acknowledgements,
      confirmation,
      currentPassword,
      demoMode.isMutating,
      demoMode.isOffline,
      reason,
    ],
  );

  const submitActivation = async () => {
    if (!activationReady || !demoMode.status) return;
    try {
      setActionError(null);
      await demoMode.activate({
        currentPassword,
        confirmation: "ENABLE DEMO MODE",
        reason: reason.trim(),
        durationMinutes,
        expectedVersion: demoMode.status.version,
        acknowledgements,
      });
      setCurrentPassword("");
      setConfirmation("");
      setAcknowledgements([]);
    } catch (error) {
      setCurrentPassword("");
      setActionError(normalizeApiError(error, { present: false }).message);
      await demoMode.refresh();
    }
  };

  const confirmActivation = () => {
    Alert.alert(
      "Activate Demo mode?",
      `Relaxed admin workflows will remain active for ${durationMinutes} minutes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          style: "destructive",
          onPress: () => void submitActivation(),
        },
      ],
    );
  };

  const submitDeactivation = async () => {
    if (
      !demoMode.status ||
      deactivateConfirmation !== "DISABLE DEMO MODE" ||
      demoMode.isOffline ||
      demoMode.isMutating
    )
      return;
    try {
      setActionError(null);
      await demoMode.deactivate({
        confirmation: "DISABLE DEMO MODE",
        expectedVersion: demoMode.status.version,
      });
      setCurrentPassword("");
      setDeactivateConfirmation("");
    } catch (error) {
      setCurrentPassword("");
      setActionError(normalizeApiError(error, { present: false }).message);
      await demoMode.refresh();
    }
  };

  const confirmDeactivation = () => {
    Alert.alert(
      "Disable Demo mode now?",
      "Normal administrator safeguards will resume immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable now",
          style: "destructive",
          onPress: () => void submitDeactivation(),
        },
      ],
    );
  };

  const toggleAcknowledgement = (entry: AdminDemoModeAcknowledgement) => {
    setAcknowledgements((current) =>
      current.includes(entry)
        ? current.filter((value) => value !== entry)
        : [...current, entry],
    );
  };

  const status = demoMode.status;
  const loading = demoMode.isLoading && !status;
  return (
    <AdminScreen
      title="Demo Mode"
      subtitle="Time-bound administrator flexibility for evaluator walkthroughs"
      showBackButton
      onBackPress={navigation.goBack}
      refreshing={demoMode.isFetching}
      onRefresh={() => void demoMode.refresh()}
    >
      {demoMode.isOffline ? (
        <AdminNotice
          title={demoMode.isCachedOffline ? "Offline · cached status" : "Offline"}
          description="Reconnect before activating or disabling Demo mode. These writes are never queued."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {loading ? (
        <AdminNotice
          title="Loading Demo mode"
          description="Checking the server-owned capability window."
        />
      ) : null}
      {demoMode.error && !status ? (
        <AdminNotice
          title="Demo mode status unavailable"
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
          title="Demo mode is unavailable"
          description="The server has not enabled this deployment capability. Normal safeguards remain active."
          tone="neutral"
          icon="shield-lock-outline"
        />
      ) : null}
      {status?.state === "expired" ? (
        <AdminNotice
          title="Demo mode expired"
          description="Normal safeguards have resumed. Review current state before starting another window."
          tone="amber"
          icon="timer-off-outline"
        />
      ) : null}

      {status?.active ? (
        <>
          <AdminNotice
            title="Demo mode is active"
            description={`Expires ${status.expiresAt ? new Date(status.expiresAt).toLocaleString() : "at an unavailable time"}. Actions remain audited.`}
            tone="red"
            icon="shield-alert-outline"
          />
          <AdminSection
            title="Resume normal safeguards"
            subtitle="Disable early when the evaluator walkthrough is complete"
          >
            <View style={{ padding: 16, gap: 12 }}>
              <AdminField
                label="Type DISABLE DEMO MODE"
                value={deactivateConfirmation}
                onChangeText={setDeactivateConfirmation}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <AdminButton
                label={demoMode.isMutating ? "Disabling…" : "Disable Demo mode"}
                tone="red"
                variant="solid"
                onPress={confirmDeactivation}
                disabled={
                  deactivateConfirmation !== "DISABLE DEMO MODE" ||
                  demoMode.isOffline ||
                  demoMode.isMutating
                }
              />
            </View>
          </AdminSection>
        </>
      ) : status?.available ? (
        <>
          <AdminNotice
            title="Normal safeguards are active"
            description="Start a short Demo mode window only for a reviewed evaluator walkthrough."
            tone="green"
            icon="shield-check-outline"
          />
          <AdminSection
            title="Activation details"
            subtitle="All fields are required; the password is cleared after every attempt"
          >
            <View style={{ padding: 16, gap: 12 }}>
              <AdminField
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Describe the evaluator walkthrough"
                multiline
                maxLength={240}
              />
              <Text style={{ fontSize: 11, color: "#64748B" }}>
                {reason.trim().length}/240 · minimum 10 characters
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#475569" }}>
                Duration
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DURATIONS.map((duration) => (
                  <AdminChip
                    key={duration}
                    label={`${duration} minutes`}
                    active={durationMinutes === duration}
                    onPress={() => setDurationMinutes(duration)}
                  />
                ))}
              </View>
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
                label="Type ENABLE DEMO MODE"
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </AdminSection>
          <AdminSection
            title="Confirm what stays protected"
            subtitle="Tap every statement before activation"
          >
            {ADMIN_DEMO_MODE_ACKNOWLEDGEMENTS.map((entry) => (
              <AdminDataRow
                key={entry}
                title={ACKNOWLEDGEMENT_LABELS[entry]}
                status={acknowledgements.includes(entry) ? "Confirmed" : "Required"}
                statusTone={acknowledgements.includes(entry) ? "green" : "amber"}
                onPress={() => toggleAcknowledgement(entry)}
              />
            ))}
            <View style={{ padding: 16 }}>
              <AdminButton
                label={demoMode.isMutating ? "Activating…" : "Review and activate"}
                tone="red"
                variant="solid"
                onPress={confirmActivation}
                disabled={!activationReady}
              />
            </View>
          </AdminSection>
        </>
      ) : null}

      {status ? (
        <AdminSection
          title="Permanent safeguards"
          subtitle="These protections never switch off"
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
