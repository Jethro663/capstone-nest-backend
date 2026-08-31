import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { academicGradingService as grading } from "../../api/services/academic-grading";
import { classRecordApi } from "../../api/services/class-record";
import { toAppError } from "../../api/http";
import type { AcademicPeriodKey } from "../../types/academic-grading";
import {
  TeacherActionButton as Action,
  TeacherChip as Chip,
  TeacherInlineField as Field,
  TeacherPanel as Panel,
  teacherTheme as theme,
} from "../teacher/TeacherMobilePrimitives";
const styles = { color: theme.text, fontSize: 13, lineHeight: 20 };
const actions = [
  "preserve-legacy",
  "initialize-policy",
  "classify-subject",
  "repair-workbook-policy",
  "exclude-historical-period",
  "repair-assessment-period",
  "exclude-historical-assessment",
  "retire-duplicate",
  "repair-state",
] as const;
export function AcademicRecoveryPanel({
  schoolYear,
  onChanged,
  openWorkbook,
}: {
  schoolYear?: string;
  onChanged: () => Promise<unknown>;
  openWorkbook: (id: string) => void;
}) {
  const audit = useQuery({
    queryKey: ["academic", "audit", schoolYear],
    queryFn: async () => (await grading.audit(schoolYear)).data,
  });
  const [action, setAction] =
    useState<(typeof actions)[number]>("preserve-legacy");
  const [id, setId] = useState("");
  const [year, setYear] = useState(schoolYear ?? "");
  const [canonical, setCanonical] = useState("");
  const [profile, setProfile] = useState<"academic" | "practical">("academic");
  const [period, setPeriod] = useState<AcademicPeriodKey>("Q1");
  const [stateId, setStateId] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const workbook = useQuery({
    queryKey: ["academic", "repair-workbook", id],
    queryFn: () => classRecordApi.getById(id),
    enabled: action === "repair-workbook-policy" && Boolean(id),
  });
  const selectedState = audit.data?.states.find((s) => s.id === stateId);
  const policy = audit.data?.policies.find(
    (p) =>
      p.schoolYear ===
      (action === "repair-state" ? selectedState?.schoolYear : year),
  );
  const apply = async () => {
    if (!reviewed || !reason.trim()) return;
    setBusy(true);
    try {
      if (action === "preserve-legacy") await grading.preserveLegacy(reason);
      else if (action === "initialize-policy")
        await grading.initializePolicy(year, reason);
      else if (action === "classify-subject")
        await grading.classifySubject(id, profile, reason);
      else if (action === "exclude-historical-period")
        await grading.excludePeriod(id, reason);
      else if (action === "exclude-historical-assessment")
        await grading.excludeAssessmentPeriod(id, reason);
      else if (action === "repair-assessment-period")
        await grading.repairAssessmentPeriod(id, period, reason);
      else if (action === "retire-duplicate")
        await grading.retireDuplicate(id, canonical, reason);
      else if (action === "repair-workbook-policy")
        await grading.repairWorkbook(
          id,
          reason,
          Object.entries(mapping)
            .filter(([, value]) => value)
            .map(([itemId, component]) => ({
              itemId,
              component: component as "ST1" | "ST2" | "TE",
            })),
        );
      else if (action === "repair-state" && selectedState && audit.data)
        await grading.repairState({
          selectedStateId: selectedState.id,
          expectedStateIds: audit.data.states.map((s) => s.id),
          expectedVersion: selectedState.version,
          quarter: period,
          currentPassword: password,
          reason,
        });
      else throw new Error("Choose the authoritative state to preserve.");
      setPassword("");
      setReason("");
      setReviewed(false);
      await onChanged();
      await audit.refetch();
      Alert.alert(
        "Audited repair completed",
        "Review the refreshed blockers before the next operation.",
      );
    } catch (error) {
      Alert.alert("Repair rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title="Academic audit and recovery"
      subtitle="Read-only findings; explicit repairs preserve grade history."
    >
      <View style={{ padding: 14, gap: 10 }}>
        <Action
          label="Refresh read-only audit"
          onPress={() => void audit.refetch()}
        />
        <Text style={styles}>
          {audit.isError
            ? "Audit failed to load."
            : `${audit.data?.counts.blockers ?? 0} blockers · ${audit.data?.counts.unarchivedLegacyGrades ?? 0} legacy grades awaiting archival`}
        </Text>
        {audit.data?.issues.map((issue, index) => (
          <View key={index} style={{ gap: 5 }}>
            <Text style={styles}>
              {issue.severity}: {issue.message}
            </Text>
            {issue.classId && (
              <Action
                label="Review workbook"
                tone="neutral"
                onPress={() => openWorkbook(issue.classId!)}
              />
            )}
            {issue.repairAction &&
              actions.some((a) => a === issue.repairAction) && (
                <Action
                  label="Prepare this repair"
                  tone="neutral"
                  onPress={() => {
                    setAction(issue.repairAction as typeof action);
                    setId(
                      issue.classRecordId ??
                        issue.assessmentId ??
                        issue.classId ??
                        "",
                    );
                    setYear(issue.schoolYear ?? schoolYear ?? "");
                    setReviewed(false);
                    setMapping({});
                  }}
                />
              )}
          </View>
        ))}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {actions.map((value) => (
            <Chip
              key={value}
              label={value.replaceAll("-", " ")}
              active={action === value}
              onPress={() => {
                setAction(value);
                setReviewed(false);
                setMapping({});
              }}
            />
          ))}
        </View>
        <Field label="School year" value={year} onChangeText={setYear} />
        {!["preserve-legacy", "initialize-policy", "repair-state"].includes(
          action,
        ) && (
          <Field
            label="Target record / assessment / class ID"
            value={id}
            onChangeText={setId}
          />
        )}
        {action === "classify-subject" && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["academic", "practical"] as const).map((value) => (
              <Chip
                key={value}
                label={value}
                active={profile === value}
                onPress={() => setProfile(value)}
              />
            ))}
          </View>
        )}
        {action === "retire-duplicate" && (
          <>
            <Field
              label="Canonical class ID"
              value={canonical}
              onChangeText={setCanonical}
            />
            <Text style={styles}>
              Every learner must already be enrolled in the canonical class. Old
              class evidence is retained.
            </Text>
          </>
        )}
        {action === "repair-workbook-policy" && (
          <>
            {workbook.isError && (
              <Text style={styles}>Workbook could not be loaded.</Text>
            )}
            {workbook.data?.categories
              ?.find((c) => c.name === "Quarterly Assessment")
              ?.items?.map((item) => (
                <View key={item.id}>
                  <Text style={styles}>
                    {item.title} · HPS {item.maxScore}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {["", "ST1", "ST2", "TE"].map((component) => (
                      <Chip
                        key={component}
                        label={component || "Unassigned empty slot"}
                        active={(mapping[item.id] ?? "") === component}
                        onPress={() =>
                          setMapping((prev) => ({
                            ...prev,
                            [item.id]: component,
                          }))
                        }
                      />
                    ))}
                  </View>
                </View>
              ))}
          </>
        )}
        {action === "repair-state" && (
          <>
            {audit.data?.states.map((state) => (
              <Chip
                key={state.id}
                label={`${state.schoolYear} ${state.quarter} v${state.version} · ${state.id}`}
                active={stateId === state.id}
                onPress={() => setStateId(state.id)}
              />
            ))}
            <Text style={styles}>Current password</Text>
            <TextInput
              accessibilityLabel="State repair password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={{
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 12,
              }}
            />
          </>
        )}
        {["repair-state", "repair-assessment-period"].includes(action) && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {policy?.periods.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                active={period === p.key}
                onPress={() => setPeriod(p.key)}
              />
            ))}
          </View>
        )}
        {action.includes("exclude") && (
          <Text style={styles}>
            Preserves the incompatible period for the entire class. Required
            periods cannot be excluded; scores are never folded into another
            period.
          </Text>
        )}
        <Field
          label="Evidence and repair reason"
          value={reason}
          onChangeText={setReason}
          multiline
        />
        <Chip
          label={
            reviewed
              ? "Reviewed repair scope"
              : "Confirm I reviewed this repair scope"
          }
          active={reviewed}
          onPress={() => setReviewed(!reviewed)}
        />
        <Action
          label="Apply audited repair"
          disabled={
            busy ||
            !audit.data ||
            !reviewed ||
            reason.trim().length < 5 ||
            (action === "repair-workbook-policy" && !workbook.data) ||
            (["repair-state", "repair-assessment-period"].includes(action) &&
              !policy)
          }
          onPress={() => void apply()}
        />
      </View>
    </Panel>
  );
}
