import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { classTemplatesApi } from "../api/services/class-templates";
import { toAppError } from "../api/http";
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
import type { MainTabParamList } from "../navigation/types";
import type { EngineImportValidationResult } from "../types/class-template";

type Props = BottomTabScreenProps<MainTabParamList, "AdminTemplates">;

export function AdminTemplatesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState("7");
  const [showImport, setShowImport] = useState(false);
  const [manifest, setManifest] = useState("");
  const [validation, setValidation] =
    useState<EngineImportValidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compatibleMode = Boolean(subjectCode.trim() && gradeLevel);
  const templates = useQuery({
    queryKey: [
      "admin-class-templates",
      subjectCode.trim().toUpperCase(),
      gradeLevel,
    ],
    queryFn: () =>
      compatibleMode
        ? classTemplatesApi.getCompatible(subjectCode.trim(), gradeLevel)
        : classTemplatesApi.getAll({
            subjectCode: subjectCode.trim() || undefined,
            subjectGradeLevel: gradeLevel || undefined,
          }),
  });
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (templates.data ?? []).filter(
      (entry) =>
        !needle ||
        `${entry.name} ${entry.subjectCode} ${entry.subjectGradeLevel} ${entry.status}`
          .toLowerCase()
          .includes(needle),
    );
  }, [search, templates.data]);
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };

  const create = async () => {
    if (!name.trim() || !newSubjectCode.trim() || !newGradeLevel) {
      setError("Name, subject code, and grade level are required.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const created = await classTemplatesApi.create({
        name: name.trim(),
        subjectCode: newSubjectCode.trim().toUpperCase(),
        subjectGradeLevel: newGradeLevel,
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-class-templates"],
      });
      setShowCreate(false);
      setName("");
      setNewSubjectCode("");
      setNewGradeLevel("7");
      rootNavigation.navigate("AdminTemplateDetail", {
        templateId: created.id,
      });
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const validateEngineImport = async () => {
    if (!manifest.trim()) {
      setError("Paste the YAML template manifest before validating it.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      setValidation(await classTemplatesApi.validateEngineImport(manifest));
    } catch (nextError) {
      setValidation(null);
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const importEngine = async (publish: boolean) => {
    if (!validation?.valid) return;
    try {
      setBusy(true);
      setError(null);
      const imported = await classTemplatesApi.importEngine(manifest, {
        publish,
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-class-templates"],
      });
      setShowImport(false);
      setManifest("");
      setValidation(null);
      rootNavigation.navigate("AdminTemplateDetail", {
        templateId: imported.template.id,
      });
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminScreen
      title="Class templates"
      subtitle="Contextual from Classes · reusable curriculum authoring"
      showBackButton
      onBackPress={() => navigation.navigate("AdminClasses")}
      refreshing={templates.isRefetching}
      onRefresh={() => void templates.refetch()}
    >
      {error || templates.isError ? (
        <AdminNotice
          title="Template workspace needs attention"
          description={error ?? toAppError(templates.error).message}
          tone="red"
        />
      ) : null}
      <AdminSection
        title="Find templates"
        subtitle={
          compatibleMode
            ? "Showing published templates compatible with this class profile"
            : "Search all draft and published templates"
        }
      >
        <View style={{ padding: 16, gap: 10 }}>
          <AdminField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Name, subject, grade, or status"
          />
          <AdminField
            label="Subject code"
            value={subjectCode}
            onChangeText={setSubjectCode}
            autoCapitalize="characters"
            placeholder="Optional compatibility filter"
          />
          <Text
            style={{ color: theme.subtext, fontSize: 11, fontWeight: "800" }}
          >
            GRADE LEVEL
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AdminChip
              label="Any"
              active={!gradeLevel}
              onPress={() => setGradeLevel("")}
            />
            {(["7", "8", "9", "10"] as const).map((grade) => (
              <AdminChip
                key={grade}
                label={`Grade ${grade}`}
                active={gradeLevel === grade}
                onPress={() => setGradeLevel(grade)}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AdminButton
              label={showCreate ? "Close create" : "New template"}
              icon="plus"
              variant="solid"
              onPress={() => {
                setShowCreate((value) => !value);
                setShowImport(false);
              }}
            />
            <AdminButton
              label={showImport ? "Close import" : "Import engine YAML"}
              icon="file-import-outline"
              onPress={() => {
                setShowImport((value) => !value);
                setShowCreate(false);
              }}
            />
          </View>
        </View>
      </AdminSection>
      {showCreate ? (
        <AdminSection
          title="Create draft template"
          subtitle="The subject and grade define compatibility with class creation"
        >
          <View style={{ padding: 16, gap: 10 }}>
            <AdminField
              label="Template name"
              value={name}
              onChangeText={setName}
            />
            <AdminField
              label="Subject code"
              value={newSubjectCode}
              onChangeText={setNewSubjectCode}
              autoCapitalize="characters"
            />
            <Text
              style={{ color: theme.subtext, fontSize: 11, fontWeight: "800" }}
            >
              GRADE LEVEL
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["7", "8", "9", "10"] as const).map((grade) => (
                <AdminChip
                  key={grade}
                  label={`Grade ${grade}`}
                  active={newGradeLevel === grade}
                  onPress={() => setNewGradeLevel(grade)}
                />
              ))}
            </View>
            <AdminButton
              label={busy ? "Creating…" : "Create and open"}
              icon="content-save-outline"
              tone="green"
              variant="solid"
              disabled={busy}
              onPress={() => void create()}
            />
          </View>
        </AdminSection>
      ) : null}
      {showImport ? (
        <AdminSection
          title="Engine import"
          subtitle="Validate the complete YAML package before creating any records"
        >
          <View style={{ padding: 16, gap: 10 }}>
            <AdminField
              label="YAML manifest"
              value={manifest}
              onChangeText={(value) => {
                setManifest(value);
                setValidation(null);
              }}
              multiline
              autoCapitalize="none"
              placeholder="Paste the exported template YAML"
            />
            <AdminButton
              label={busy ? "Validating…" : "Validate package"}
              icon="shield-search"
              variant="solid"
              disabled={busy || !manifest.trim()}
              onPress={() => void validateEngineImport()}
            />
            {validation ? (
              <>
                <AdminNotice
                  title={
                    validation.valid
                      ? "Package is valid"
                      : "Package cannot be imported"
                  }
                  description={`${validation.errors.length} errors · ${validation.warnings.length} warnings`}
                  tone={validation.valid ? "green" : "red"}
                />
                <AdminMetricStrip
                  items={[
                    { label: "Modules", value: validation.summary.modules },
                    { label: "Lessons", value: validation.summary.lessons },
                    {
                      label: "Assessments",
                      value: validation.summary.assessments,
                    },
                    { label: "Chunks", value: validation.summary.chunks },
                  ]}
                />
                {validation.errors.map((issue) => (
                  <AdminDataRow
                    key={`${issue.path}-${issue.message}`}
                    title={issue.message}
                    subtitle={issue.path}
                    status="Error"
                    statusTone="red"
                  />
                ))}
                {validation.warnings.map((issue) => (
                  <AdminDataRow
                    key={`${issue.path}-${issue.message}`}
                    title={issue.message}
                    subtitle={issue.path}
                    status="Warning"
                    statusTone="amber"
                  />
                ))}
                {validation.valid ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <AdminButton
                        label="Import draft"
                        disabled={busy}
                        onPress={() => void importEngine(false)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AdminButton
                        label="Import and publish"
                        tone="green"
                        variant="solid"
                        disabled={busy}
                        onPress={() =>
                          Alert.alert(
                            "Publish imported template?",
                            "The imported curriculum becomes available during class creation.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Import and publish",
                                onPress: () => void importEngine(true),
                              },
                            ],
                          )
                        }
                      />
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </AdminSection>
      ) : null}
      <AdminSection
        title="Templates"
        subtitle={`${rows.length} visible · ${compatibleMode ? "published compatible" : "all statuses"}`}
      >
        {rows.map((entry) => (
          <AdminDataRow
            key={entry.id}
            title={entry.name}
            subtitle={`${entry.subjectCode} · Grade ${entry.subjectGradeLevel}`}
            meta={
              entry.updatedAt
                ? `Updated ${new Date(entry.updatedAt).toLocaleString()}`
                : undefined
            }
            status={entry.status}
            statusTone={entry.status === "published" ? "green" : "amber"}
            onPress={() =>
              rootNavigation.navigate("AdminTemplateDetail", {
                templateId: entry.id,
              })
            }
          />
        ))}
        {!templates.isLoading && !rows.length ? (
          <AdminEmpty
            title={
              search.trim() || subjectCode.trim() || gradeLevel
                ? "No matching templates"
                : "No class templates"
            }
            subtitle={
              search.trim() || subjectCode.trim() || gradeLevel
                ? "Clear search or compatibility filters to see other templates."
                : "Create a reusable class structure or import an engine package."
            }
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
