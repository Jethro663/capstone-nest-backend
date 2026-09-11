import { useState } from "react";
import { Alert, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { classRecordApi } from "../api/services/class-record";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import type { TransmutationPreviewResult } from "../types/class-record";
import {
  AdminButton,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminMetricStrip,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "AdminClassRecord">;

export function AdminClassRecordScreen(_props: Props) {
  const queryClient = useQueryClient();
  const tables = useQuery({
    queryKey: ["admin-transmutation-tables"],
    queryFn: () => classRecordApi.getAllTransmutationTables(),
  });
  const active = useQuery({
    queryKey: ["admin-transmutation-active"],
    queryFn: () => classRecordApi.getActiveTransmutationTable(),
  });
  const [preview, setPreview] = useState<TransmutationPreviewResult | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choosePdf = async () => {
    try {
      const Picker = await import("expo-document-picker");
      const file = await Picker.getDocumentAsync({ type: "application/pdf" });
      if (file.canceled || !file.assets[0]) return;
      setBusy(true);
      setError(null);
      const result = await classRecordApi.previewTransmutationTable(
        file.assets[0],
      );
      setPreview(result);
      setTitle(result.title);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!preview?.isValid || !title.trim()) return;
    try {
      setBusy(true);
      setError(null);
      await classRecordApi.applyTransmutationTable({
        title: title.trim(),
        description: description.trim() || undefined,
        bands: preview.bands,
      });
      setPreview(null);
      setTitle("");
      setDescription("");
      await queryClient.invalidateQueries({
        queryKey: ["admin-transmutation-tables"],
      });
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const activate = async (id: string) => {
    try {
      setBusy(true);
      setError(null);
      await classRecordApi.activateTransmutationTable(id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-transmutation-tables"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-transmutation-active"],
        }),
      ]);
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminScreen
      title="Class Record"
      subtitle="Transmutation defaults for legacy school-year policies"
      refreshing={tables.isRefetching || active.isRefetching}
      onRefresh={() => void Promise.all([tables.refetch(), active.refetch()])}
    >
      {error ? (
        <AdminNotice
          title="Transmutation action failed"
          description={error}
          tone="red"
        />
      ) : null}
      <AdminSection
        title="Active table"
        subtitle="Academic years freeze the policy selected by backend rules"
      >
        {active.data ? (
          <AdminDataRow
            title={active.data.title}
            subtitle={active.data.description ?? "No description"}
            status="Active"
            statusTone="green"
          />
        ) : (
          <AdminEmpty
            title="No active table"
            subtitle="Review the available tables or import an approved PDF."
          />
        )}
      </AdminSection>
      <AdminMetricStrip
        items={[
          { label: "Tables", value: tables.data?.length ?? 0 },
          {
            label: "Active bands",
            value:
              (active.data as { bands?: unknown[] } | undefined)?.bands
                ?.length ?? 0,
          },
        ]}
      />
      <AdminSection
        title="Available tables"
        subtitle="Activation affects future compatible calculations; existing frozen policies remain authoritative"
      >
        {(tables.data ?? []).map((table) => (
          <AdminDataRow
            key={table.id}
            title={table.title}
            subtitle={`${table.bands.length} bands${table.isSystemDefault ? " · system default" : ""}`}
            status={table.isActive ? "Active" : "Available"}
            statusTone={table.isActive ? "green" : "neutral"}
            right={
              !table.isActive ? (
                <AdminButton
                  label="Activate"
                  variant="text"
                  tone="green"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Activate this table?",
                      "The backend will make it active for applicable future policy snapshots.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Activate",
                          onPress: () => void activate(table.id),
                        },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
        ))}
      </AdminSection>
      <AdminSection
        title="Import approved transmutation PDF"
        subtitle="Preview and validate every band before applying"
      >
        <View style={{ padding: 16, gap: 10 }}>
          <AdminButton
            label={busy ? "Reading PDF…" : "Choose PDF and preview"}
            icon="file-pdf-box"
            variant="solid"
            disabled={busy}
            onPress={() => void choosePdf()}
          />
          {preview ? (
            <>
              <AdminNotice
                title={preview.isValid ? "Valid preview" : "Invalid preview"}
                description={`${preview.filename} · ${preview.bandCount} bands${preview.validationMessage ? ` · ${preview.validationMessage}` : ""}`}
                tone={preview.isValid ? "green" : "red"}
              />
              <AdminField
                label="Table title"
                value={title}
                onChangeText={setTitle}
              />
              <AdminField
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              {preview.bands.slice(0, 12).map((band, index) => (
                <AdminDataRow
                  key={`${band.minInitialGrade}-${band.maxInitialGrade}-${index}`}
                  title={`${band.minInitialGrade}–${band.maxInitialGrade}`}
                  status={String(band.transmutedGrade)}
                  statusTone="primary"
                />
              ))}
              {preview.bands.length > 12 ? (
                <AdminNotice
                  title="Preview shortened"
                  description={`${preview.bands.length - 12} additional validated bands will be applied from the same backend preview.`}
                />
              ) : null}
              <AdminButton
                label={busy ? "Applying…" : "Apply reviewed table"}
                icon="check-decagram"
                tone="green"
                variant="solid"
                disabled={busy || !preview.isValid || !title.trim()}
                onPress={() =>
                  Alert.alert(
                    "Apply this table?",
                    "The validated bands will be stored as a new inactive table. Activation remains a separate step.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Apply", onPress: () => void apply() },
                    ],
                  )
                }
              />
            </>
          ) : null}
        </View>
      </AdminSection>
    </AdminScreen>
  );
}
