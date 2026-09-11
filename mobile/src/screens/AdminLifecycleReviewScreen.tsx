import { useEffect, useMemo, useState } from "react";
import { AppState, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { adminLifecycleApi } from "../api/services/admin-lifecycle";
import { academicStateService } from "../api/services/academic-state";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import {
  buildExecutionEvidence,
  canExecuteManifest,
} from "../features/admin-lifecycle/model";
import type { RootStackParamList } from "../navigation/types";
import type {
  AcademicPeriodKey,
  AdminLifecycleExecutionResult,
  AdminLifecyclePreview,
  AdminLifecycleReasonCode,
  ClassLifecycleResolution,
  PreviewClassLifecycleInput,
  PreviewPurgeLifecycleInput,
  PreviewSectionLifecycleInput,
  PreviewStudentLifecycleInput,
  SectionStudentResolution,
  StudentLifecycleResolution,
} from "../types/admin-lifecycle";
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

type Props = NativeStackScreenProps<RootStackParamList, "AdminLifecycleReview">;
type LearnerOutcome = {
  resolution?: SectionStudentResolution;
  destinationSectionId?: string;
};

const studentOutcomes: Array<{
  value: StudentLifecycleResolution;
  label: string;
  description: string;
}> = [
  {
    value: "CORRECT_ENROLLMENT",
    label: "Correct error",
    description:
      "Remove an enrollment that was created in error when no retained evidence blocks correction.",
  },
  {
    value: "WITHDRAW",
    label: "Withdraw",
    description:
      "Close the learner's active memberships while preserving academic evidence.",
  },
  {
    value: "TRANSFER_SECTION",
    label: "Transfer section",
    description:
      "Move the learner and compatible subject memberships to another section.",
  },
  {
    value: "TRANSFER_CLASS",
    label: "Transfer class",
    description:
      "Replace one subject-class membership within the same section.",
  },
];

const classOutcomes: Array<{
  value: ClassLifecycleResolution;
  label: string;
  description: string;
}> = [
  {
    value: "ARCHIVE_EMPTY",
    label: "Archive empty",
    description: "Use only when this class has no active learner memberships.",
  },
  {
    value: "COMPLETE",
    label: "Complete",
    description: "Complete active memberships and preserve official evidence.",
  },
  {
    value: "DROP",
    label: "Drop",
    description: "Close active memberships as withdrawals.",
  },
  {
    value: "TRANSFER",
    label: "Transfer",
    description: "Create compatible replacement memberships before archiving.",
  },
];

const reasons: Array<{ value: AdminLifecycleReasonCode; label: string }> = [
  { value: "ERRONEOUS_ENROLLMENT", label: "Enrollment correction" },
  { value: "TRANSFERRED_SECTION", label: "Section transfer" },
  { value: "TRANSFERRED_CLASS", label: "Class transfer" },
  { value: "TRANSFERRED_SCHOOL", label: "Transferred school" },
  { value: "WITHDREW", label: "Learner withdrawal" },
  { value: "COMPLETED", label: "Academic completion" },
  { value: "DUPLICATE_CLASS", label: "Duplicate class" },
  { value: "CURRICULUM_CORRECTION", label: "Curriculum correction" },
  { value: "TEST_OR_EMPTY_RECORD", label: "Empty or test record" },
  { value: "OTHER", label: "Other documented reason" },
];

const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function AdminLifecycleReviewScreen({ navigation, route }: Props) {
  const {
    targetType,
    targetId,
    targetLabel,
    isActive,
    sectionId = "",
    classId: initialClassId = "",
  } = route.params;
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const [effectivePeriod, setEffectivePeriod] =
    useState<AcademicPeriodKey>("Q1");
  const [classResolution, setClassResolution] =
    useState<ClassLifecycleResolution>("ARCHIVE_EMPTY");
  const [replacementClassId, setReplacementClassId] = useState("");
  const [studentResolution, setStudentResolution] =
    useState<StudentLifecycleResolution>("CORRECT_ENROLLMENT");
  const [studentSourceClassId, setStudentSourceClassId] =
    useState(initialClassId);
  const [studentDestinationSectionId, setStudentDestinationSectionId] =
    useState("");
  const [studentDestinationClassId, setStudentDestinationClassId] =
    useState("");
  const [learnerOutcomes, setLearnerOutcomes] = useState<
    Record<string, LearnerOutcome>
  >({});
  const [prepared, setPrepared] = useState<AdminLifecyclePreview | null>(null);
  const [result, setResult] = useState<AdminLifecycleExecutionResult | null>(
    null,
  );
  const [confirmations, setConfirmations] = useState<string[]>([]);
  const [reasonCode, setReasonCode] =
    useState<AdminLifecycleReasonCode>("OTHER");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    Crypto.randomUUID(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = useQuery({
    queryKey: ["academic-state-current", "admin-lifecycle"],
    queryFn: () => academicStateService.getCurrent(),
    enabled: isActive,
  });
  const roster = useQuery({
    queryKey: ["admin-section-lifecycle-roster", targetId],
    queryFn: () => sectionsApi.getRoster(targetId),
    enabled: isActive && targetType === "SECTION",
  });
  const targetClass = useQuery({
    queryKey: ["admin-lifecycle-class", targetId],
    queryFn: () => classesApi.getById(targetId),
    enabled: isActive && targetType === "CLASS",
  });
  const targetSection = useQuery({
    queryKey: [
      "admin-lifecycle-section",
      targetType === "STUDENT" ? sectionId : targetId,
    ],
    queryFn: () =>
      sectionsApi.getById(targetType === "STUDENT" ? sectionId : targetId),
    enabled:
      isActive &&
      (targetType === "SECTION" ||
        (targetType === "STUDENT" && Boolean(sectionId))),
  });
  const studentProfile = useQuery({
    queryKey: ["admin-lifecycle-student-profile", sectionId, targetId],
    queryFn: () => sectionsApi.getStudentProfileForSection(sectionId, targetId),
    enabled: isActive && targetType === "STUDENT" && Boolean(sectionId),
  });
  const classes = useQuery({
    queryKey: ["admin-lifecycle-replacement-classes"],
    queryFn: () => classesApi.getAll({ isActive: true }),
    enabled:
      isActive &&
      ((targetType === "CLASS" && classResolution === "TRANSFER") ||
        (targetType === "STUDENT" && studentResolution === "TRANSFER_CLASS")),
  });
  const sections = useQuery({
    queryKey: ["admin-lifecycle-destination-sections"],
    queryFn: () => sectionsApi.getAll({ isActive: true }),
    enabled:
      isActive &&
      (targetType === "SECTION" ||
        (targetType === "STUDENT" && studentResolution === "TRANSFER_SECTION")),
  });

  useEffect(() => {
    const quarter = current.data?.data.quarter;
    if (quarter) setEffectivePeriod(quarter);
  }, [current.data?.data.quarter]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") setPassword("");
    });
    return () => subscription.remove();
  }, []);

  const compatibleClasses = useMemo(() => {
    const target = targetClass.data;
    if (!target) return [];
    return (classes.data ?? []).filter(
      (entry) =>
        entry.id !== target.id &&
        entry.isActive &&
        entry.sectionId === target.sectionId &&
        entry.schoolYear === target.schoolYear &&
        entry.subjectCode.trim().toUpperCase() ===
          target.subjectCode.trim().toUpperCase(),
    );
  }, [classes.data, targetClass.data]);

  const compatibleSections = useMemo(() => {
    const target = targetSection.data;
    if (!target) return [];
    return (sections.data?.data ?? []).filter(
      (entry) =>
        entry.id !== target.id &&
        entry.isActive &&
        entry.schoolYear === target.schoolYear &&
        entry.gradeLevel === target.gradeLevel,
    );
  }, [sections.data?.data, targetSection.data]);

  const studentSourceClasses = useMemo(() => {
    if (targetType !== "STUDENT") return [];
    return (studentProfile.data?.enrollments ?? [])
      .map((entry) => entry.class)
      .filter((entry): entry is NonNullable<typeof entry> =>
        Boolean(entry?.id),
      );
  }, [studentProfile.data?.enrollments, targetType]);

  const studentDestinationClasses = useMemo(() => {
    const source = studentSourceClasses.find(
      (entry) => entry.id === studentSourceClassId,
    );
    const sourceSection = targetSection.data;
    if (!source || !sourceSection) return [];
    return (classes.data ?? []).filter(
      (entry) =>
        entry.id !== source.id &&
        entry.isActive &&
        entry.sectionId === sourceSection.id &&
        entry.schoolYear === sourceSection.schoolYear &&
        entry.subjectCode.trim().toUpperCase() ===
          (source.subjectCode ?? "").trim().toUpperCase(),
    );
  }, [
    classes.data,
    studentSourceClassId,
    studentSourceClasses,
    targetSection.data,
  ]);

  const sectionInput = (): PreviewSectionLifecycleInput => ({
    sectionId: targetId,
    effectivePeriod,
    studentResolutions: (roster.data ?? []).map((student) => ({
      studentId: student.studentId ?? student.id,
      resolution: learnerOutcomes[student.studentId ?? student.id]
        ?.resolution as SectionStudentResolution,
      destinationSectionId:
        learnerOutcomes[student.studentId ?? student.id]?.destinationSectionId,
    })),
  });

  const classInput = (): PreviewClassLifecycleInput => ({
    classId: targetId,
    resolution: classResolution,
    replacementClassId:
      classResolution === "TRANSFER" ? replacementClassId : undefined,
    effectivePeriod,
  });

  const studentInput = (): PreviewStudentLifecycleInput => ({
    studentId: targetId,
    sectionId,
    resolution: studentResolution,
    classId:
      studentResolution === "TRANSFER_CLASS" ? studentSourceClassId : undefined,
    destinationSectionId:
      studentResolution === "TRANSFER_SECTION"
        ? studentDestinationSectionId
        : undefined,
    destinationClassId:
      studentResolution === "TRANSFER_CLASS"
        ? studentDestinationClassId
        : undefined,
    effectivePeriod,
  });

  const purgeInput = (): PreviewPurgeLifecycleInput => ({
    targetType: targetType === "CLASS" ? "CLASS" : "SECTION",
    targetId,
  });

  const previewCurrentInput = async () => {
    if (!isActive)
      return (await adminLifecycleApi.previewPurge(purgeInput())).data;
    if (targetType === "STUDENT")
      return (await adminLifecycleApi.previewStudent(studentInput())).data;
    if (targetType === "CLASS")
      return (await adminLifecycleApi.previewClass(classInput())).data;
    return (await adminLifecycleApi.previewSection(sectionInput())).data;
  };

  const canPreview = useMemo(() => {
    if (!isActive) return true;
    if (!current.data?.data.quarter) return false;
    if (targetType === "STUDENT") {
      if (!sectionId) return false;
      if (studentResolution === "TRANSFER_SECTION")
        return Boolean(studentDestinationSectionId);
      if (studentResolution === "TRANSFER_CLASS")
        return Boolean(studentSourceClassId && studentDestinationClassId);
      return true;
    }
    if (targetType === "CLASS")
      return classResolution !== "TRANSFER" || Boolean(replacementClassId);
    return (roster.data ?? []).every((student) => {
      const outcome = learnerOutcomes[student.studentId ?? student.id];
      return Boolean(
        outcome?.resolution &&
        (outcome.resolution !== "TRANSFER_SECTION" ||
          outcome.destinationSectionId),
      );
    });
  }, [
    classResolution,
    current.data?.data.quarter,
    isActive,
    learnerOutcomes,
    replacementClassId,
    roster.data,
    sectionId,
    studentDestinationClassId,
    studentDestinationSectionId,
    studentResolution,
    studentSourceClassId,
    targetType,
  ]);

  const loadPreview = async () => {
    if (network.isOffline) {
      setError(
        "A live connection is required to prepare a current backend review.",
      );
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const next = await previewCurrentInput();
      setPrepared(next);
      setConfirmations([]);
      setPassword("");
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!prepared) return;
    if (network.isOffline) {
      setError(
        "A live connection is required. Lifecycle writes are never queued for later execution.",
      );
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const evidence = buildExecutionEvidence({
        manifest: prepared.manifest,
        currentPassword: password,
        reasonCode,
        notes,
        confirmations,
        idempotencyKey,
      });
      const response = !isActive
        ? await adminLifecycleApi.executePurge({ ...purgeInput(), ...evidence })
        : targetType === "STUDENT"
          ? await adminLifecycleApi.executeStudent({
              ...studentInput(),
              ...evidence,
            })
          : targetType === "CLASS"
            ? await adminLifecycleApi.executeClass({
                ...classInput(),
                ...evidence,
              })
            : await adminLifecycleApi.executeSection({
                ...sectionInput(),
                ...evidence,
              });
      setPassword("");
      setResult(response.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-classes"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-classes-all"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-sections"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-sections-all"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-section-roster"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-section-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      ]);
    } catch (nextError) {
      setPassword("");
      const status = (nextError as { response?: { status?: number } }).response
        ?.status;
      if (status === 409) {
        setIdempotencyKey(Crypto.randomUUID());
        setConfirmations([]);
        try {
          setPrepared(await previewCurrentInput());
          setError(
            "The review expired or records changed. Review the refreshed effects before confirming again.",
          );
        } catch (refreshError) {
          setPrepared(null);
          setError(toAppError(refreshError).message);
        }
      } else {
        setError(toAppError(nextError).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const manifest = prepared?.manifest;
  const readyToExecute = manifest
    ? !network.isOffline &&
      canExecuteManifest({
        manifest,
        confirmations,
        notes,
        currentPassword: password,
      })
    : false;
  const loadingInputs =
    current.isLoading ||
    roster.isLoading ||
    targetClass.isLoading ||
    targetSection.isLoading ||
    studentProfile.isLoading;

  if (result) {
    return (
      <AdminScreen
        title="Operation receipt"
        subtitle="Backend-recorded lifecycle result"
        showBackButton
        onBackPress={navigation.goBack}
      >
        <AdminNotice
          title="Operation completed"
          description={`Operation ${result.operationId}`}
          tone="green"
          icon="check-circle-outline"
        />
        <AdminMetricStrip
          items={[
            { label: "Changes", value: result.changed.length, tone: "green" },
            { label: "Preserved", value: result.preserved.length },
            {
              label: "Replay",
              value: result.replayed ? "Yes" : "No",
              tone: result.replayed ? "amber" : "green",
            },
          ]}
        />
        <AdminSection title="Changed records" subtitle={result.action}>
          {result.changed.map((entry) => (
            <AdminDataRow
              key={`${entry.entityType}-${entry.entityId}`}
              title={entry.outcome}
              subtitle={`${entry.entityType} · ${entry.entityId}`}
            />
          ))}
          {!result.changed.length ? (
            <AdminEmpty
              title="No record changes"
              subtitle="The receipt contains no changed entities."
            />
          ) : null}
        </AdminSection>
        <AdminSection title="Preserved evidence">
          {result.preserved.map((entry) => (
            <AdminDataRow key={entry} title={entry} />
          ))}
          {!result.preserved.length ? (
            <AdminEmpty
              title="No preserved list"
              subtitle="The backend did not return preserved-record labels."
            />
          ) : null}
        </AdminSection>
        <AdminSection title="Receipt identifiers">
          <AdminDataRow title="Operation ID" subtitle={result.operationId} />
          {result.auditLogId ? (
            <AdminDataRow title="Audit log ID" subtitle={result.auditLogId} />
          ) : null}
          <View style={{ padding: 16 }}>
            <AdminButton
              label="Return to records"
              variant="solid"
              onPress={navigation.goBack}
            />
          </View>
        </AdminSection>
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      title={isActive ? "Review lifecycle action" : "Review permanent deletion"}
      subtitle="Preview, verify, authenticate, then apply"
      showBackButton
      onBackPress={navigation.goBack}
    >
      <AdminSection
        title="Target"
        subtitle={
          targetType === "CLASS"
            ? "Class record"
            : targetType === "SECTION"
              ? "Section record"
              : "Learner membership"
        }
      >
        <AdminDataRow
          title={targetLabel}
          subtitle={isActive ? "Active record" : "Archived record"}
          status={isActive ? "Review required" : "Permanent"}
          statusTone={isActive ? "amber" : "red"}
        />
      </AdminSection>

      {network.isOffline ? (
        <AdminNotice
          title="Offline · review disabled"
          description="A live connection is required. Cached evidence remains read-only, and lifecycle writes are never queued."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {error ? (
        <AdminNotice
          title="Lifecycle action not ready"
          description={error}
          tone="red"
          icon="alert-circle-outline"
        />
      ) : null}
      {current.isError ||
      roster.isError ||
      targetClass.isError ||
      targetSection.isError ||
      studentProfile.isError ? (
        <AdminNotice
          title="Required context unavailable"
          description="Refresh the record and try again while connected."
          tone="red"
        />
      ) : null}

      {!manifest ? (
        <>
          {isActive ? (
            <AdminSection
              title="Effective academic period"
              subtitle="The backend current state is selected by default"
            >
              <View
                style={{
                  padding: 16,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {(["Q1", "Q2", "Q3", "Q4"] as const).map((period) => (
                  <AdminChip
                    key={period}
                    label={period}
                    active={effectivePeriod === period}
                    onPress={() => setEffectivePeriod(period)}
                  />
                ))}
              </View>
            </AdminSection>
          ) : (
            <AdminNotice
              title="No override is available"
              description="Permanent deletion proceeds only when the backend finds no retained academic or lifecycle evidence."
              tone="red"
              icon="delete-alert-outline"
            />
          )}

          {isActive && targetType === "CLASS" ? (
            <AdminSection
              title="Learner outcome"
              subtitle={
                classOutcomes.find((option) => option.value === classResolution)
                  ?.description
              }
            >
              <View
                style={{
                  padding: 16,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {classOutcomes.map((option) => (
                  <AdminChip
                    key={option.value}
                    label={option.label}
                    active={classResolution === option.value}
                    onPress={() => {
                      setClassResolution(option.value);
                      setReplacementClassId("");
                    }}
                  />
                ))}
              </View>
              {classResolution === "TRANSFER"
                ? compatibleClasses.map((entry) => (
                    <AdminDataRow
                      key={entry.id}
                      title={`${entry.subjectCode} · ${entry.subjectName}`}
                      subtitle={entry.section?.name ?? "No section"}
                      status={
                        replacementClassId === entry.id ? "Selected" : undefined
                      }
                      statusTone="primary"
                      onPress={() => setReplacementClassId(entry.id)}
                    />
                  ))
                : null}
              {classResolution === "TRANSFER" &&
              !compatibleClasses.length &&
              !classes.isLoading ? (
                <AdminEmpty
                  title="No compatible replacement"
                  subtitle="Create or activate a class with the same section, school year, and subject code."
                />
              ) : null}
            </AdminSection>
          ) : null}

          {isActive && targetType === "STUDENT" ? (
            <AdminSection
              title="Learner outcome"
              subtitle={
                studentOutcomes.find(
                  (option) => option.value === studentResolution,
                )?.description
              }
            >
              <View style={{ padding: 16, gap: 12 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {studentOutcomes.map((option) => (
                    <AdminChip
                      key={option.value}
                      label={option.label}
                      active={studentResolution === option.value}
                      onPress={() => {
                        setStudentResolution(option.value);
                        setStudentSourceClassId("");
                        setStudentDestinationSectionId("");
                        setStudentDestinationClassId("");
                      }}
                    />
                  ))}
                </View>
                {studentResolution === "TRANSFER_SECTION" ? (
                  <View style={{ gap: 7 }}>
                    <Text
                      style={{
                        color: theme.subtext,
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      DESTINATION SECTION
                    </Text>
                    {compatibleSections.map((entry) => (
                      <AdminChip
                        key={entry.id}
                        label={`${entry.name} · Grade ${entry.gradeLevel}`}
                        active={studentDestinationSectionId === entry.id}
                        onPress={() => setStudentDestinationSectionId(entry.id)}
                      />
                    ))}
                    {!sections.isLoading && !compatibleSections.length ? (
                      <AdminEmpty
                        title="No compatible section"
                        subtitle="The destination must be active and use the same grade and school year."
                      />
                    ) : null}
                  </View>
                ) : null}
                {studentResolution === "TRANSFER_CLASS" ? (
                  <View style={{ gap: 10 }}>
                    <Text
                      style={{
                        color: theme.subtext,
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      SOURCE CLASS
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {studentSourceClasses.map((entry) => (
                        <AdminChip
                          key={entry.id}
                          label={`${entry.subjectCode ?? "Class"} · ${entry.subjectName ?? entry.id}`}
                          active={studentSourceClassId === entry.id}
                          onPress={() => {
                            setStudentSourceClassId(entry.id);
                            setStudentDestinationClassId("");
                          }}
                        />
                      ))}
                    </View>
                    {studentSourceClassId ? (
                      <Text
                        style={{
                          color: theme.subtext,
                          fontSize: 11,
                          fontWeight: "800",
                        }}
                      >
                        COMPATIBLE DESTINATION CLASS
                      </Text>
                    ) : null}
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {studentDestinationClasses.map((entry) => (
                        <AdminChip
                          key={entry.id}
                          label={`${entry.subjectCode} · ${entry.subjectName}`}
                          active={studentDestinationClassId === entry.id}
                          onPress={() => setStudentDestinationClassId(entry.id)}
                        />
                      ))}
                    </View>
                    {studentSourceClassId &&
                    !classes.isLoading &&
                    !studentDestinationClasses.length ? (
                      <AdminEmpty
                        title="No compatible replacement"
                        subtitle="A replacement must be active, in this section and school year, and use the same subject code."
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </AdminSection>
          ) : null}

          {isActive && targetType === "SECTION" ? (
            <AdminSection
              title="Learner outcomes"
              subtitle="Choose an outcome for every active learner before preview"
            >
              {(roster.data ?? []).map((student) => {
                const studentId = student.studentId ?? student.id;
                const outcome = learnerOutcomes[studentId] ?? {};
                const name =
                  `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
                  student.email ||
                  studentId;
                return (
                  <View
                    key={studentId}
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      {name}
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {(
                        ["WITHDRAW", "TRANSFER_SECTION", "COMPLETE"] as const
                      ).map((resolution) => (
                        <AdminChip
                          key={resolution}
                          label={readable(resolution)}
                          active={outcome.resolution === resolution}
                          onPress={() =>
                            setLearnerOutcomes((currentOutcomes) => ({
                              ...currentOutcomes,
                              [studentId]: {
                                resolution,
                                destinationSectionId:
                                  resolution === "TRANSFER_SECTION"
                                    ? currentOutcomes[studentId]
                                        ?.destinationSectionId
                                    : undefined,
                              },
                            }))
                          }
                        />
                      ))}
                    </View>
                    {outcome.resolution === "TRANSFER_SECTION" ? (
                      <View style={{ gap: 7 }}>
                        {compatibleSections.map((entry) => (
                          <AdminChip
                            key={entry.id}
                            label={`Transfer to ${entry.name}`}
                            active={outcome.destinationSectionId === entry.id}
                            onPress={() =>
                              setLearnerOutcomes((currentOutcomes) => ({
                                ...currentOutcomes,
                                [studentId]: {
                                  ...currentOutcomes[studentId],
                                  destinationSectionId: entry.id,
                                },
                              }))
                            }
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {!roster.isLoading && !(roster.data ?? []).length ? (
                <AdminEmpty
                  title="No active learners"
                  subtitle="The backend preview will confirm whether this section can be archived."
                />
              ) : null}
            </AdminSection>
          ) : null}

          <View style={{ padding: 16 }}>
            <AdminButton
              label={
                busy || loadingInputs ? "Preparing review…" : "Review impact"
              }
              icon="shield-search"
              tone={isActive ? "primary" : "red"}
              variant="solid"
              disabled={
                busy || loadingInputs || !canPreview || network.isOffline
              }
              onPress={() => void loadPreview()}
            />
          </View>
        </>
      ) : (
        <>
          <AdminNotice
            title={
              manifest.safeToExecute
                ? "Backend review prepared"
                : "Cannot continue yet"
            }
            description={`Review expires ${new Date(manifest.expiresAt).toLocaleString()}.`}
            tone={manifest.safeToExecute ? "green" : "red"}
            icon={manifest.safeToExecute ? "shield-check" : "shield-alert"}
          />
          {manifest.blockers.length ? (
            <AdminSection
              title="Blockers"
              subtitle="These conditions must be resolved before execution"
            >
              {manifest.blockers.map((entry) => (
                <AdminDataRow
                  key={`${entry.code}-${entry.message}`}
                  title={entry.message}
                  subtitle={entry.code}
                  status={entry.resolvable ? "Resolvable" : "Blocked"}
                  statusTone="red"
                />
              ))}
            </AdminSection>
          ) : null}
          {manifest.warnings.length ? (
            <AdminSection title="Warnings">
              {manifest.warnings.map((entry) => (
                <AdminDataRow
                  key={`${entry.code}-${entry.message}`}
                  title={entry.message}
                  subtitle={entry.code}
                  status="Review"
                  statusTone="amber"
                />
              ))}
            </AdminSection>
          ) : null}
          <AdminSection
            title="Will change"
            subtitle={`${manifest.effects.length} backend-planned effects`}
          >
            {manifest.effects.map((entry) => (
              <AdminDataRow
                key={`${entry.entityType}-${entry.entityId}-${entry.summary}`}
                title={entry.summary}
                subtitle={`${entry.kind} · ${entry.entityType}`}
                meta={entry.entityId}
              />
            ))}
            {!manifest.effects.length ? (
              <AdminEmpty
                title="No changes listed"
                subtitle="The backend manifest returned no effects."
              />
            ) : null}
          </AdminSection>
          <AdminSection title="Will be preserved">
            {manifest.preserved.map((entry) => (
              <AdminDataRow key={entry} title={entry} />
            ))}
            {!manifest.preserved.length ? (
              <AdminEmpty
                title="No preservation labels"
                subtitle="Review the effects and blockers before continuing."
              />
            ) : null}
          </AdminSection>
          <AdminSection
            title="Evidence snapshot"
            subtitle={`${manifest.academicState.schoolYear} · ${manifest.academicState.period} · version ${manifest.academicState.version}`}
          >
            {Object.entries(manifest.evidence).map(([label, value]) => (
              <AdminDataRow
                key={label}
                title={readable(label)}
                status={String(value)}
                statusTone="neutral"
              />
            ))}
          </AdminSection>

          {manifest.safeToExecute ? (
            <AdminSection
              title="Confirm and authenticate"
              subtitle="Every item is required and is submitted as backend evidence"
            >
              <View style={{ padding: 16, gap: 12 }}>
                <Text
                  style={{
                    color: theme.subtext,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  REVIEWED EFFECTS
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {manifest.requiredConfirmations.map((confirmation) => (
                    <AdminChip
                      key={confirmation}
                      label={readable(confirmation)}
                      active={confirmations.includes(confirmation)}
                      onPress={() =>
                        setConfirmations((currentConfirmations) =>
                          currentConfirmations.includes(confirmation)
                            ? currentConfirmations.filter(
                                (entry) => entry !== confirmation,
                              )
                            : [...currentConfirmations, confirmation],
                        )
                      }
                    />
                  ))}
                </View>
                <Text
                  style={{
                    color: theme.subtext,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  DOCUMENTED REASON
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {reasons.map((reason) => (
                    <AdminChip
                      key={reason.value}
                      label={reason.label}
                      active={reasonCode === reason.value}
                      onPress={() => setReasonCode(reason.value)}
                    />
                  ))}
                </View>
                <AdminField
                  label="Administrative notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Record the request, evidence checked, and effective date."
                  multiline
                  maxLength={2000}
                />
                <AdminField
                  label="Current password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="current-password"
                  maxLength={128}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AdminButton
                      label="Change outcome"
                      tone="neutral"
                      onPress={() => {
                        setPrepared(null);
                        setConfirmations([]);
                        setPassword("");
                        setError(null);
                        setIdempotencyKey(Crypto.randomUUID());
                      }}
                      disabled={busy}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AdminButton
                      label={
                        busy
                          ? "Applying…"
                          : isActive
                            ? "Confirm and apply"
                            : "Permanently delete"
                      }
                      icon={isActive ? "shield-check" : "delete-forever"}
                      tone={isActive ? "green" : "red"}
                      variant="solid"
                      onPress={() => void execute()}
                      disabled={busy || !readyToExecute}
                    />
                  </View>
                </View>
              </View>
            </AdminSection>
          ) : (
            <View style={{ padding: 16 }}>
              <AdminButton
                label="Change outcome"
                tone="neutral"
                variant="solid"
                onPress={() => {
                  setPrepared(null);
                  setError(null);
                }}
              />
            </View>
          )}
        </>
      )}
    </AdminScreen>
  );
}
