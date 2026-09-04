import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classRecordApi } from "../../api/services/class-record";
import { classesApi } from "../../api/services/classes";
import { academicStateService } from "../../api/services/academic-state";
import { toAppError } from "../../api/http";
import {
  TeacherActionButton as Action,
  TeacherChip as Chip,
  TeacherInlineField as Field,
  TeacherPanel as Panel,
  teacherTheme as theme,
} from "../teacher/TeacherMobilePrimitives";
import { MobileClassRecordWorkbook } from "../teacher/MobileClassRecordWorkbook";
import { exportAcademicCsv } from "../../lib/academic-workbook-export";
import { AcademicAnnualPanel } from "./AcademicAnnualPanel";
import type { PeriodEligibility } from "../../types/academic-grading";
const textStyle = { color: theme.text, fontSize: 13, lineHeight: 20 };
export function AcademicWorkbook({
  classId,
  admin = false,
  registerRefetch,
}: {
  classId: string;
  admin?: boolean;
  registerRefetch?: (refetch: () => Promise<unknown>) => void;
}) {
  const client = useQueryClient();
  const context = useQuery({
    queryKey: ["academic", "class", classId],
    queryFn: async () => {
      const [cls, current] = await Promise.all([
        classesApi.getById(classId),
        academicStateService.getCurrent(),
      ]);
      const policy =
        cls.schoolYear === current.data.schoolYear
          ? current.data.policy
          : (await academicStateService.getPolicy(cls.schoolYear)).data;
      return { cls, current: current.data, policy };
    },
  });
  const records = useQuery({
    queryKey: ["class-records", classId],
    queryFn: () => classRecordApi.getByClass(classId),
  });
  const [recordId, setRecordId] = useState("");
  const [tab, setTab] = useState("scores");
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [score, setScore] = useState("");
  const [bonusPoints, setBonusPoints] = useState("0");
  const [bonusReason, setBonusReason] = useState("");
  const [hps, setHps] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, { eligibility: PeriodEligibility | ""; reason: string }>
  >({});
  const selected =
    records.data?.find((record) => record.id === recordId) ??
    records.data?.find(
      (record) => record.gradingPeriod === context.data?.current.quarter,
    ) ??
    records.data?.[0];
  const evidence = useQuery({
    queryKey: ["academic", "record", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const id = selected!.id;
      const [sheet, roster, readiness] = await Promise.all([
        classRecordApi.getSpreadsheet(id),
        classRecordApi.roster(id),
        classRecordApi.readiness(id),
      ]);
      return { sheet, roster, readiness };
    },
  });
  const annual = useQuery({
    queryKey: ["academic", "annual", classId],
    queryFn: () => classRecordApi.annualSummary(classId),
    enabled: tab === "annual",
  });
  const history = useQuery({
    queryKey: ["academic", "history", selected?.id],
    queryFn: () => classRecordApi.history(selected!.id),
    enabled: tab === "history" && Boolean(selected),
  });
  const refresh = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["academic"] }),
      client.invalidateQueries({
        predicate: (query) =>
          String(query.queryKey[0]).startsWith("class-record"),
      }),
    ]);
  }, [client]);
  useEffect(() => {
    registerRefetch?.(refresh);
  }, [registerRefetch, refresh]);
  useEffect(() => {
    setDecisions(
      Object.fromEntries(
        (evidence.data?.roster.participants ?? []).map((p) => [
          p.studentId,
          { eligibility: p.eligibility ?? "", reason: p.reason ?? "" },
        ]),
      ),
    );
    setReason("");
  }, [evidence.data?.roster]);
  useEffect(() => {
    setStudentId("");
    setItemId("");
    setReason("");
    setScore("");
    setBonusPoints("0");
    setBonusReason("");
    setHps("");
  }, [selected?.id]);
  const write = async (action: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refresh();
      setReason("");
      Alert.alert("Academic evidence updated", message);
    } catch (error) {
      Alert.alert("Action rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const data = evidence.data;
  const sheet = data?.sheet;
  const stale = evidence.isError || evidence.isFetching;
  const canGrade =
    Boolean(sheet?.academicCapabilities?.canGrade) && !stale && !busy;
  const canPrepare =
    Boolean(sheet?.academicCapabilities?.canPrepare) && !stale && !busy;
  const person = sheet?.students.find((p) => p.studentId === studentId);
  const category = sheet?.categories.find((c) =>
    c.items.some((i) => i.id === itemId),
  );
  const item = category?.items.find((i) => i.id === itemId);
  const values = person?.categories.find((c) => c.categoryId === category?.id);
  const itemIndex = category?.items.findIndex((i) => i.id === itemId) ?? -1;
  const scoreStatus = values?.scoreStatuses?.[itemIndex] ?? "missing";
  const policy = context.data?.policy;
  useEffect(() => {
    if (!studentId || !itemId || itemIndex < 0) return;
    setScore(
      values?.scores?.[itemIndex] == null
        ? ""
        : String(values.scores[itemIndex]),
    );
    setBonusPoints(String(values?.bonusPoints?.[itemIndex] ?? 0));
    setBonusReason(values?.bonusReasons?.[itemIndex] ?? "");
  }, [itemId, itemIndex, studentId, values]);
  return (
    <View style={{ gap: 12 }}>
      <Panel
        title="Academic workbook"
        subtitle={`${context.data?.cls.subjectName ?? ""} · ${policy?.schoolYear ?? ""} · ${policy?.id ?? "Loading policy"}`}
      >
        <View style={{ padding: 14, gap: 10 }}>
          <Action
            label="Refresh evidence"
            tone="neutral"
            onPress={() => void refresh()}
          />
          {(context.isError || records.isError || evidence.isError) && (
            <Text accessibilityRole="alert" style={textStyle}>
              Evidence could not be refreshed. Previous values may be stale;
              writes are disabled until refreshed.
            </Text>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {policy?.periods.map((period) => {
              const record = records.data?.find(
                (r) => r.gradingPeriod === period.key,
              );
              return (
                <Action
                  key={period.key}
                  label={record ? period.label : `Create ${period.label}`}
                  tone={selected?.id === record?.id ? "red" : "neutral"}
                  disabled={
                    busy ||
                    (!record &&
                      (!context.data?.cls.isActive ||
                        context.data.cls.schoolYear <
                          context.data.current.schoolYear))
                  }
                  onPress={() =>
                    record
                      ? setRecordId(record.id)
                      : void write(async () => {
                          const created = await classRecordApi.generate({
                            classId,
                            gradingPeriod: period.key,
                          });
                          setRecordId(created.id);
                        }, "Workbook created. Confirm its period eligibility.")
                  }
                />
              );
            })}
            {records.data
              ?.filter(
                (r) => !policy?.periods.some((p) => p.key === r.gradingPeriod),
              )
              .map((r) => (
                <Chip
                  key={r.id}
                  label={`Historical ${r.gradingPeriod}`}
                  active={selected?.id === r.id}
                  onPress={() => setRecordId(r.id)}
                />
              ))}
          </View>
          {selected && (
            <Text style={textStyle}>
              {sheet?.header.periodLabel ?? selected.gradingPeriod} ·{" "}
              {selected.status} · revision {selected.revision ?? 0}
            </Text>
          )}
          <Text style={textStyle}>
            {sheet?.academicCapabilities?.readOnlyReason ??
              (!canGrade && canPrepare
                ? "Future draft: prepare now, grade after activation."
                : "Blank is missing. Zero is explicit. Exemptions require evidence.")}
          </Text>
          {selected && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["scores", "eligibility", "readiness", "annual", "history"].map(
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
          )}
        </View>
      </Panel>
      {sheet && tab === "scores" && (
        <>
          <Panel title="Enter or correct score evidence">
            <View style={{ padding: 14, gap: 8 }}>
              <Text style={textStyle}>
                Select one learner and item. Linked scores come from assessment
                grading.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {sheet.students.map((p) => (
                  <Chip
                    key={p.studentId}
                    label={`${p.lastName}, ${p.firstName}`}
                    active={studentId === p.studentId}
                    onPress={() => {
                      setStudentId(p.studentId);
                      setScore("");
                      setBonusPoints("0");
                      setBonusReason("");
                      setReason("");
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {sheet.categories.flatMap((c) =>
                  c.items.map((i) => (
                    <Chip
                      key={i.id}
                      label={`${c.name}: ${i.title} (${i.hps ?? 0})`}
                      active={itemId === i.id}
                      onPress={() => {
                        setItemId(i.id);
                        setScore("");
                        setBonusPoints("0");
                        setBonusReason("");
                        setHps(String(i.hps ?? ""));
                        setReason("");
                      }}
                    />
                  )),
                )}
              </View>
              {item && (
                <>
                  <Text style={textStyle}>
                    {person
                      ? `${person.eligibility ?? "Unconfirmed"} · ${scoreStatus} · ${values?.effectiveScores?.[itemIndex] ?? values?.scores[itemIndex] ?? "No numeric score"}${(values?.bonusPoints?.[itemIndex] ?? 0) > 0 ? ` (+${values?.bonusPoints?.[itemIndex]} bonus)` : ""}`
                      : "Choose a learner to enter scores."}
                  </Text>
                  {!item.assessmentId && (
                    <>
                      <Field
                        label="Highest possible score"
                        value={hps}
                        onChangeText={setHps}
                      />
                      <Action
                        label="Save HPS"
                        disabled={
                          !canPrepare ||
                          !hps.trim() ||
                          !Number.isFinite(Number(hps)) ||
                          Number(hps) < 0
                        }
                        onPress={() =>
                          void write(
                            () =>
                              classRecordApi.updateItem(item.id, {
                                maxScore: Number(hps),
                              }),
                            "HPS updated.",
                          )
                        }
                      />
                      <Field
                        label="Recorded score (blank is missing)"
                        value={score}
                        onChangeText={setScore}
                      />
                      <Field
                        label="Bonus points (optional)"
                        value={bonusPoints}
                        onChangeText={setBonusPoints}
                      />
                      {Number(bonusPoints || 0) > 0 ? (
                        <Field
                          label="Bonus reason (required)"
                          value={bonusReason}
                          onChangeText={setBonusReason}
                          multiline
                        />
                      ) : null}
                      <Text style={textStyle}>
                        A bonus is stored separately and never raises this item
                        above full credit.
                      </Text>
                      <Action
                        label="Save explicit score"
                        disabled={
                          !canGrade ||
                          person?.eligibility !== "eligible" ||
                          !score.trim() ||
                          !Number.isFinite(Number(score)) ||
                          Number(score) < 0 ||
                          Number(score) > Number(hps || item.hps || 0) ||
                          !Number.isFinite(Number(bonusPoints || 0)) ||
                          Number(bonusPoints || 0) < 0 ||
                          (Number(bonusPoints || 0) > 0 && !bonusReason.trim())
                        }
                        onPress={() =>
                          void write(
                            () =>
                              classRecordApi.recordScore(item.id, {
                                studentId,
                                status: "recorded",
                                score: Number(score),
                                bonusPoints: Number(bonusPoints || 0),
                                bonusReason:
                                  Number(bonusPoints || 0) > 0
                                    ? bonusReason.trim()
                                    : undefined,
                              }),
                            "Score saved.",
                          )
                        }
                      />
                    </>
                  )}
                  {item.assessmentId && (
                    <Action
                      label="Synchronize completed assessment results"
                      disabled={!canGrade}
                      onPress={() =>
                        void write(
                          () => classRecordApi.syncScores(item.id),
                          "Completed grading evidence synchronized; exemptions preserved.",
                        )
                      }
                    />
                  )}
                  <Field
                    label="Exemption or correction reason"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                  />
                  <Action
                    label="Mark learner excused"
                    disabled={
                      !canGrade ||
                      person?.eligibility !== "eligible" ||
                      !reason.trim()
                    }
                    onPress={() =>
                      void write(
                        () =>
                          classRecordApi.recordScore(item.id, {
                            studentId,
                            status: "excused",
                            score: null,
                            reason,
                          }),
                        "Exemption recorded with its reason.",
                      )
                    }
                  />
                  {item.assessmentId && scoreStatus === "excused" && (
                    <Action
                      label="Restore assessment evidence"
                      disabled={!canGrade || !reason.trim()}
                      onPress={() =>
                        void write(
                          () =>
                            classRecordApi.restoreAssessmentEvidence(
                              item.id,
                              studentId,
                              reason,
                            ),
                          "Graded evidence restored; ungraded evidence remains missing.",
                        )
                      }
                    />
                  )}
                </>
              )}
            </View>
          </Panel>
          <MobileClassRecordWorkbook workbook={sheet} hideExport />
        </>
      )}
      {data && tab === "eligibility" && (
        <Panel
          title="Period eligibility"
          subtitle="Confirm actual period participation. Current enrollment alone cannot establish past eligibility."
        >
          <View style={{ padding: 14, gap: 12 }}>
            {data.roster.participants.map((p) => (
              <View key={p.studentId} style={{ gap: 6 }}>
                <Text style={textStyle}>
                  {p.lastName}, {p.firstName} ·{" "}
                  {p.currentlyEnrolled
                    ? "currently enrolled"
                    : "not currently enrolled"}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {(
                    [
                      "eligible",
                      "not_enrolled",
                      "transferred",
                      "withdrawn",
                    ] as const
                  ).map((value) => (
                    <Chip
                      key={value}
                      label={value.replaceAll("_", " ")}
                      active={decisions[p.studentId]?.eligibility === value}
                      onPress={() =>
                        canPrepare &&
                        setDecisions((prev) => ({
                          ...prev,
                          [p.studentId]: {
                            eligibility: value,
                            reason: prev[p.studentId]?.reason ?? "",
                          },
                        }))
                      }
                    />
                  ))}
                </View>
                <Field
                  label="Exclusion evidence"
                  value={decisions[p.studentId]?.reason ?? ""}
                  onChangeText={(value) =>
                    setDecisions((prev) => ({
                      ...prev,
                      [p.studentId]: {
                        eligibility: prev[p.studentId]?.eligibility ?? "",
                        reason: value,
                      },
                    }))
                  }
                />
              </View>
            ))}
            <Field
              label="Register confirmation reason"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Action
              label="Confirm period eligibility"
              disabled={
                !canPrepare ||
                !reason.trim() ||
                data.roster.participants.some(
                  (p) =>
                    !decisions[p.studentId]?.eligibility ||
                    (decisions[p.studentId].eligibility !== "eligible" &&
                      !decisions[p.studentId].reason.trim()),
                )
              }
              onPress={() =>
                void write(
                  () =>
                    classRecordApi.confirmRoster(selected!.id, {
                      reason,
                      participants: data.roster.participants.map((p) => ({
                        studentId: p.studentId,
                        eligibility: decisions[p.studentId]
                          .eligibility as PeriodEligibility,
                        reason: decisions[p.studentId].reason || undefined,
                      })),
                    }),
                  "Eligibility register confirmed.",
                )
              }
            />
          </View>
        </Panel>
      )}
      {data && tab === "readiness" && (
        <Panel title="Finalization readiness">
          <View style={{ padding: 14, gap: 10 }}>
            <Text style={textStyle}>
              {data.readiness.ready
                ? "All checks pass."
                : `${data.readiness.blockers.length} blockers`}
            </Text>
            {data.readiness.blockers.map((b, i) => (
              <Text key={`${b.code}-${i}`} style={textStyle}>
                {b.message}
                {b.studentId
                  ? ` · ${sheet?.students.find((p) => p.studentId === b.studentId)?.lastName ?? b.studentId}`
                  : ""}
              </Text>
            ))}
            <Action
              label="Finalize verified period"
              disabled={!canGrade || !data.readiness.ready}
              onPress={() =>
                Alert.alert(
                  "Finalize period?",
                  "The server rechecks every score and eligibility before writing an immutable revision.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Finalize",
                      onPress: () =>
                        void write(
                          () => classRecordApi.finalize(selected!.id),
                          "Period finalized.",
                        ),
                    },
                  ],
                )
              }
            />
            {sheet?.canReopen && (
              <>
                <Field
                  label="Reopening reason"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
                <Action
                  label="Reopen and invalidate dependent results"
                  disabled={busy || stale || !reason.trim()}
                  onPress={() =>
                    void write(
                      () => classRecordApi.reopen(selected!.id, reason),
                      "Prior revisions remain in history. Annual evidence must be recomputed.",
                    )
                  }
                />
              </>
            )}
          </View>
        </Panel>
      )}
      {tab === "annual" && (
        <Panel title="Annual summary">
          {annual.data ? (
            <AcademicAnnualPanel
              summary={annual.data}
              admin={admin}
              refresh={refresh}
            />
          ) : (
            <Text style={textStyle}>
              {annual.isError
                ? "Annual evidence could not be loaded."
                : "Loading annual evidence…"}
            </Text>
          )}
        </Panel>
      )}
      {tab === "history" && (
        <Panel title="Revision history">
          <View style={{ padding: 14, gap: 10 }}>
            {history.data?.revisions.map((r) => (
              <Text key={r.id} style={textStyle}>
                {sheet?.students.find((p) => p.studentId === r.studentId)
                  ?.lastName ?? r.studentId}{" "}
                · revision {r.revision} · {r.grade} ·{" "}
                {r.isCurrent ? "current" : "superseded"}
                {"\n"}
                {r.id}
              </Text>
            ))}
            {history.data?.legacyEvidence.map((r) => (
              <Text key={r.id} style={textStyle}>
                Unverified legacy evidence · {r.period}
                {"\n"}
                {JSON.stringify(r.sourceSnapshot)}
              </Text>
            ))}
            {history.isError && (
              <Text style={textStyle}>History could not be loaded.</Text>
            )}
          </View>
        </Panel>
      )}
      {sheet && (
        <Action
          label="Export workbook and annual evidence"
          disabled={busy || stale}
          onPress={() =>
            void write(
              async () =>
                exportAcademicCsv(
                  sheet,
                  await classRecordApi.annualSummary(classId),
                ),
              "Export includes policy, denominators, missing/zero/excused statuses, annual sources and remediation.",
            )
          }
        />
      )}
    </View>
  );
}
