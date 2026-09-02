import { Choices } from "../features/assessment-editor/SettingsFields";
import { useCallback, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { academicStateService as states } from "../api/services/academic-state";
import { academicGradingService as grading } from "../api/services/academic-grading";
import { toAppError } from "../api/http";
import type { AcademicPeriodKey } from "../types/academic-grading";
import type { AcademicAlignmentPreview } from "../types/academic-grading";
import type {
  AcademicActivationPreview,
  AcademicStateImpactPreview,
} from "../types/academic-state";
import { AcademicWorkbook } from "../components/academic/AcademicWorkbook";
import { AcademicRecoveryPanel } from "../components/academic/AcademicRecoveryPanel";
import {
  TeacherActionButton as Action,
  TeacherChip as Chip,
  TeacherInlineField as Field,
  TeacherPanel as Panel,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
const textStyle = { color: theme.text, fontSize: 13, lineHeight: 20 };
export function AdminAcademicScreen() {
  const client = useQueryClient();
  const current = useQuery({
    queryKey: ["academic", "current"],
    queryFn: async () => (await states.getCurrent()).data,
  });
  const readiness = useQuery({
    queryKey: ["academic", "readiness"],
    queryFn: async () => (await states.getReadiness()).data,
  });
  const backSubjects = useQuery({
    queryKey: ["academic", "back-subjects"],
    queryFn: async () => (await grading.backSubjects()).data,
  });
  const completions = useQuery({
    queryKey: ["academic", "grade10-completions"],
    queryFn: async () => (await grading.grade10Completions()).data,
  });
  const [tab, setTab] = useState("controls");
  const [classId, setClassId] = useState("");
  const [target, setTarget] = useState<AcademicPeriodKey>("Q1");
  const [activation, setActivation] =
    useState<AcademicActivationPreview | null>(null);
  const [transition, setTransition] =
    useState<AcademicStateImpactPreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [assessmentPeriodMapping, setAssessmentPeriodMapping] = useState<Partial<Record<string, AcademicPeriodKey>>>({});
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [obligationId, setObligationId] = useState("");
  const [scheduleYear, setScheduleYear] = useState("");
  const [schedulePeriod, setSchedulePeriod] = useState<AcademicPeriodKey>("Q1");
  const [grade, setGrade] = useState("");
  const [alignmentPreview, setAlignmentPreview] = useState<AcademicAlignmentPreview | null>(null);
  const [alignmentAck, setAlignmentAck] = useState("");
  const [reference, setReference] = useState("");
  const effectiveScheduleYear = scheduleYear || current.data?.schoolYear || "";
  const schedulePolicy = useQuery({
    queryKey: ["academic-policy", effectiveScheduleYear],
    queryFn: async () => (await states.getPolicy(effectiveScheduleYear)).data,
    enabled: Boolean(effectiveScheduleYear),
  });
  const refresh = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ["academic"] });
  }, [client]);
  const run = async (
    action: () => Promise<unknown>,
    message: string,
    mutation = true,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (mutation) {
        setPassword("");
        setReason("");
        setReference("");
        setGrade("");
        await refresh();
      }
      Alert.alert(
        mutation ? "Academic action completed" : "Preview loaded",
        message,
      );
    } catch (error) {
      Alert.alert("Action rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const nextYear = current.data
    ? `${Number(current.data.schoolYear.slice(0, 4)) + 1}-${Number(current.data.schoolYear.slice(5)) + 1}`
    : "";
  const selected = backSubjects.data?.find((b) => b.id === obligationId);
  const canEvidence = Boolean(reason.trim() && reference.trim());
  const activate = async () => {
    if (!activation) throw new Error("Preview period activation first.");
    const observed = activation.state;
    const signature = JSON.stringify({
      year: observed.schoolYear,
      period: observed.quarter,
      version: observed.version,
      target,
      reason,
      override,
    });
    if (request.current?.signature !== signature)
      request.current = { signature, id: Crypto.randomUUID() };
    await states.activatePeriod({
      expectedSchoolYear: observed.schoolYear,
      expectedQuarter: observed.quarter,
      expectedVersion: observed.version,
      targetQuarter: target,
      currentPassword: password,
      requestId: request.current.id,
      override,
      reason: reason || undefined,
    });
    setActivation(null);
    setTransition(null);
  };
  return (
    <TeacherScreen
      title="Academic administration"
      workspaceLabel="Admin workspace"
      subtitle="Verified policy periods, year transition, recovery, remediation and grade evidence."
      onRefresh={() => void refresh()}
      refreshing={current.isFetching || readiness.isFetching}
    >
      <View style={{ padding: 14, gap: 12 }}>
        <Text style={textStyle}>
          {current.data
            ? `${current.data.schoolYear} · ${current.data.periods.find((p) => p.key === current.data.quarter)?.label ?? current.data.quarter} · version ${current.data.version}`
            : current.isError
              ? "Academic state unavailable. Use recovery to inspect duplicate or invalid state."
              : "Loading academic state…"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {["controls", "workbooks", "back subjects", "alignment", "recovery"].map(
            (value) => (
              <Chip
                key={value}
                label={value}
                active={tab === value}
                onPress={() => setTab(value)}
              />
            ),
          )}
        </View>
        {tab === "controls" && (
          <>
            <Panel title="Activate a grading period">
              <View style={{ padding: 14, gap: 10 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {current.data?.periods.map((p) => (
                    <Chip
                      key={p.key}
                      label={p.label}
                      active={target === p.key}
                      onPress={() => {
                        setTarget(p.key);
                        setActivation(null);
                        setOverride(false);
                      }}
                    />
                  ))}
                </View>
                <Action
                  label="Preview period activation"
                  disabled={busy || !current.data}
                  onPress={() =>
                    void run(
                      async () =>
                        setActivation(
                          (await states.previewActivation(target)).data,
                        ),
                      "Review open workbooks, in-flight attempts and override requirements.",
                      false,
                    )
                  }
                />
                {activation && (
                  <>
                    <Text style={textStyle}>
                      {activation.message}
                      {"\n"}
                      {activation.currentOpenRecords} current open records ·{" "}
                      {activation.targetMissingRecords} missing target records ·{" "}
                      {activation.ongoingAttempts} ongoing attempts
                    </Text>
                    {activation.overrideRequired && (
                      <>
                        <Chip
                          label={
                            override
                              ? "Override acknowledged"
                              : "Acknowledge backward or skipped activation"
                          }
                          active={override}
                          onPress={() => setOverride(!override)}
                        />
                        <Field
                          label="Override reason"
                          value={reason}
                          onChangeText={setReason}
                          multiline
                        />
                      </>
                    )}
                  </>
                )}
                <Text style={textStyle}>Current password</Text>
                <TextInput
                  accessibilityLabel="Academic control password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={{
                    color: theme.text,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                />
                <Action
                  label="Activate verified period"
                  disabled={
                    busy ||
                    !activation ||
                    !password ||
                    (activation.overrideRequired &&
                      (!override || !reason.trim()))
                  }
                  onPress={() =>
                    void run(
                      activate,
                      "Period activated. Workbooks were not silently finalized.",
                    )
                  }
                />
              </View>
            </Panel>
            <Panel title="School-year transition">
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={textStyle}>
                  Next school year: {nextYear}. This operation archives the
                  current year and applies every verified student outcome in one
                  transaction.
                </Text>
                <Action
                  label="Preview complete year transition"
                  disabled={busy || !nextYear}
                  onPress={() =>
                    void run(
                      async () =>
                        setTransition(
                          (
                            await states.getImpactPreview({
                              schoolYear: nextYear,
                            })
                          ).data,
                        ),
                      "Review blockers and projected outcomes. No grades were changed.",
                      false,
                    )
                  }
                />
                {transition && (
                  <>
                    <Text style={textStyle}>
                      {transition.impact.promotionReadiness.transitionBlocked
                        ? "Transition blocked"
                        : "Readiness checks pass"}{" "}
                      · {transition.impact.classesToArchive} classes ·{" "}
                      {transition.impact.sectionsToArchive} sections{"\n"}
                      Promote{" "}
                      {transition.impact.promotionReadiness.studentsToPromote} ·
                      retain{" "}
                      {transition.impact.promotionReadiness.studentsToRetain} ·
                      conditional{" "}
                      {
                        transition.impact.promotionReadiness
                          .studentsToConditionallyPromote
                      }{" "}
                      · Grade 10 pending{" "}
                      {
                        transition.impact.promotionReadiness
                          .studentsPendingCompletion
                      }
                    </Text>
                    <Text style={textStyle}>Map copied assessment drafts into the new year. Original assessments and student results will not be changed.</Text>
                    {(transition.impact.assessmentPeriodSources ?? []).map(source => <Choices key={source} label={`Destination period for ${source}`} value={assessmentPeriodMapping[source]} options={(transition.impact.destinationPeriods ?? []).map(period => ({ value: period.key, label: period.label }))} onChange={period => setAssessmentPeriodMapping(current => ({ ...current, [source]: period as AcademicPeriodKey }))} />)}
                    <Text style={textStyle}>
                      Type exactly: {transition.transitionConfirmationText}
                    </Text>
                    <Field
                      label="Transition confirmation"
                      value={confirmation}
                      onChangeText={setConfirmation}
                    />
                    <Action
                      label="Commit verified year transition"
                      disabled={
                        busy ||
                        !password ||
                        (transition.impact.assessmentPeriodSources ?? []).some(source => !assessmentPeriodMapping[source]) ||
                        transition.impact.promotionReadiness
                          .transitionBlocked ||
                        confirmation !== transition.transitionConfirmationText
                      }
                      onPress={() =>
                        void run(async () => {
                          await states.transition({
                            expectedSchoolYear: transition.current.schoolYear,
                            expectedQuarter: transition.current.quarter,
                            expectedVersion: transition.current.version,
                            schoolYear: transition.target.schoolYear,
                            currentPassword: password,
                            confirmationText: confirmation,
                            assessmentPeriodMapping,
                          });
                          setTransition(null);
                          setActivation(null);
                          setConfirmation("");
                        }, "Year transition committed; new period rosters are empty.")
                      }
                    />
                  </>
                )}
                <Action
                  label="Send grouped teacher readiness reminders"
                  disabled={busy}
                  onPress={() =>
                    void run(
                      () => states.notifyTeachers(),
                      "Reminder request processed. Identical recent runs are deduplicated.",
                    )
                  }
                />
                {(
                  transition?.impact.promotionReadiness ?? readiness.data
                )?.blockers.map((b, index) => (
                  <View key={index} style={{ gap: 5 }}>
                    <Text style={textStyle}>{b.message}</Text>
                    {b.classId && (
                      <Action
                        label="Open affected workbook"
                        tone="neutral"
                        onPress={() => {
                          setClassId(b.classId!);
                          setTab("workbooks");
                        }}
                      />
                    )}
                  </View>
                ))}
              </View>
            </Panel>
          </>
        )}
        {tab === "workbooks" && (
          <>
            <Panel title="Select a class">
              <View style={{ padding: 14, gap: 6 }}>
                {readiness.data?.classReadiness.map((c) => (
                  <Chip
                    key={c.classId}
                    label={`${c.subjectName} · ${c.subjectCode}`}
                    active={classId === c.classId}
                    onPress={() => setClassId(c.classId)}
                  />
                ))}
                <Field
                  label="Class ID (including historical classes)"
                  value={classId}
                  onChangeText={setClassId}
                />
              </View>
            </Panel>
            {/^[0-9a-f-]{36}$/i.test(classId) && (
              <AcademicWorkbook key={classId} classId={classId} admin />
            )}
          </>
        )}
        {tab === "alignment" && (
          <Panel title="Academic state alignment" subtitle="Preview first; execution is bound to the returned manifest hash and confirmation texts.">
            <View style={{ padding: 14, gap: 10 }}>
              <Text style={textStyle}>Source: {current.data?.schoolYear ?? "Unavailable"} · Target: {nextYear || "Unavailable"} · Quarter: {target}</Text>
              <Text style={textStyle}>Selected scope: {classId ? "one class" : "all classes in readiness"}</Text>
              <Action
                label="Preview state alignment"
                disabled={busy || !current.data || !nextYear}
                onPress={() => void run(async () => {
                  const classIds = classId ? [classId] : (readiness.data?.classReadiness ?? []).map((entry) => entry.classId);
                  const response = await grading.previewStateAlignment({ sourceSchoolYear: current.data!.schoolYear, targetSchoolYear: nextYear, targetQuarter: target, classIds });
                  setAlignmentPreview(response.data);
                  setAlignmentAck("");
                }, "Review blockers, warnings, selected classes, and confirmations before execution.", false)}
              />
              {alignmentPreview ? (
                <>
                  <Text style={textStyle}>{alignmentPreview.selectedClasses.length} classes · {alignmentPreview.movedSectionIds.length} sections · {alignmentPreview.blockers.length} blockers · {alignmentPreview.warnings.length} warnings</Text>
                  {alignmentPreview.blockers.map((entry) => <Text key={`${entry.code}-${entry.classId ?? "all"}`} style={{ ...textStyle, color: theme.red }}>{entry.code}: {entry.message}</Text>)}
                  {alignmentPreview.requiredConfirmations.map((entry) => <Text key={entry.code} style={textStyle}>{entry.code}: {entry.text}</Text>)}
                  <Field label="Reason (minimum 5 characters)" value={reason} onChangeText={setReason} multiline />
                  <TextInput accessibilityLabel="State alignment password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Current password" placeholderTextColor={theme.muted} style={{ color: theme.text, padding: 12, borderWidth: 1, borderColor: theme.border }} />
                  <Field label="Type ALIGN to acknowledge every confirmation above" value={alignmentAck} onChangeText={setAlignmentAck} />
                  <Action
                    label="Execute manifest-bound alignment"
                    tone="red"
                    disabled={busy || !alignmentPreview.safeToApply || alignmentPreview.blockers.length > 0 || alignmentAck !== "ALIGN" || reason.trim().length < 5 || !password}
                    onPress={() => void run(async () => {
                      const preview = alignmentPreview;
                      await grading.executeStateAlignment({ ...preview.input, manifestHash: preview.manifestHash, confirmations: preview.requiredConfirmations, reason: reason.trim(), currentPassword: password });
                      setAlignmentPreview(null);
                      setAlignmentAck("");
                    }, "State alignment completed and its audit event was retained.")}
                  />
                </>
              ) : null}
            </View>
          </Panel>
        )}
        {tab === "back subjects" && (
          <>
            <Panel title="Back subjects and clearance">
              <View style={{ padding: 14, gap: 10 }}>
                {backSubjects.data?.map((b) => (
                  <Chip
                    key={b.id}
                    label={`${b.student?.lastName ?? b.studentId} · ${b.subjectCode} · ${b.status}`}
                    active={b.id === obligationId}
                    onPress={() => {
                      setObligationId(b.id);
                      setReason("");
                      setReference("");
                      setGrade("");
                    }}
                  />
                ))}
                {selected && (
                  <>
                    <Text style={textStyle}>
                      {selected.sourceSchoolYear} · Grade {selected.gradeLevel}{" "}
                      · {selected.subjectCode}
                      {"\n"}Scheduled {selected.scheduledSchoolYear ?? "—"}{" "}
                      {selected.scheduledPeriod ?? ""} · cleared grade{" "}
                      {selected.clearedGrade ?? "—"}
                    </Text>
                    {selected.history.map((h) => (
                      <Text key={h.id} style={textStyle}>
                        {h.action}: {JSON.stringify(h.evidence)}
                      </Text>
                    ))}
                    <Field
                      label="Schedule school year"
                      value={effectiveScheduleYear}
                      onChangeText={setScheduleYear}
                    />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {schedulePolicy.data?.periods.map((p) => (
                        <Chip
                          key={p.key}
                          label={p.label}
                          active={schedulePeriod === p.key}
                          onPress={() => setSchedulePeriod(p.key)}
                        />
                      ))}
                    </View>
                    <Field
                      label="Reason"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                    />
                    <Action
                      label="Schedule back subject"
                      disabled={
                        busy ||
                        !reason.trim() ||
                        !schedulePolicy.data ||
                        !["pending", "scheduled"].includes(selected.status)
                      }
                      onPress={() =>
                        void run(
                          () =>
                            grading.scheduleBackSubject(selected.id, {
                              schoolYear: effectiveScheduleYear,
                              period: schedulePeriod,
                              reason,
                            }),
                          "Back subject scheduled. Only one is permitted per learner per term.",
                        )
                      }
                    />
                    <Field
                      label="Clearance grade (whole number)"
                      value={grade}
                      onChangeText={setGrade}
                    />
                    <Field
                      label="Evidence reference"
                      value={reference}
                      onChangeText={setReference}
                    />
                    <Action
                      label="Record verified clearance"
                      disabled={
                        busy ||
                        !canEvidence ||
                        selected.status !== "scheduled" ||
                        !grade.trim() ||
                        !Number.isInteger(Number(grade)) ||
                        Number(grade) < 75 ||
                        Number(grade) > 100
                      }
                      onPress={() =>
                        void run(
                          () =>
                            grading.clearBackSubject(selected.id, {
                              grade: Number(grade),
                              reason,
                              sourceReference: reference,
                            }),
                          "Clearance evidence recorded.",
                        )
                      }
                    />
                  </>
                )}
                {backSubjects.isError && (
                  <Text style={textStyle}>
                    Back subjects could not be loaded.
                  </Text>
                )}
              </View>
            </Panel>
            <Panel title="Grade 10 completion">
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={textStyle}>
                  Completion appends a new event after all required clearance.
                  The original pending outcome and annual evidence are retained.
                </Text>
                <Field
                  label="Completion reason"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
                <Field
                  label="Completion evidence reference"
                  value={reference}
                  onChangeText={setReference}
                />
                {completions.data?.map((c) => (
                  <View key={c.id} style={{ gap: 5 }}>
                    <Text style={textStyle}>
                      {c.student?.lastName ?? c.studentId} · {c.schoolYear} ·{" "}
                      {c.completion
                        ? `completed ${c.completion.recordedAt}`
                        : "pending completion"}
                    </Text>
                    {!c.completion && (
                      <Action
                        label="Verify and record completion"
                        disabled={busy || !canEvidence}
                        onPress={() =>
                          void run(
                            () =>
                              grading.completeGrade10(c.studentId, {
                                reason,
                                sourceReference: reference,
                              }),
                            "Grade 10 completion event recorded.",
                          )
                        }
                      />
                    )}
                  </View>
                ))}
              </View>
            </Panel>
          </>
        )}
        {tab === "recovery" && (
          <AcademicRecoveryPanel
            schoolYear={current.data?.schoolYear}
            onChanged={refresh}
            openWorkbook={(id) => {
              setClassId(id);
              setTab("workbooks");
            }}
          />
        )}
      </View>
    </TeacherScreen>
  );
}
