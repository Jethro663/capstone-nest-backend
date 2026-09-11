import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  rosterImportApi,
  type RosterImportPreview,
} from "../api/services/roster-import";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import type { MainTabParamList } from "../navigation/types";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminMetricStrip,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "AdminRoster">;
type ReviewTab = "registered" | "pending" | "errors";

export function AdminRosterScreen(_props: Props) {
  const network = useAdminNetworkStatus();
  const [sectionId, setSectionId] = useState("");
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("registered");
  const [commitReceipt, setCommitReceipt] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [resolveRowId, setResolveRowId] = useState("");
  const [resolvedUserId, setResolvedUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sections = useQuery({
    queryKey: ["admin-roster-sections"],
    queryFn: () => sectionsApi.getPage({ page: 1, limit: 100, isActive: true }),
  });
  const pendingRows = useQuery({
    queryKey: ["admin-roster-pending", sectionId],
    queryFn: () => rosterImportApi.getPending(sectionId),
    enabled: Boolean(sectionId),
  });
  const requireConnection = () => {
    if (!network.isOffline) return true;
    setError(
      "A live connection is required. Roster previews and writes are never queued while offline.",
    );
    return false;
  };
  const chooseFile = async () => {
    if (!sectionId || !requireConnection()) return;
    try {
      const Picker = await import("expo-document-picker");
      const selection = await Picker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });
      if (selection.canceled || !selection.assets[0]) return;
      setBusy(true);
      setError(null);
      setCommitReceipt(null);
      setPreview(await rosterImportApi.preview(sectionId, selection.assets[0]));
      setReviewTab("registered");
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    if (!preview || !requireConnection()) return;
    try {
      setBusy(true);
      setError(null);
      setCommitReceipt(await rosterImportApi.commit(sectionId, preview));
      setPreview(null);
      await pendingRows.refetch();
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const resolvePending = async () => {
    if (!resolveRowId || !resolvedUserId.trim() || !requireConnection()) return;
    try {
      setBusy(true);
      setError(null);
      await rosterImportApi.resolvePending(resolveRowId, resolvedUserId.trim());
      setResolveRowId("");
      setResolvedUserId("");
      await pendingRows.refetch();
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminScreen
      title="Roster Import"
      subtitle="Select, preview, review categories, commit, then resolve pending rows"
      refreshing={sections.isRefetching || pendingRows.isRefetching}
      onRefresh={() =>
        void Promise.all([sections.refetch(), pendingRows.refetch()])
      }
    >
      {network.isOffline ? (
        <AdminNotice
          title="Offline · roster actions disabled"
          description="Cached section and pending-row data is read-only. Preview, commit, and resolution writes require a live connection and are never queued."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {error ? (
        <AdminNotice
          title="Roster action failed"
          description={error}
          tone="red"
        />
      ) : null}
      <AdminSection
        title="1. Select section"
        subtitle="Only active sections accept roster imports"
      >
        {(sections.data?.data ?? []).map((section) => (
          <AdminDataRow
            key={section.id}
            title={`Grade ${section.gradeLevel} · ${section.name}`}
            subtitle={section.schoolYear}
            status={sectionId === section.id ? "Selected" : undefined}
            statusTone="primary"
            onPress={() => {
              setSectionId(section.id);
              setPreview(null);
              setCommitReceipt(null);
            }}
          />
        ))}
        {!sections.isLoading && !(sections.data?.data ?? []).length ? (
          <AdminEmpty
            title="No active sections"
            subtitle="Create or restore a section before importing a roster."
          />
        ) : null}
        <View style={{ padding: 16 }}>
          <AdminButton
            label={busy ? "Reading file…" : "Choose CSV or Excel file"}
            icon="file-eye-outline"
            variant="solid"
            disabled={network.isOffline || busy || !sectionId}
            onPress={() => void chooseFile()}
          />
        </View>
      </AdminSection>
      {preview ? (
        <>
          <AdminMetricStrip
            items={[
              {
                label: "Registered",
                value: preview.summary.registeredCount,
                tone: "green",
              },
              {
                label: "Pending",
                value: preview.summary.pendingCount,
                tone: "amber",
              },
              {
                label: "Errors",
                value: preview.summary.errorCount,
                tone: preview.summary.errorCount ? "red" : "green",
              },
            ]}
          />
          <AdminSection
            title="2. Review parsed rows"
            subtitle={preview.sectionMatch.fileHeader}
          >
            <View style={{ padding: 12, flexDirection: "row", gap: 7 }}>
              <AdminChip
                label="Registered"
                active={reviewTab === "registered"}
                onPress={() => setReviewTab("registered")}
              />
              <AdminChip
                label="Pending"
                active={reviewTab === "pending"}
                onPress={() => setReviewTab("pending")}
              />
              <AdminChip
                label="Errors"
                active={reviewTab === "errors"}
                onPress={() => setReviewTab("errors")}
              />
            </View>
            {reviewTab === "registered"
              ? preview.registered.map((row) => (
                  <AdminDataRow
                    key={`registered-${row.rowNumber}`}
                    title={`${row.name.firstName} ${row.name.lastName}`}
                    subtitle={row.email}
                    meta={`Row ${row.rowNumber} · LRN ${row.lrn}`}
                    status={row.alreadyEnrolled ? "Already enrolled" : "Ready"}
                    statusTone={row.alreadyEnrolled ? "neutral" : "green"}
                  />
                ))
              : null}
            {reviewTab === "pending"
              ? preview.pending.map((row) => (
                  <AdminDataRow
                    key={`pending-${row.rowNumber}`}
                    title={`${row.name.firstName} ${row.name.lastName}`}
                    subtitle={row.email}
                    meta={row.reason ?? `Row ${row.rowNumber}`}
                    status="Pending"
                    statusTone="amber"
                  />
                ))
              : null}
            {reviewTab === "errors"
              ? preview.errors.map((row) => (
                  <AdminDataRow
                    key={`error-${row.rowNumber}`}
                    title={`Row ${row.rowNumber}`}
                    subtitle={
                      row.email ?? row.rawData?.join(" · ") ?? "Unreadable row"
                    }
                    meta={row.issues.join(" · ")}
                    status="Error"
                    statusTone="red"
                  />
                ))
              : null}
            <View style={{ padding: 16 }}>
              <AdminButton
                label={busy ? "Committing…" : "Commit reviewed rows"}
                icon="account-check"
                tone="green"
                variant="solid"
                disabled={
                  network.isOffline || busy || preview.summary.errorCount > 0
                }
                onPress={() =>
                  Alert.alert(
                    "Commit this roster?",
                    "Ready and pending rows will be recorded using the reviewed preview.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Commit", onPress: () => void commit() },
                    ],
                  )
                }
              />
            </View>
          </AdminSection>
        </>
      ) : null}
      {commitReceipt ? (
        <AdminSection
          title="3. Commit receipt"
          subtitle="Backend response retained for this session"
        >
          <Text
            selectable
            style={{
              padding: 16,
              color: theme.text,
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            {JSON.stringify(commitReceipt, null, 2)}
          </Text>
        </AdminSection>
      ) : null}
      {sectionId ? (
        <AdminSection
          title="4. Pending resolution"
          subtitle="Link each imported row to a confirmed user record"
        >
          {(pendingRows.data ?? []).map((row) => (
            <AdminDataRow
              key={row.id}
              title={`${row.firstName} ${row.lastName}`}
              subtitle={row.rosterEmail ?? row.email ?? "No email"}
              meta={row.lrn ? `LRN ${row.lrn}` : undefined}
              status={row.resolvedAt ? "Resolved" : "Needs match"}
              statusTone={row.resolvedAt ? "green" : "amber"}
              onPress={() => {
                setResolveRowId(row.id);
                setResolvedUserId(row.resolvedUserId ?? "");
              }}
            />
          ))}
          {!pendingRows.isLoading && !(pendingRows.data ?? []).length ? (
            <AdminEmpty
              title="No pending rows"
              subtitle="Every imported row is resolved or no import has been committed."
            />
          ) : null}
          {resolveRowId ? (
            <View style={{ padding: 16, gap: 8 }}>
              <AdminField
                label="Confirmed user ID"
                value={resolvedUserId}
                onChangeText={setResolvedUserId}
                autoCapitalize="none"
              />
              <AdminButton
                label={busy ? "Resolving…" : "Resolve selected row"}
                tone="green"
                variant="solid"
                disabled={network.isOffline || busy || !resolvedUserId.trim()}
                onPress={() => void resolvePending()}
              />
            </View>
          ) : null}
        </AdminSection>
      ) : null}
    </AdminScreen>
  );
}
