import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { academicGradingService } from "../../api/services/academic-grading";
import { toAppError } from "../../api/http";
import type {
  AnnualSummary,
  AcademicPeriodKey,
} from "../../types/academic-grading";
import {
  TeacherActionButton as Action,
  TeacherChip as Chip,
  TeacherInlineField as Field,
  teacherTheme as theme,
} from "../teacher/TeacherMobilePrimitives";
const style = { color: theme.text, fontSize: 13, lineHeight: 20 };
export function AcademicAnnualPanel({
  summary,
  admin,
  refresh,
}: {
  summary: AnnualSummary;
  admin: boolean;
  refresh: () => Promise<unknown>;
}) {
  const [studentId, setStudentId] = useState("");
  const [period, setPeriod] = useState<AcademicPeriodKey>(
    summary.periods[0].key,
  );
  const [grade, setGrade] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const student =
    summary.students.find((s) => s.studentId === studentId) ??
    summary.students[0];
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refresh();
      setGrade("");
      setReason("");
      setReference("");
      Alert.alert(
        "Evidence recorded",
        "Annual and remediation evidence refreshed.",
      );
    } catch (e) {
      Alert.alert("Evidence rejected", toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };
  const invalid =
    busy ||
    !reason.trim() ||
    !reference.trim() ||
    !grade.trim() ||
    !Number.isInteger(Number(grade)) ||
    Number(grade) < 0 ||
    Number(grade) > 100;
  return (
    <View style={{ padding: 14, gap: 10 }}>
      <Text style={style}>
        {summary.subjectCode} · {summary.schoolYear} · {summary.policy.id}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {summary.students.map((s) => (
          <Chip
            key={s.studentId}
            label={`${s.lastName}, ${s.firstName}`}
            active={student?.studentId === s.studentId}
            onPress={() => {
              setStudentId(s.studentId);
              setReason("");
              setReference("");
              setGrade("");
            }}
          />
        ))}
      </View>
      {student ? (
        <>
          {summary.periods.map((p) => {
            const c = student.components.find((c) => c.period === p.key);
            return (
              <Text key={p.key} style={style}>
                {p.label}: {c?.grade ?? "Missing / unresolved"}
                {c ? `\n${c.sourceType}: ${c.sourceId}` : ""}
              </Text>
            );
          })}
          <Text style={style}>
            Official annual grade:{" "}
            {student.current?.officialGrade ?? "Incomplete"}
            {student.current
              ? ` · ${student.current.remarks}\nSum ${student.current.sum} / ${student.current.divisor} = ${student.current.rawAverage} before half-up rounding`
              : ""}
          </Text>
          {student.blockers.map((b, i) => (
            <Text key={i} style={style}>
              {b.message}
            </Text>
          ))}
          {student.remediation.map((r) => (
            <Text key={r.id} style={style}>
              SRC {r.remedialClassMark} · recomputed final grade{" "}
              {r.recomputedGrade} · {r.isCurrent ? "current" : "superseded"}
              {"\n"}
              {r.sourceReference} · {r.reason}
            </Text>
          ))}
          {student.history.map((h) => (
            <Text key={h.id} style={style}>
              Annual revision {h.id} · {h.officialGrade} ·{" "}
              {h.isCurrent ? "current" : (h.invalidationReason ?? "superseded")}
            </Text>
          ))}
          {admin ? (
            <>
              <Text style={style}>
                Admin evidence corrections. Enter only verified records; reasons
                and references are audited.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {summary.periods.map((p) => (
                  <Chip
                    key={p.key}
                    label={p.label}
                    active={period === p.key}
                    onPress={() => setPeriod(p.key)}
                  />
                ))}
              </View>
              <Field
                label="Official grade / SRC mark (whole number)"
                value={grade}
                onChangeText={setGrade}
              />
              <Field
                label="Source reference"
                value={reference}
                onChangeText={setReference}
              />
              <Field
                label="Evidence reason"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Action
                label="Record verified external period grade"
                disabled={invalid}
                onPress={() =>
                  void run(() =>
                    academicGradingService.externalGrade(summary.classId, {
                      studentId: student.studentId,
                      period,
                      grade: Number(grade),
                      reason,
                      sourceReference: reference,
                    }),
                  )
                }
              />
              {student.current &&
                student.current.officialGrade < summary.policy.passingGrade && (
                  <Action
                    label="Record SRC result"
                    disabled={invalid}
                    onPress={() =>
                      void run(() =>
                        academicGradingService.recordRemediation(
                          student.current!.id,
                          {
                            remedialClassMark: Number(grade),
                            reason,
                            sourceReference: reference,
                          },
                        ),
                      )
                    }
                  />
                )}
              {student.candidates
                .filter((c) => c.period === period)
                .map((c) => (
                  <View key={c.id} style={{ gap: 4 }}>
                    <Text style={style}>
                      {c.sourceType} · grade {c.grade} ·{" "}
                      {c.trusted ? "verified" : "untrusted"}
                      {"\n"}
                      {c.id}
                    </Text>
                    <Action
                      label="Select this period source"
                      disabled={busy || !reason.trim() || !c.trusted}
                      onPress={() =>
                        void run(() =>
                          academicGradingService.selectSource(summary.classId, {
                            studentId: student.studentId,
                            period,
                            sourceId: c.id,
                            sourceType: c.sourceType,
                            reason,
                          }),
                        )
                      }
                    />
                  </View>
                ))}
            </>
          ) : (
            <Text style={style}>
              External grades, conflicting-source choices and SRC evidence
              require an administrator.
            </Text>
          )}
        </>
      ) : (
        <Text style={style}>No annual participants.</Text>
      )}
    </View>
  );
}
