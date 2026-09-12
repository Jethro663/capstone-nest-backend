import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
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
import { adminTheme as theme } from "../theme/admin";
import { systemResetApi } from "../api/services/system-reset";
import { normalizeApiError } from "../api/errors";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import { useSystemReset } from "../providers/SystemResetProvider";
import {
  canExecuteReset,
  resetBack,
  resetRequestIsUncertain,
} from "../features/system-reset/model";
import {
  RESET_ACKNOWLEDGEMENTS,
  type ExecuteReset,
  type ResetPeriodKey,
  type ResetPreview,
} from "../types/system-reset";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AdminSettingsResetSchoolData"
>;

export function AdminSystemResetScreen({ navigation }: Props) {
  const reset = useSystemReset();
  const { isOffline } = useAdminNetworkStatus();
  const [schoolYear, setSchoolYear] = useState("");
  const [period, setPeriod] = useState<ResetPeriodKey | null>(null);
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [technical, setTechnical] = useState(false);
  const [reason, setReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [recoveryOperationId, setRecoveryOperationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false);
  const reviewedRequest = useRef<ExecuteReset | null>(null);
  const mounted = useRef(true);
  const latestSubmit = useRef<(retry?: boolean) => Promise<void>>(
    async () => {},
  );
  const capability = useQuery({
    queryKey: ["admin-system-reset", "capability"],
    queryFn: systemResetApi.capability,
    retry: false,
  });
  const validYear =
    /^\d{4}-\d{4}$/.test(schoolYear) &&
    Number(schoolYear.slice(5)) === Number(schoolYear.slice(0, 4)) + 1;
  const policy = useQuery({
    queryKey: ["admin-system-reset", "policy", schoolYear],
    queryFn: () => systemResetApi.policy(schoolYear),
    enabled: validYear && !isOffline && Boolean(capability.data?.available),
    retry: false,
  });
  const required =
    capability.data?.acknowledgements.map((item) => item.code) ?? [];
  const contractReady = RESET_ACKNOWLEDGEMENTS.every((code) =>
    required.includes(code),
  );
  const pending = Boolean(reset.operationId);
  const recovering = Boolean(
    reset.operationId &&
    recoveryOperationId === reset.operationId &&
    reset.progress === "unknown",
  );
  const locked = busy || uncertain || (pending && !recovering);
  const available = Boolean(
    capability.data?.available &&
    !capability.data.active &&
    !capability.data.blockers.length &&
    contractReady &&
    reset.ready &&
    !reset.storageError,
  );
  const expired = Boolean(preview && Date.parse(preview.expiresAt) <= now);
  const ready =
    available &&
    (!pending || recovering) &&
    !uncertain &&
    canExecuteReset({
      preview,
      input: { reason, currentPassword, confirmation, acknowledgements },
      required,
      now,
      online: !isOffline,
      busy,
    });
  const latestState = useRef({
    isOffline,
    available,
    operationId: reset.operationId,
    progress: reset.progress,
  });
  latestState.current = {
    isOffline,
    available,
    operationId: reset.operationId,
    progress: reset.progress,
  };
  const back = useCallback(() => resetBack(navigation), [navigation]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          back();
          return true;
        },
      );
      return () => subscription.remove();
    }, [back]),
  );
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      reviewedRequest.current = null;
    };
  }, []);
  useEffect(() => {
    if (reset.progress === "aborted") {
      reviewedRequest.current = null;
      setUncertain(false);
      setRecoveryOperationId(null);
      setPreview(null);
      setConfirming(false);
      setCurrentPassword("");
      setReason("");
      setConfirmation("");
      setAcknowledgements([]);
      void capability.refetch();
    }
  }, [reset.progress]);

  const clearApproval = () => {
    reviewedRequest.current = null;
    setConfirming(false);
    setCurrentPassword("");
    setReason("");
    setConfirmation("");
    setAcknowledgements([]);
  };
  const recoverReview = () => {
    if (
      !reset.operationId ||
      reset.progress !== "unknown" ||
      inFlight.current ||
      isOffline
    )
      return;
    // A missing public/owned receipt does not prove the original POST stopped.
    // Retain its UUID across a new preview and re-entered sensitive fields.
    setRecoveryOperationId(reset.operationId);
    setPreview(null);
    setUncertain(false);
    setError(null);
    clearApproval();
  };
  const checkSavedRequest = async () => {
    if (!reset.operationId || inFlight.current || isOffline) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await reset.checkOwnedOperation();
      reset.show();
    } catch {
      setError(
        "This saved request could not be verified. A missing receipt can mean the original request is still being accepted or belongs to another administrator. Keep its ID; a fresh review will reuse it.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const previewReset = async () => {
    if (
      inFlight.current ||
      !available ||
      locked ||
      isOffline ||
      !validYear ||
      !period ||
      !policy.data?.policy.periods.some((item) => item.key === period)
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setPreview(null);
    clearApproval();
    try {
      setPreview(await systemResetApi.preview({ schoolYear, period }));
    } catch (cause) {
      setError(normalizeApiError(cause, { present: false }).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const submit = async (retry = false) => {
    if (inFlight.current || isOffline || !mounted.current) return;
    if (
      !retry &&
      (!available ||
        (pending && !recovering) ||
        !canExecuteReset({
          preview,
          input: { reason, currentPassword, confirmation, acknowledgements },
          required,
          now: Date.now(),
          online: !isOffline,
          busy,
        }))
    )
      return;
    if (
      retry &&
      (!uncertain || !reviewedRequest.current || reset.progress === "running")
    )
      return;
    const request =
      reviewedRequest.current ??
      (preview
        ? {
            previewToken: preview.previewToken,
            idempotencyKey: reset.operationId ?? randomUUID(),
            reason: reason.trim(),
            currentPassword,
            confirmation,
            acknowledgements: [...acknowledgements],
          }
        : null);
    if (!request) return;
    const hadPendingOperation = pending || Boolean(recoveryOperationId);
    reviewedRequest.current = request;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    let sent = false;
    try {
      // The backend guarantees operationId === idempotencyKey, even if this response is lost.
      await reset.begin(request.idempotencyKey);
      const latest = latestState.current;
      if (
        !mounted.current ||
        latest.isOffline ||
        (!retry && !latest.available) ||
        (latest.operationId && latest.operationId !== request.idempotencyKey) ||
        (latest.operationId === request.idempotencyKey &&
          latest.progress !== "unknown") ||
        (!retry && (!preview || Date.parse(preview.expiresAt) <= Date.now()))
      ) {
        throw new Error(
          "Reset was not sent because connection, readiness or preview changed. Check the saved request before reviewing again.",
        );
      }
      sent = true;
      const accepted = await systemResetApi.execute(request);
      if (accepted.operationId !== request.idempotencyKey)
        throw new Error(
          "The server returned an unexpected reset receipt. Check progress before taking another action.",
        );
      setUncertain(false);
      setPreview(null);
      clearApproval();
      reset.show();
    } catch (cause) {
      if (
        sent &&
        (hadPendingOperation || retry || resetRequestIsUncertain(cause))
      ) {
        setUncertain(true);
        setError(
          "The original request may already be accepted. Its ID is retained. Check the saved request or retry this same reviewed request; a conflict never starts another operation.",
        );
      } else {
        if (sent)
          await reset
            .forget()
            .catch(() =>
              setError(
                "Could not clear the rejected operation from this device. Reopen progress before starting again.",
              ),
            );
        reviewedRequest.current = null;
        setCurrentPassword("");
        setError(normalizeApiError(cause, { present: false }).message);
        void capability.refetch();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  latestSubmit.current = submit;
  const confirmReset = () => {
    if (!ready) return;
    let resolved = false;
    const cancel = () => {
      if (resolved || !mounted.current) return;
      resolved = true;
      clearApproval();
    };
    Alert.alert(
      "Permanently reset school data?",
      "This clears school/test content, other accounts, files, indexes and jobs. The reviewed administrator and retained audit history remain. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: cancel },
        {
          text: "Reset permanently",
          style: "destructive",
          onPress: () => {
            if (resolved) return;
            resolved = true;
            void latestSubmit.current();
          },
        },
      ],
      { cancelable: true, onDismiss: cancel },
    );
  };
  return (
    <AdminScreen
      title="Reset school data"
      subtitle="Review exactly what will be cleared before starting again"
      showBackButton
      onBackPress={back}
    >
      <AdminNotice
        title="Irreversible testing tool"
        description="Use only when you intend to remove school and test data. This is not an academic year transition or a backup restore."
        tone="red"
      />
      {isOffline ? (
        <AdminNotice
          title="Offline"
          description="Reconnect to preview or execute. Reset requests are never queued offline."
          tone="amber"
        />
      ) : null}
      {capability.isPending ? (
        <AdminNotice
          title="Checking reset availability"
          description="Waiting for the server’s safety checks."
        />
      ) : null}
      {capability.isError ? (
        <AdminNotice
          title="Reset availability unavailable"
          description="No reset permission is assumed. Retry the check."
          tone="red"
        />
      ) : null}
      {reset.storageError ? (
        <AdminNotice
          title="Progress storage unavailable"
          description={reset.storageError}
          tone="red"
        />
      ) : null}
      {capability.data && !capability.data.available ? (
        <AdminNotice
          title="Reset is unavailable"
          description="This environment has not enabled school data reset. Resolve the server blockers before continuing."
          tone="amber"
        />
      ) : null}
      {capability.data?.available && !contractReady ? (
        <AdminNotice
          title="Reset review requirements unavailable"
          description="The server did not return all required acknowledgements. Refresh availability before continuing."
          tone="red"
        />
      ) : null}
      {capability.data?.blockers.map((item) => (
        <AdminNotice
          key={item.code}
          title={item.code}
          description={item.message}
          tone="amber"
        />
      ))}
      {capability.data?.active && !pending ? (
        <AdminNotice
          title="A reset is already active"
          description="Wait for the current operation to finish. Its result is not associated with a request from this device."
          tone="amber"
        />
      ) : null}
      {error ? (
        <AdminNotice
          title={
            uncertain ? "Request result uncertain" : "Reset could not continue"
          }
          description={error}
          tone="red"
        />
      ) : null}
      <View style={{ padding: 16, gap: 12 }}>
        <AdminButton
          label="Check availability"
          disabled={busy || isOffline}
          onPress={() => void capability.refetch()}
        />
        {pending ? (
          <AdminButton label="View reset progress" onPress={reset.show} />
        ) : null}
        {pending ? (
          <>
            <AdminButton
              label="Check saved request"
              disabled={busy || isOffline}
              onPress={() => void checkSavedRequest()}
            />
            {reset.progress === "unknown" ? (
              <AdminButton
                label="Review again with saved ID"
                disabled={busy || isOffline || !available}
                onPress={recoverReview}
              />
            ) : null}
          </>
        ) : null}
        {uncertain ? (
          <AdminButton
            label="Retry same request"
            disabled={busy || isOffline || reset.progress === "running"}
            onPress={() => void submit(true)}
          />
        ) : null}
      </View>
      {recovering ? (
        <AdminNotice
          title="Reviewing the saved request"
          description={`This review keeps operation ${recoveryOperationId}. Re-enter the calendar, reason, password and acknowledgements. If the original request was accepted, the server will keep tracking that operation instead of starting a second one.`}
          tone="amber"
        />
      ) : null}
      <AdminSection
        title="1. New academic setup"
        subtitle="Choose the school year and one of its server-defined periods"
      >
        <View style={{ padding: 16, gap: 12 }}>
          <AdminField
            label="School year"
            value={schoolYear}
            placeholder="YYYY-YYYY"
            maxLength={9}
            autoCapitalize="none"
            editable={!locked}
            onChangeText={(value) => {
              setSchoolYear(value);
              setPeriod(null);
              setPreview(null);
              clearApproval();
            }}
          />
          {schoolYear && !validYear ? (
            <Text style={{ color: theme.red }}>
              Use consecutive years, for example 2026-2027.
            </Text>
          ) : null}
          {validYear && policy.isFetching ? (
            <Text>Loading policy periods…</Text>
          ) : null}
          {policy.isError ? (
            <AdminNotice
              title="Policy unavailable"
              description="Retry the policy check. No period is assumed."
              tone="red"
            />
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {validYear
              ? policy.data?.policy.periods.map((item) => (
                  <AdminChip
                    key={item.key}
                    label={item.label}
                    active={period === item.key}
                    disabled={locked || isOffline || policy.isFetching}
                    onPress={() => {
                      setPeriod(item.key);
                      setPreview(null);
                      clearApproval();
                    }}
                  />
                ))
              : null}
          </View>
          {policy.isError ? (
            <AdminButton
              label="Retry policy check"
              disabled={isOffline}
              onPress={() => void policy.refetch()}
            />
          ) : null}
          <AdminButton
            label={busy && !confirming ? "Preparing preview…" : "Preview reset"}
            tone="red"
            disabled={
              !available ||
              locked ||
              isOffline ||
              !validYear ||
              !period ||
              policy.isFetching
            }
            onPress={() => void previewReset()}
          />
        </View>
      </AdminSection>
      {preview ? (
        <>
          <AdminSection title="2. Review cleared and kept data">
            <AdminNotice
              title={`Environment: ${preview.environment}`}
              description={`New setup: ${preview.schoolYear} · ${preview.policy.periods.find((item) => item.key === preview.period)?.label ?? preview.period}`}
            />
            <AdminNotice
              title="Cleared"
              description={`Other accounts (${Math.max((preview.counts.users ?? 0) - 1, 0)}), school/test content, classes, assessments, grades, chats, sessions, files, vectors/indexes and jobs will be removed. Your administrator’s own school content and sessions are included.`}
              tone="red"
            />
            <AdminNotice
              title="Kept"
              description="System settings, roles, APK update settings, policies, audit and repair history remain. Legacy evidence is retained in reset receipts before referenced live rows are cleared."
            />
            <AdminNotice
              title={`Retained administrator: ${preview.actor.displayName}`}
              description={`${preview.actor.email} remains with exactly one administrator role. Sign in again with these credentials when the reset completes.`}
            />
            <AdminNotice
              title="Audit history remains"
              description="This is not total historical or forensic erasure. Audit JSON and preserved repair history may still contain names and academic values."
              tone="amber"
            />
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={{ color: expired ? theme.red : theme.subtext }}>
                Preview expires: {new Date(preview.expiresAt).toLocaleString()}
                {expired ? " · Expired — generate a new preview." : ""}
              </Text>
              <AdminButton
                label={
                  technical
                    ? "Hide technical details"
                    : "Show technical details"
                }
                onPress={() => setTechnical(!technical)}
              />
              {technical ? (
                <View style={{ gap: 10 }}>
                  <Text selectable style={{ color: theme.subtext }}>
                    Schema: {preview.schemaHash}
                    {"\n"}Catalog: {preview.catalogVersion} · Epoch:{" "}
                    {preview.epoch}
                    {"\n"}Generated: {preview.generatedAt}
                  </Text>
                  {preview.tables.map((row) => (
                    <AdminDataRow
                      key={row.name}
                      title={row.name}
                      subtitle={`${row.group} · ${row.action}`}
                      status={String(row.count)}
                    />
                  ))}
                  <Text selectable style={{ color: theme.subtext }}>
                    Files, indexes and jobs:{" "}
                    {JSON.stringify(preview.external, null, 2)}
                  </Text>
                </View>
              ) : null}
              {!confirming ? (
                <AdminButton
                  label="Continue to confirmation"
                  disabled={expired || locked || isOffline || !available}
                  onPress={() => setConfirming(true)}
                />
              ) : null}
            </View>
          </AdminSection>
          {confirming ? (
            <AdminSection
              title="3. Confirm permanent reset"
              subtitle="Every acknowledgement and the exact confirmation are required"
            >
              <View style={{ padding: 16, gap: 16 }}>
                <AdminField
                  label="Reason"
                  value={reason}
                  onChangeText={setReason}
                  editable={!locked}
                  multiline
                  maxLength={500}
                  placeholder="10–500 characters explaining why you are resetting"
                />
                <AdminField
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!locked}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {capability.data?.acknowledgements.map((item) => (
                  <Pressable
                    key={item.code}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.label}
                    accessibilityState={{
                      checked: acknowledgements.includes(item.code),
                      disabled: locked,
                    }}
                    disabled={locked}
                    onPress={() =>
                      setAcknowledgements((items) =>
                        items.includes(item.code)
                          ? items.filter((code) => code !== item.code)
                          : [...items, item.code],
                      )
                    }
                    style={{
                      minHeight: 48,
                      padding: 12,
                      flexDirection: "row",
                      gap: 12,
                      borderWidth: 1,
                      borderColor: theme.borderStrong,
                    }}
                  >
                    <Text style={{ color: theme.primary }}>
                      {acknowledgements.includes(item.code) ? "☑" : "☐"}
                    </Text>
                    <Text
                      style={{ flex: 1, lineHeight: 22, color: theme.text }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
                <Text selectable style={{ lineHeight: 23, color: theme.text }}>
                  Type exactly: {preview.confirmation}
                </Text>
                <AdminField
                  label="Exact confirmation"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  editable={!locked}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AdminButton
                  label="Reset school data permanently"
                  tone="red"
                  disabled={!ready}
                  onPress={confirmReset}
                />
                <AdminButton
                  label="Cancel confirmation"
                  disabled={busy || uncertain}
                  onPress={clearApproval}
                />
              </View>
            </AdminSection>
          ) : null}
        </>
      ) : null}
    </AdminScreen>
  );
}
