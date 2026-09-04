import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { fileUploadApi } from "../api/services/file-upload";
import { modulesApi } from "../api/services/modules";
import { lessonsApi } from "../api/services/lessons";
import { aiApi } from "../api/services/ai";
import { lxpApi } from "../api/services/lxp";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import { boundAcademicPercentage } from "../lib/academicScore";
import type { RootStackParamList } from "../navigation/types";
import type {
  StudentMasterlistItem,
  TeacherClassStudentOverview,
} from "../types/class";
import type { Assessment } from "../types/assessment";
import type {
  AiGenerationJob,
  AiGenerationJobResult,
  ClassAiPolicy,
  InterventionStructuredOutput,
  UpdateClassAiPolicyDto,
} from "../types/ai";
import type { Lesson } from "../types/lesson";
import type { ModuleItem } from "../types/module";
import type {
  GeneratedArtifactApprovalResponse,
  GuidedAssessmentContent,
  TeacherInterventionCase,
  TeacherInterventionCaseDetail,
} from "../types/teacher";
import { extractLessonBlockText } from "../utils/lessonBlocks";
import { formatStudentIdentityWithStatus } from "../utils/studentIdentity";
import { presentAcademicScore } from "../lib/academicScore";
import { TeacherAssessmentReviewScreen } from "./TeacherAssessmentReviewScreen";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

export { TeacherAiDraftScreen } from "./TeacherAiDraftScreen";
export { TeacherExtractionDetailScreen } from "./TeacherExtractionDetailScreen";

type AssessmentAttemptProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherAssessmentAttemptResult"
>;
type ClassAddStudentsProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherClassAddStudents"
>;
type ClassStudentOverviewProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherClassStudentOverview"
>;
type SectionAddStudentsProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherSectionAddStudents"
>;
type SectionStudentProfileProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherSectionStudentProfile"
>;
type ModuleFileDetailProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherModuleFileDetail"
>;
type LessonEditorProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherLessonEditor"
>;
type InterventionDetailProps = NativeStackScreenProps<
  RootStackParamList,
  "TeacherInterventionDetail"
>;
type InterventionWorkspaceContentProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  caseId: string;
  classId?: string;
  embedded?: boolean;
  onClose?: () => void;
  onAssigned?: (classId?: string) => void;
};

function formatName(value?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    [value?.firstName, value?.lastName].filter(Boolean).join(" ").trim() ||
    value?.email ||
    "Student"
  );
}

function normalizeGradeKey(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  const gradeNumber = normalized.match(/\d+/)?.[0];
  return gradeNumber || normalized;
}

function toPercent(value: number | null | undefined) {
  return typeof value === "number"
    ? `${boundAcademicPercentage(value).toFixed(1)}%`
    : "N/A";
}

function stringifyStatus(value?: string | null) {
  return (value || "pending").replace(/_/g, " ");
}

function getErrorMessage(error: unknown) {
  return toAppError(error).message;
}

export function TeacherAssessmentAttemptResultScreen(
  props: AssessmentAttemptProps,
) {
  return (
    <TeacherAssessmentReviewScreen
      navigation={props.navigation as never}
      route={
        {
          key: props.route.key,
          name: "TeacherAssessmentReview",
          params: props.route.params,
        } as never
      }
    />
  );
}

export function TeacherClassStudentOverviewScreen({
  navigation,
  route,
}: ClassStudentOverviewProps) {
  const { classId, studentId } = route.params;
  const [overview, setOverview] = useState<TeacherClassStudentOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOverview(
        await classesApi.getStudentOverviewForClass(classId, studentId),
      );
    } catch (loadError) {
      setOverview(null);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [classId, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const history = overview?.history;

  return (
    <TeacherScreen
      title={overview ? formatName(overview.student) : "Student overview"}
      subtitle={
        overview?.classInfo.sectionLabel ||
        "Class student profile, grades, and assessment history."
      }
      icon="account-school-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {overview ? (
        <>
          <TeacherStats
            items={[
              {
                label: "Overall",
                value: toPercent(overview.standing.overallGradePercent),
                tone: "blue",
              },
              {
                label: "Finished",
                value: history?.finished.length ?? 0,
                tone: "green",
              },
              {
                label: "Late",
                value: history?.late.length ?? 0,
                tone: "amber",
              },
              {
                label: "Pending",
                value: history?.pending.length ?? 0,
                tone: "red",
              },
            ]}
          />
          <TeacherPanel
            title="Standing"
            subtitle={
              overview.classInfo.subjectName ||
              overview.classInfo.subjectCode ||
              "Class standing"
            }
          >
            <TeacherRow
              title="Status"
              subtitle={stringifyStatus(overview.student.status)}
            />
            <TeacherRow
              title="LRN"
              subtitle={overview.student.profile?.lrn || "N/A"}
            />
            <TeacherRow
              title="Written work"
              subtitle={toPercent(
                overview.standing.components.writtenWorkPercent,
              )}
            />
            <TeacherRow
              title="Performance task"
              subtitle={toPercent(
                overview.standing.components.performanceTaskPercent,
              )}
            />
            <TeacherRow
              title="Quarterly exam"
              subtitle={toPercent(
                overview.standing.components.quarterlyExamPercent,
              )}
            />
          </TeacherPanel>
          <TeacherPanel
            title="Assessment history"
            subtitle="Finished, late, and pending work are separated like the web overview."
          >
            {(["finished", "late", "pending"] as const).map((group) => (
              <View
                key={group}
                style={{ borderTopWidth: 1, borderTopColor: theme.border }}
              >
                <Text
                  style={{
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    fontSize: 12,
                    fontWeight: "800",
                    color: theme.red,
                    textTransform: "capitalize",
                  }}
                >
                  {group}
                </Text>
                {(history?.[group] ?? []).length ? (
                  history?.[group].map((item) => (
                    <TeacherRow
                      key={`${group}-${item.assessmentId}`}
                      title={item.title}
                      subtitle={`${item.statusLabel} | ${presentAcademicScore(item).compactLabel}`}
                    />
                  ))
                ) : (
                  <TeacherRow
                    title="No records"
                    subtitle={`No ${group} assessment records.`}
                  />
                )}
              </View>
            ))}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel
          title={error ? "Student overview unavailable" : "Loading"}
          subtitle={error || "Loading student overview."}
        >
          <TeacherEmpty
            title={error ? "Unable to load" : "Loading"}
            subtitle={error || "Pull to refresh if this takes too long."}
          />
        </TeacherPanel>
      )}
    </TeacherScreen>
  );
}

export function TeacherClassAddStudentsScreen({
  navigation,
  route,
}: ClassAddStudentsProps) {
  const { classId } = route.params;
  const [gradeLevel, setGradeLevel] = useState("");
  const [search, setSearch] = useState("");
  const [eligibility, setEligibility] = useState<
    "all" | "eligible" | "mismatch"
  >("eligible");
  const [students, setStudents] = useState<StudentMasterlistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [classLabel, setClassLabel] = useState("Class");
  const [sectionLabel, setSectionLabel] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const classItem = await classesApi.getById(classId);
      const resolvedGrade =
        gradeLevel ||
        classItem.section?.gradeLevel ||
        classItem.subjectGradeLevel ||
        "";
      const resolvedSectionId =
        classItem.sectionId || classItem.section?.id || "";
      const resolvedSectionLabel =
        classItem.section?.name || "assigned section";
      setClassLabel(classItem.subjectCode + " | " + classItem.subjectName);
      setSectionLabel(resolvedSectionLabel);
      if (!gradeLevel && resolvedGrade) setGradeLevel(resolvedGrade);
      if (!resolvedGrade) {
        setStudents([]);
        return;
      }
      const response = await classesApi.getStudentsMasterlist(classId, {
        gradeLevel: resolvedGrade,
        sectionId: resolvedSectionId || undefined,
        search: search.trim() || undefined,
        eligibility,
        prioritizeEligible: true,
        page: 1,
        limit: 50,
      });
      const targetGradeKey = normalizeGradeKey(resolvedGrade);
      const filteredRows = response.data.filter((student) => {
        const studentGradeKey = normalizeGradeKey(
          student.gradeLevel || student.section?.gradeLevel,
        );
        const matchesGrade = targetGradeKey
          ? studentGradeKey === targetGradeKey
          : true;
        const matchesSection = resolvedSectionId
          ? student.section?.id === resolvedSectionId
          : true;
        return matchesGrade && matchesSection;
      });
      setStudents(filteredRows);
      setSelectedIds([]);
    } catch (error) {
      Alert.alert("Unable to load students", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [classId, eligibility, gradeLevel, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const addSelected = async () => {
    const eligibleIds = selectedIds.filter((id) =>
      students.some((student) => student.id === id && student.isEligible),
    );
    if (!eligibleIds.length) {
      Alert.alert("Select students", "Select at least one eligible student.");
      return;
    }
    try {
      setAdding(true);
      await Promise.all(
        eligibleIds.map((id) =>
          classesApi.enrollStudent(classId, { studentId: id }),
        ),
      );
      Alert.alert(
        "Students added",
        `${eligibleIds.length} student(s) were added.`,
      );
      navigation.navigate("TeacherClassDetail", {
        classId,
        initialTab: "students",
      });
    } catch (error) {
      Alert.alert("Unable to add students", getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  return (
    <TeacherScreen
      title="Add Students"
      subtitle={classLabel}
      icon="account-multiple-plus-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherSearch
        value={search}
        onChangeText={setSearch}
        placeholder="Search masterlist"
      />
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {(["all", "eligible", "mismatch"] as const).map((value) => (
          <TeacherChip
            key={value}
            label={value}
            active={eligibility === value}
            onPress={() => setEligibility(value)}
          />
        ))}
      </View>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.blueSoft,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.blue }}>
          Grade and section locked
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontSize: 11,
            lineHeight: 16,
            color: theme.muted,
          }}
        >
          Showing only Grade {gradeLevel || "matched"} students from{" "}
          {sectionLabel || "this class section"}.
        </Text>
      </View>
      <TeacherPanel
        title="Eligible students"
        subtitle={`Selected ${selectedIds.length}. Only matching grade and section students are shown.`}
        action={
          <TeacherActionButton
            label={adding ? "Adding..." : "Add selected"}
            icon="account-plus-outline"
            tone="green"
            disabled={adding}
            onPress={() => void addSelected()}
          />
        }
      >
        {students.length ? (
          students.map((student) => {
            const selected = selectedIds.includes(student.id);
            return (
              <TeacherRow
                key={student.id}
                title={formatName(student)}
                subtitle={
                  student.isEligible
                    ? formatStudentIdentityWithStatus(student, "Eligible")
                    : formatStudentIdentityWithStatus(
                        student,
                        student.disabledReason || "Not eligible",
                      )
                }
                onPress={() => {
                  if (!student.isEligible) return;
                  setSelectedIds((current) =>
                    current.includes(student.id)
                      ? current.filter((id) => id !== student.id)
                      : [...current, student.id],
                  );
                }}
                right={
                  <Pressable
                    disabled={!student.isEligible}
                    onPress={() =>
                      setSelectedIds((current) =>
                        current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id],
                      )
                    }
                    style={{
                      opacity: student.isEligible ? 1 : 0.45,
                      borderRadius: 8,
                      backgroundColor: selected
                        ? theme.greenSoft
                        : theme.blueSoft,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: selected ? theme.green : theme.blue,
                      }}
                    >
                      {selected ? "Selected" : "Select"}
                    </Text>
                  </Pressable>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title="No students found"
            subtitle="Adjust search or eligibility filters, then refresh."
            icon="account-search-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherSectionAddStudentsScreen({
  navigation,
  route,
}: SectionAddStudentsProps) {
  const { sectionId } = route.params;
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<
    Array<{
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      lrn?: string | null;
      gradeLevel?: string;
      isEligible?: boolean;
      eligibilityReason?: string | null;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sectionName, setSectionName] = useState("Section");
  const [sectionGradeLevel, setSectionGradeLevel] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const section = await sectionsApi.getById(sectionId);
      const candidates = await sectionsApi.getCandidates(sectionId, {
        search,
        gradeLevel: section.gradeLevel,
        eligibility: "eligible",
        prioritizeEligible: true,
        limit: 50,
      });
      setSectionName(section.name);
      setSectionGradeLevel(section.gradeLevel);
      setStudents(
        candidates.filter(
          (student) =>
            !section.gradeLevel || student.gradeLevel === section.gradeLevel,
        ),
      );
    } catch (error) {
      Alert.alert("Unable to load section candidates", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search, sectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addSelected = async () => {
    try {
      const visibleEligibleIds = new Set(
        students
          .filter(
            (student) =>
              student.isEligible !== false &&
              (!sectionGradeLevel || student.gradeLevel === sectionGradeLevel),
          )
          .map((student) => student.id),
      );
      const safeSelectedIds = selectedIds.filter((id) =>
        visibleEligibleIds.has(id),
      );
      if (!safeSelectedIds.length) {
        Alert.alert(
          "Select students",
          "Select at least one Grade-matched eligible student.",
        );
        return;
      }
      await sectionsApi.addStudents(sectionId, safeSelectedIds);
      Alert.alert(
        "Students added",
        `${safeSelectedIds.length} student(s) were added to the section.`,
      );
      navigation.navigate("TeacherSectionDetail", { sectionId });
    } catch (error) {
      Alert.alert("Unable to add students", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title="Add Section Students"
      subtitle={sectionName}
      icon="account-plus-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherSearch
        value={search}
        onChangeText={setSearch}
        placeholder="Search section candidates"
      />
      <TeacherPanel
        title="Candidates"
        subtitle={`Grade ${sectionGradeLevel || "N/A"} only. Selected ${selectedIds.length}. Section add uses the same roster endpoint as web.`}
        action={
          <TeacherActionButton
            label="Add selected"
            icon="account-multiple-plus-outline"
            tone="green"
            disabled={!selectedIds.length}
            onPress={() => void addSelected()}
          />
        }
      >
        {students.length ? (
          students.map((student) => {
            const selected = selectedIds.includes(student.id);
            const eligible = student.isEligible ?? !student.eligibilityReason;
            return (
              <TeacherRow
                key={student.id}
                title={formatName(student)}
                subtitle={
                  eligible
                    ? formatStudentIdentityWithStatus(student, "Eligible")
                    : formatStudentIdentityWithStatus(
                        student,
                        student.eligibilityReason || "Not eligible",
                      )
                }
                right={
                  <TeacherChip
                    label={selected ? "Selected" : "Select"}
                    active={selected}
                    onPress={() => {
                      if (!eligible) return;
                      setSelectedIds((current) =>
                        current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id],
                      );
                    }}
                  />
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title="No candidates"
            subtitle="No available student matches the current search."
            icon="account-search-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherSectionStudentProfileScreen({
  navigation,
  route,
}: SectionStudentProfileProps) {
  const { sectionId, studentId } = route.params;
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof sectionsApi.getStudentProfileForSection>
  > | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProfile(
        await sectionsApi.getStudentProfileForSection(sectionId, studentId),
      );
    } catch (error) {
      Alert.alert("Unable to load student profile", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [sectionId, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TeacherScreen
      title={profile ? formatName(profile.student) : "Student profile"}
      subtitle={profile?.section.name || "Section student profile."}
      icon="account-details-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {profile ? (
        <>
          <TeacherPanel
            title="Profile"
            subtitle="Teacher-visible profile fields for this section."
          >
            <TeacherRow
              title="Email"
              subtitle={profile.student.email || "N/A"}
            />
            <TeacherRow
              title="LRN"
              subtitle={profile.student.profile?.lrn || "N/A"}
            />
            <TeacherRow
              title="Grade level"
              subtitle={
                profile.student.profile?.gradeLevel ||
                profile.section.gradeLevel ||
                "N/A"
              }
            />
            <TeacherRow
              title="Phone"
              subtitle={profile.student.profile?.phone || "N/A"}
            />
            <TeacherRow
              title="Address"
              subtitle={profile.student.profile?.address || "N/A"}
            />
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <TeacherActionButton
                label="Unenroll student"
                icon="account-remove-outline"
                tone="red"
                onPress={() => {
                  Alert.alert(
                    "Unenroll Student",
                    `Are you sure you want to remove ${formatName(profile.student)} from this section?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await sectionsApi.removeStudent(
                              sectionId,
                              studentId,
                            );
                            Alert.alert(
                              "Student removed",
                              `${formatName(profile.student)} was removed from this section.`,
                            );
                            navigation.goBack();
                          } catch (error) {
                            Alert.alert(
                              "Unable to remove student",
                              getErrorMessage(error),
                            );
                          }
                        },
                      },
                    ],
                  );
                }}
              />
            </View>
          </TeacherPanel>
          <TeacherPanel
            title="Class enrollments"
            subtitle="Classes linked to this section student."
          >
            {profile.enrollments?.length ? (
              profile.enrollments.map((entry) => (
                <TeacherRow
                  key={entry.id}
                  title={
                    entry.class?.subjectName ||
                    entry.class?.subjectCode ||
                    "Section enrollment"
                  }
                  subtitle={`${stringifyStatus(entry.status)} | ${entry.enrolledAt || "No date"}`}
                />
              ))
            ) : (
              <TeacherEmpty
                title="No class enrollments"
                subtitle="Only the section enrollment is currently visible."
              />
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel
          title="Profile unavailable"
          subtitle="Pull to refresh after the profile endpoint responds."
        />
      )}
    </TeacherScreen>
  );
}

export function TeacherModuleFileDetailScreen({
  navigation,
  route,
}: ModuleFileDetailProps) {
  const { classId, moduleId, fileId, itemId } = route.params;
  const [fileName, setFileName] = useState("");
  const [fileRecord, setFileRecord] = useState<Awaited<
    ReturnType<typeof fileUploadApi.getById>
  > | null>(null);
  const [moduleItem, setModuleItem] = useState<ModuleItem | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [file, module] = await Promise.all([
        fileUploadApi.getById(fileId),
        modulesApi.getByClassAndModule(classId, moduleId),
      ]);
      const item =
        module.sections
          .flatMap((section) => section.items)
          .find((entry) => entry.id === itemId || entry.fileId === fileId) ||
        null;
      setFileRecord(file);
      setFileName(file.originalName || "");
      setModuleItem(item);
    } catch (error) {
      Alert.alert("Unable to load file", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [classId, fileId, itemId, moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveName = async () => {
    if (!fileName.trim()) {
      Alert.alert("File name required", "Enter a display name before saving.");
      return;
    }
    try {
      await fileUploadApi.update(fileId, { originalName: fileName.trim() });
      await load();
    } catch (error) {
      Alert.alert("Unable to save file", getErrorMessage(error));
    }
  };

  const removeBlock = async () => {
    if (!moduleItem) return;
    try {
      await modulesApi.detachItem(moduleItem.id);
      Alert.alert(
        "File block removed",
        "The file block was removed from this module.",
      );
      navigation.navigate("TeacherModuleDetail", { classId, moduleId });
    } catch (error) {
      Alert.alert("Unable to remove block", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title={fileRecord?.originalName || "Module file"}
      subtitle={
        fileRecord?.mimeType || "File detail and mobile download controls."
      }
      icon="file-pdf-box"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherPanel
        title="File details"
        subtitle="Rename, open, download, or remove this file block from its module."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField
            label="Display name"
            value={fileName}
            onChangeText={setFileName}
          />
          <TeacherRow
            title="Size"
            subtitle={
              fileRecord?.sizeBytes
                ? `${Math.round(fileRecord.sizeBytes / 1024)} KB`
                : "N/A"
            }
          />
          <TeacherRow title="Scope" subtitle={fileRecord?.scope || "private"} />
          <TeacherRow
            title="Visible in module"
            subtitle={moduleItem?.isVisible === false ? "Hidden" : "Visible"}
          />
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <TeacherActionButton
              label="Save name"
              icon="content-save-outline"
              tone="blue"
              onPress={() => void saveName()}
            />
            <TeacherActionButton
              label="Open"
              icon="open-in-new"
              tone="green"
              onPress={() =>
                void fileUploadApi.open(fileId, fileName || "module-file")
              }
            />
            <TeacherActionButton
              label="Download"
              icon="download-outline"
              tone="neutral"
              onPress={() =>
                void fileUploadApi.download(fileId, fileName || "module-file")
              }
            />
            <TeacherActionButton
              label="Remove block"
              icon="trash-can-outline"
              tone="red"
              disabled={!moduleItem}
              onPress={() => void removeBlock()}
            />
          </View>
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherLessonEditorScreen({
  navigation,
  route,
}: LessonEditorProps) {
  const { lessonId, classId } = route.params;
  const [lesson, setLesson] = useState<Awaited<
    ReturnType<typeof lessonsApi.getById>
  > | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newBlockType, setNewBlockType] = useState<
    "text" | "image" | "video" | "file"
  >("text");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await lessonsApi.getById(lessonId);
      setLesson(data);
      setTitle(data.title);
      setDescription(data.description || "");
    } catch (error) {
      Alert.alert("Unable to load lesson", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDetails = async () => {
    try {
      await lessonsApi.update(lessonId, {
        title: title.trim(),
        description: description.trim(),
      });
      await load();
    } catch (error) {
      Alert.alert("Unable to save lesson", getErrorMessage(error));
    }
  };

  const addTextBlock = async () => {
    if (!lesson || !newBlock.trim()) return;
    try {
      await lessonsApi.createBlock(lesson.id, {
        type: newBlockType,
        content: newBlock.trim(),
        order: (lesson.contentBlocks?.length ?? 0) + 1,
      });
      setNewBlock("");
      await load();
    } catch (error) {
      Alert.alert("Unable to add block", getErrorMessage(error));
    }
  };

  const saveBlockText = async (blockId: string, content: string) => {
    try {
      await lessonsApi.updateBlock(blockId, { content });
      await load();
    } catch (error) {
      Alert.alert("Unable to update block", getErrorMessage(error));
    }
  };

  const moveBlock = async (index: number, direction: "up" | "down") => {
    if (!lesson?.contentBlocks) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lesson.contentBlocks.length) return;
    const nextBlocks = [...lesson.contentBlocks];
    const [moved] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    try {
      await lessonsApi.reorderBlocks(lesson.id, {
        blocks: nextBlocks.map((b, i) => ({ id: b.id, order: i + 1 })),
      });
      await load();
    } catch (error) {
      Alert.alert("Unable to reorder blocks", getErrorMessage(error));
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      await lessonsApi.deleteBlock(blockId);
      await load();
    } catch (error) {
      Alert.alert("Unable to delete block", getErrorMessage(error));
    }
  };

  const togglePublish = async () => {
    if (!lesson) return;
    try {
      if (lesson.isDraft) {
        await lessonsApi.publish(lesson.id);
      } else {
        await lessonsApi.setDraftState(classId || lesson.classId, {
          lessonIds: [lesson.id],
          isDraft: true,
        });
      }
      await load();
    } catch (error) {
      Alert.alert("Unable to change lesson status", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title={lesson?.title || "Lesson editor"}
      subtitle="Mobile lesson editing for details, publish state, and block management."
      icon="notebook-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherPanel
        title="Lesson details"
        subtitle="Edit the same title and description fields used on the web editor."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField
            label="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TeacherInlineField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <TeacherActionButton
              label="Save details"
              icon="content-save-outline"
              tone="blue"
              onPress={() => void saveDetails()}
            />
            <TeacherActionButton
              label={lesson?.isDraft ? "Publish" : "Move to draft"}
              icon="publish"
              tone={lesson?.isDraft ? "green" : "amber"}
              disabled={!lesson}
              onPress={() => void togglePublish()}
            />
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel
        title="Add content block"
        subtitle="Select block type and enter text content."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            {(["text", "image", "video", "file"] as const).map((type) => (
              <TeacherChip
                key={type}
                label={type.toUpperCase()}
                active={newBlockType === type}
                onPress={() => setNewBlockType(type)}
              />
            ))}
          </View>
          <TeacherInlineField
            label={`${newBlockType.toUpperCase()} content`}
            value={newBlock}
            onChangeText={setNewBlock}
            multiline
          />
          <View style={{ marginTop: 12 }}>
            <TeacherActionButton
              label="Add block"
              icon="plus"
              tone="green"
              disabled={!newBlock.trim()}
              onPress={() => void addTextBlock()}
            />
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel
        title="Content blocks"
        subtitle="Review, reorder, edit text-like blocks, or remove blocks."
      >
        {lesson?.contentBlocks?.length ? (
          lesson.contentBlocks.map((block, index) => {
            const text = extractLessonBlockText(block);
            return (
              <View
                key={block.id}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: theme.red,
                      textTransform: "uppercase",
                    }}
                  >
                    {block.type} | Block {index + 1}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Pressable
                      onPress={() => void moveBlock(index, "up")}
                      disabled={index === 0}
                      style={{ padding: 4, opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <MaterialCommunityIcons
                        name="chevron-up"
                        size={18}
                        color={theme.text}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => void moveBlock(index, "down")}
                      disabled={
                        index === (lesson.contentBlocks?.length ?? 0) - 1
                      }
                      style={{
                        padding: 4,
                        opacity:
                          index === (lesson.contentBlocks?.length ?? 0) - 1
                            ? 0.3
                            : 1,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={18}
                        color={theme.text}
                      />
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  multiline
                  value={text}
                  onChangeText={(value) => {
                    setLesson((current) =>
                      current
                        ? {
                            ...current,
                            contentBlocks: current.contentBlocks?.map(
                              (entry) =>
                                entry.id === block.id
                                  ? { ...entry, content: value }
                                  : entry,
                            ),
                          }
                        : current,
                    );
                  }}
                  style={{
                    marginTop: 8,
                    minHeight: 72,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    textAlignVertical: "top",
                  }}
                />
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <TeacherActionButton
                    label="Save block"
                    tone="blue"
                    onPress={() =>
                      void saveBlockText(
                        block.id,
                        extractLessonBlockText(block),
                      )
                    }
                  />
                  <TeacherActionButton
                    label="Delete"
                    tone="red"
                    onPress={() => void deleteBlock(block.id)}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <TeacherEmpty
            title="No content blocks"
            subtitle="Add a content block to start mobile authoring."
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

type InterventionWorkspaceTab = "plan" | "generating" | "assign";

const DEFAULT_LESSON_XP = 20;
const DEFAULT_ASSESSMENT_XP = 30;
const INTERVENTION_POLL_MS = 2500;

function readJobId(job?: AiGenerationJob | null) {
  return job?.id || job?.jobId || "";
}

function isInterventionJobPending(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  return ["queued", "pending", "running", "processing"].includes(normalized);
}

function isInterventionJobComplete(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  return ["completed", "approved"].includes(normalized);
}

function isInterventionJobFailed(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  return ["failed", "cancelled", "rejected"].includes(normalized);
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function parseXp(value: string | number | undefined, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(500, parsed));
}

function formatScoreValue(value?: number | null) {
  return typeof value === "number"
    ? boundAcademicPercentage(value).toFixed(1)
    : "N/A";
}

function createManualInterventionJob(caseId: string): AiGenerationJob {
  return {
    id: `manual-${caseId}`,
    jobId: `manual-${caseId}`,
    status: "completed",
    message: "Teacher-curated intervention plan",
  };
}

function createEmptyInterventionOutput(
  caseId: string,
  note?: string,
): InterventionStructuredOutput {
  return {
    caseId,
    weakConcepts: [],
    recommendedLessons: [],
    recommendedAssessments: [],
    aiSummary: {
      summary: "Teacher-curated intervention path.",
      teacherActions: [],
      studentFocus: [],
    },
    suggestedAssignmentPayload: {
      lessonIds: [],
      assessmentIds: [],
      lessonAssignments: [],
      assessmentAssignments: [],
      note,
    },
    generatedLessonDraft: null,
    generatedGuidedAssessmentDraft: null,
    note,
  };
}

function normalizeInterventionOutput(
  output: InterventionStructuredOutput | null | undefined,
  caseId: string,
): InterventionStructuredOutput {
  const base = output ?? createEmptyInterventionOutput(caseId);
  const recommendedLessons = asArray(base.recommendedLessons)
    .filter((lesson) => Boolean(lesson?.lessonId))
    .map((lesson) => ({
      ...lesson,
      title: lesson.title || "Recommended lesson",
      reason: lesson.reason || "Recommended by intervention evidence.",
    }));
  const recommendedAssessments = asArray(base.recommendedAssessments)
    .filter((assessment) => Boolean(assessment?.assessmentId))
    .map((assessment) => ({
      ...assessment,
      title: assessment.title || "Recommended assessment",
      reason: assessment.reason || "Recommended by intervention evidence.",
    }));

  return {
    ...base,
    caseId: base.caseId || caseId,
    weakConcepts: asArray(base.weakConcepts),
    recommendedLessons,
    recommendedAssessments,
    aiSummary: {
      summary:
        base.aiSummary?.summary ||
        "AI intervention plan is ready for teacher review.",
      teacherActions: asArray(base.aiSummary?.teacherActions),
      studentFocus: asArray(base.aiSummary?.studentFocus),
    },
    suggestedAssignmentPayload: {
      lessonIds: asArray(base.suggestedAssignmentPayload?.lessonIds),
      assessmentIds: asArray(base.suggestedAssignmentPayload?.assessmentIds),
      lessonAssignments: asArray(
        base.suggestedAssignmentPayload?.lessonAssignments,
      ),
      assessmentAssignments: asArray(
        base.suggestedAssignmentPayload?.assessmentAssignments,
      ),
      note: base.suggestedAssignmentPayload?.note,
    },
    generatedLessonDraft: base.generatedLessonDraft ?? null,
    generatedGuidedAssessmentDraft: base.generatedGuidedAssessmentDraft ?? null,
  };
}

function getCaseRecord(
  detail: TeacherInterventionCaseDetail | null,
): TeacherInterventionCase | null {
  if (!detail) return null;
  if (detail.case) return detail.case;

  return {
    id: detail.id,
    caseId: detail.id,
    classId: detail.classId || detail.class?.id,
    studentId: detail.studentId || detail.student?.id,
    student: detail.student,
    status: detail.status,
    triggerScore: detail.triggerScore,
    thresholdApplied: detail.thresholdApplied,
    openedAt: detail.openedAt,
    closedAt: detail.closedAt,
    totalCheckpoints:
      detail.completion?.totalCheckpoints ?? detail.progress?.totalCheckpoints,
    completedCheckpoints:
      detail.completion?.completedCheckpoints ??
      detail.progress?.completedCheckpoints ??
      detail.progress?.checkpointsCompleted,
    completionPercent:
      detail.completion?.completionPercent ??
      detail.progress?.completionPercent,
  };
}

function getCompletion(
  detail: TeacherInterventionCaseDetail | null,
  caseRecord: TeacherInterventionCase | null,
) {
  return {
    total:
      detail?.completion?.totalCheckpoints ??
      detail?.progress?.totalCheckpoints ??
      caseRecord?.totalCheckpoints ??
      caseRecord?.progress?.totalCheckpoints ??
      0,
    completed:
      detail?.completion?.completedCheckpoints ??
      detail?.progress?.completedCheckpoints ??
      detail?.progress?.checkpointsCompleted ??
      caseRecord?.completedCheckpoints ??
      caseRecord?.progress?.completedCheckpoints ??
      0,
    percent:
      detail?.completion?.completionPercent ??
      detail?.progress?.completionPercent ??
      caseRecord?.completionPercent ??
      caseRecord?.progress?.completionPercent ??
      0,
  };
}

function getGeneratedArtifactObject(
  detail: TeacherInterventionCaseDetail | null,
) {
  const artifacts = detail?.generatedArtifacts;
  if (!artifacts || Array.isArray(artifacts)) {
    return { generatedLesson: null, guidedAssessment: null };
  }
  return {
    generatedLesson: artifacts.generatedLesson ?? null,
    guidedAssessment: artifacts.guidedAssessment ?? null,
  };
}

function getFlatGeneratedArtifacts(
  detail: TeacherInterventionCaseDetail | null,
) {
  const artifacts = detail?.generatedArtifacts;
  if (Array.isArray(artifacts)) return artifacts;
  const generated = getGeneratedArtifactObject(detail);
  return [
    generated.generatedLesson
      ? {
          id: generated.generatedLesson.id,
          title: generated.generatedLesson.title,
          type: "Generated lesson",
          status: generated.generatedLesson.status,
        }
      : null,
    generated.guidedAssessment
      ? {
          id: generated.guidedAssessment.id,
          title: generated.guidedAssessment.title,
          type: "Guided assessment",
          status: generated.guidedAssessment.status,
        }
      : null,
  ].filter(Boolean) as Array<{
    id?: string;
    title?: string | null;
    type?: string;
    status?: string | null;
  }>;
}

function makeResultWithOutput(
  previous: AiGenerationJobResult<InterventionStructuredOutput> | null,
  job: AiGenerationJob | null,
  output: InterventionStructuredOutput,
): AiGenerationJobResult<InterventionStructuredOutput> {
  return {
    job: previous?.job ?? job ?? createManualInterventionJob(output.caseId),
    result: {
      outputId: previous?.result?.outputId,
      outputType: previous?.result?.outputType,
      structuredOutput: output,
    },
  };
}

export function TeacherInterventionWorkspaceContent({
  navigation,
  caseId,
  classId,
  embedded = false,
  onClose,
  onAssigned,
}: InterventionWorkspaceContentProps) {
  const [detail, setDetail] = useState<TeacherInterventionCaseDetail | null>(
    null,
  );
  const [queueEntry, setQueueEntry] = useState<TeacherInterventionCase | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [artifactActionLoading, setArtifactActionLoading] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [result, setResult] =
    useState<AiGenerationJobResult<InterventionStructuredOutput> | null>(null);
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<InterventionWorkspaceTab>("plan");
  const [statusWarning, setStatusWarning] = useState<string | null>(null);
  const [manualLessons, setManualLessons] = useState<Lesson[]>([]);
  const [manualAssessments, setManualAssessments] = useState<Assessment[]>([]);
  const [loadingManualSources, setLoadingManualSources] = useState(false);
  const [policy, setPolicy] = useState<ClassAiPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyCap, setPolicyCap] = useState("3");
  const [lessonXp, setLessonXp] = useState<Record<string, string>>({});
  const [assessmentXp, setAssessmentXp] = useState<Record<string, string>>({});
  const [approvedGeneratedContent, setApprovedGeneratedContent] =
    useState<GeneratedArtifactApprovalResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [nextDetail, nextQueueEntry] = await Promise.all([
        lxpApi.getTeacherCaseDetail(caseId),
        (async () => {
          if (classId) {
            const queue = await lxpApi.getTeacherQueue(classId);
            const fromQueue = queue.queue.find(
              (entry) => (entry.id || entry.caseId) === caseId,
            );
            if (fromQueue) return fromQueue;
          }
          return lxpApi.getTeacherCase(caseId);
        })(),
      ]);
      setDetail(nextDetail);
      setQueueEntry(nextQueueEntry);
      setNote((current) => current || nextDetail.note || "");
    } catch (error) {
      Alert.alert("Unable to load intervention", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [caseId, classId]);

  useEffect(() => {
    void load();
  }, [load]);

  const caseRecord = useMemo(
    () => queueEntry ?? getCaseRecord(detail),
    [detail, queueEntry],
  );
  const completion = useMemo(
    () => getCompletion(detail, caseRecord),
    [caseRecord, detail],
  );
  const activeClassId =
    classId ||
    caseRecord?.classId ||
    detail?.classId ||
    detail?.class?.id ||
    "";
  const status = String(
    caseRecord?.status || detail?.status || "pending",
  ).toLowerCase();
  const isCaseActive = status === "active";
  const hasCaseContext =
    Boolean(caseRecord) && caseRecord?.aiPlanEligible !== false;
  const hasExistingPath = completion.total > 0;
  const hasStartedPath = completion.completed > 0;
  const hasUnstartedExistingPath = hasExistingPath && !hasStartedPath;
  const generatedArtifactObject = useMemo(
    () => getGeneratedArtifactObject(detail),
    [detail],
  );
  const flatGeneratedArtifacts = useMemo(
    () => getFlatGeneratedArtifacts(detail),
    [detail],
  );

  const output = useMemo(
    () => normalizeInterventionOutput(result?.result?.structuredOutput, caseId),
    [caseId, result?.result?.structuredOutput],
  );

  const visibleLessons = output.recommendedLessons;
  const visibleAssessments = output.recommendedAssessments;
  const generatedLessonDraft = output.generatedLessonDraft;
  const generatedGuidedAssessmentDraft = output.generatedGuidedAssessmentDraft;
  const hasGeneratedDrafts = Boolean(
    generatedLessonDraft || generatedGuidedAssessmentDraft,
  );
  const generatedLessonApproved =
    !generatedLessonDraft ||
    Boolean(
      approvedGeneratedContent?.generatedLesson ||
      generatedArtifactObject.generatedLesson?.status === "approved",
    );
  const guidedAssessmentApproved =
    !generatedGuidedAssessmentDraft ||
    Boolean(
      approvedGeneratedContent?.guidedAssessment ||
      generatedArtifactObject.guidedAssessment?.status === "approved",
    );
  const hasAssignableItems =
    visibleLessons.length > 0 || visibleAssessments.length > 0;
  const needsGeneratedApproval =
    hasGeneratedDrafts &&
    !(generatedLessonApproved && guidedAssessmentApproved);
  const assignDisabled =
    assigning ||
    !hasCaseContext ||
    !isCaseActive ||
    hasStartedPath ||
    !hasAssignableItems ||
    needsGeneratedApproval;
  const assignButtonLabel = assigning
    ? "Assigning..."
    : hasStartedPath
      ? "Progress already started"
      : needsGeneratedApproval
        ? "Approve generated content first"
        : hasUnstartedExistingPath
          ? "Replace current path"
          : "Assign suggested path";

  const seedXpFromOutput = useCallback(
    (nextOutput: InterventionStructuredOutput) => {
      const lessonAssignments = asArray(
        nextOutput.suggestedAssignmentPayload.lessonAssignments,
      );
      const assessmentAssignments = asArray(
        nextOutput.suggestedAssignmentPayload.assessmentAssignments,
      );

      setLessonXp((current) => {
        const seeded = { ...current };
        nextOutput.recommendedLessons.forEach((lesson) => {
          const suggested = lessonAssignments.find(
            (assignment) => assignment.lessonId === lesson.lessonId,
          );
          seeded[lesson.lessonId] = String(
            suggested?.xpAwarded ??
              parseXp(seeded[lesson.lessonId], DEFAULT_LESSON_XP),
          );
        });
        return seeded;
      });

      setAssessmentXp((current) => {
        const seeded = { ...current };
        nextOutput.recommendedAssessments.forEach((assessment) => {
          const suggested = assessmentAssignments.find(
            (assignment) => assignment.assessmentId === assessment.assessmentId,
          );
          seeded[assessment.assessmentId] = String(
            suggested?.xpAwarded ??
              parseXp(seeded[assessment.assessmentId], DEFAULT_ASSESSMENT_XP),
          );
        });
        return seeded;
      });
    },
    [],
  );

  const loadInterventionJobResult = useCallback(
    async (jobId: string) => {
      if (!jobId) return;
      try {
        setLoadingResult(true);
        const nextResult = await aiApi.getInterventionJobResult(jobId);
        const normalizedOutput = normalizeInterventionOutput(
          nextResult.result?.structuredOutput,
          caseId,
        );
        setResult({
          ...nextResult,
          result: {
            ...nextResult.result,
            structuredOutput: normalizedOutput,
          },
        });
        seedXpFromOutput(normalizedOutput);
        setActiveTab("assign");
        setStatusWarning(null);
      } catch (error) {
        setStatusWarning(getErrorMessage(error));
      } finally {
        setLoadingResult(false);
      }
    },
    [caseId, seedXpFromOutput],
  );

  useEffect(() => {
    const jobId = readJobId(job);
    if (!jobId || !isInterventionJobPending(job?.status)) return undefined;

    const timer = setInterval(() => {
      void (async () => {
        try {
          const nextJob = await aiApi.getTeacherJobStatus(jobId);
          setJob(nextJob);
          if (isInterventionJobComplete(nextJob.status)) {
            await loadInterventionJobResult(readJobId(nextJob));
          }
          if (isInterventionJobFailed(nextJob.status)) {
            setStatusWarning(
              nextJob.errorMessage ||
                nextJob.message ||
                "AI intervention job did not finish.",
            );
          }
        } catch (error) {
          setStatusWarning(getErrorMessage(error));
        }
      })();
    }, INTERVENTION_POLL_MS);

    return () => clearInterval(timer);
  }, [job, loadInterventionJobResult]);

  const loadManualSources = useCallback(async () => {
    if (!activeClassId) return;
    try {
      setLoadingManualSources(true);
      const [lessons, assessments] = await Promise.all([
        lessonsApi.getByClass(activeClassId),
        assessmentsApi.getByClass(activeClassId),
      ]);
      setManualLessons(lessons.filter((lesson) => !lesson.isDraft));
      setManualAssessments(
        assessments.filter((assessment) => assessment.isPublished !== false),
      );
    } catch (error) {
      Alert.alert("Unable to load class sources", getErrorMessage(error));
    } finally {
      setLoadingManualSources(false);
    }
  }, [activeClassId]);

  const loadPolicy = useCallback(async () => {
    if (!activeClassId) return;
    try {
      setPolicyLoading(true);
      const nextPolicy = await aiApi.getTeacherClassPolicy(activeClassId);
      setPolicy(nextPolicy);
      setPolicyCap(String(nextPolicy.maxFollowUpTurns ?? 3));
    } catch (error) {
      setPolicy(null);
      setStatusWarning(getErrorMessage(error));
    } finally {
      setPolicyLoading(false);
    }
  }, [activeClassId]);

  useEffect(() => {
    void loadManualSources();
    void loadPolicy();
  }, [loadManualSources, loadPolicy]);

  const updatePolicy = async (patch: UpdateClassAiPolicyDto) => {
    if (!activeClassId) return;
    try {
      setPolicySaving(true);
      const nextPolicy = await aiApi.updateTeacherClassPolicy(
        activeClassId,
        patch,
      );
      setPolicy(nextPolicy);
      setPolicyCap(String(nextPolicy.maxFollowUpTurns ?? 3));
    } catch (error) {
      Alert.alert("Unable to update AI policy", getErrorMessage(error));
    } finally {
      setPolicySaving(false);
    }
  };

  const runGenerate = async () => {
    if (!hasCaseContext) {
      Alert.alert(
        "AI plan unavailable",
        "This intervention case is not eligible for AI planning yet.",
      );
      return;
    }

    try {
      setCreatingJob(true);
      setStatusWarning(null);
      setApprovedGeneratedContent(null);
      const createdJob = await aiApi.createInterventionJob(caseId, {
        note: note.trim() || undefined,
      });
      setJob(createdJob);
      setResult(null);
      setActiveTab("generating");
      if (isInterventionJobComplete(createdJob.status)) {
        await loadInterventionJobResult(readJobId(createdJob));
      }
      if (isInterventionJobFailed(createdJob.status)) {
        setStatusWarning(
          createdJob.errorMessage ||
            createdJob.message ||
            "AI intervention job failed.",
        );
      }
    } catch (error) {
      Alert.alert("Unable to generate AI plan", getErrorMessage(error));
    } finally {
      setCreatingJob(false);
    }
  };

  const handleGenerate = () => {
    if (hasUnstartedExistingPath) {
      Alert.alert(
        "Replace current path?",
        "This case already has an unstarted intervention path. Generating a new AI plan may replace the teacher review flow before assignment.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Generate",
            style: "destructive",
            onPress: () => void runGenerate(),
          },
        ],
      );
      return;
    }
    void runGenerate();
  };

  const runAction = async (action: "activate" | "regenerate") => {
    try {
      if (action === "activate") await lxpApi.activateIntervention(caseId);
      if (action === "regenerate")
        await lxpApi.regenerateInterventionPath(caseId);
      await load();
    } catch (error) {
      Alert.alert("Unable to update intervention", getErrorMessage(error));
    }
  };

  const setOutput = (nextOutput: InterventionStructuredOutput) => {
    const normalized = normalizeInterventionOutput(nextOutput, caseId);
    setResult((current) => makeResultWithOutput(current, job, normalized));
    seedXpFromOutput(normalized);
    setActiveTab("assign");
  };

  const handleAddManualLesson = (lesson: Lesson) => {
    if (visibleLessons.some((entry) => entry.lessonId === lesson.id)) {
      Alert.alert(
        "Already added",
        "This lesson is already in the intervention plan.",
      );
      return;
    }
    const nextOutput = normalizeInterventionOutput(output, caseId);
    nextOutput.recommendedLessons = [
      ...nextOutput.recommendedLessons,
      {
        lessonId: lesson.id,
        title: lesson.title,
        reason: "Teacher added manually from the class lesson library.",
        chunkId: null,
      },
    ];
    nextOutput.suggestedAssignmentPayload.lessonIds =
      nextOutput.recommendedLessons.map((entry) => entry.lessonId);
    nextOutput.suggestedAssignmentPayload.lessonAssignments =
      nextOutput.recommendedLessons.map((entry) => ({
        lessonId: entry.lessonId,
        label: entry.title,
        xpAwarded: parseXp(lessonXp[entry.lessonId], DEFAULT_LESSON_XP),
      }));
    setLessonXp((current) => ({
      ...current,
      [lesson.id]: String(DEFAULT_LESSON_XP),
    }));
    setOutput(nextOutput);
  };

  const handleAddManualAssessment = (assessment: Assessment) => {
    if (
      visibleAssessments.some((entry) => entry.assessmentId === assessment.id)
    ) {
      Alert.alert(
        "Already added",
        "This assessment is already in the intervention plan.",
      );
      return;
    }
    const nextOutput = normalizeInterventionOutput(output, caseId);
    nextOutput.recommendedAssessments = [
      ...nextOutput.recommendedAssessments,
      {
        assessmentId: assessment.id,
        title: assessment.title,
        reason: "Teacher added manually from published class assessments.",
      },
    ];
    nextOutput.suggestedAssignmentPayload.assessmentIds =
      nextOutput.recommendedAssessments.map((entry) => entry.assessmentId);
    nextOutput.suggestedAssignmentPayload.assessmentAssignments =
      nextOutput.recommendedAssessments.map((entry) => ({
        assessmentId: entry.assessmentId,
        label: entry.title,
        xpAwarded: parseXp(
          assessmentXp[entry.assessmentId],
          DEFAULT_ASSESSMENT_XP,
        ),
      }));
    setAssessmentXp((current) => ({
      ...current,
      [assessment.id]: String(DEFAULT_ASSESSMENT_XP),
    }));
    setOutput(nextOutput);
  };

  const handleRemoveLesson = (lessonId: string) => {
    const nextOutput = normalizeInterventionOutput(output, caseId);
    nextOutput.recommendedLessons = nextOutput.recommendedLessons.filter(
      (lesson) => lesson.lessonId !== lessonId,
    );
    nextOutput.suggestedAssignmentPayload.lessonIds =
      nextOutput.recommendedLessons.map((lesson) => lesson.lessonId);
    nextOutput.suggestedAssignmentPayload.lessonAssignments =
      nextOutput.recommendedLessons.map((lesson) => ({
        lessonId: lesson.lessonId,
        label: lesson.title,
        xpAwarded: parseXp(lessonXp[lesson.lessonId], DEFAULT_LESSON_XP),
      }));
    setOutput(nextOutput);
  };

  const handleRemoveAssessment = (assessmentId: string) => {
    const nextOutput = normalizeInterventionOutput(output, caseId);
    nextOutput.recommendedAssessments =
      nextOutput.recommendedAssessments.filter(
        (assessment) => assessment.assessmentId !== assessmentId,
      );
    nextOutput.suggestedAssignmentPayload.assessmentIds =
      nextOutput.recommendedAssessments.map(
        (assessment) => assessment.assessmentId,
      );
    nextOutput.suggestedAssignmentPayload.assessmentAssignments =
      nextOutput.recommendedAssessments.map((assessment) => ({
        assessmentId: assessment.assessmentId,
        label: assessment.title,
        xpAwarded: parseXp(
          assessmentXp[assessment.assessmentId],
          DEFAULT_ASSESSMENT_XP,
        ),
      }));
    setOutput(nextOutput);
  };

  const handleApproveGeneratedContent = async () => {
    if (!generatedLessonDraft && !generatedGuidedAssessmentDraft) {
      Alert.alert(
        "No generated content",
        "There is no generated lesson or guided assessment draft to approve.",
      );
      return;
    }
    try {
      setArtifactActionLoading(true);
      const response = await lxpApi.approveGeneratedArtifacts(caseId, {
        generatedLessonDraft: generatedLessonDraft
          ? {
              title: generatedLessonDraft.title,
              summary: generatedLessonDraft.summary,
              lessonBody: generatedLessonDraft.lessonBody,
              weakConcepts: generatedLessonDraft.weakConcepts,
              sourceLessonIds: generatedLessonDraft.sourceLessonIds,
              sourceReferences: generatedLessonDraft.sourceReferences,
            }
          : null,
        generatedGuidedAssessmentDraft: generatedGuidedAssessmentDraft
          ? {
              sourceAssessmentId:
                generatedGuidedAssessmentDraft.sourceAssessmentId,
              title: generatedGuidedAssessmentDraft.title,
              description: generatedGuidedAssessmentDraft.description,
              weakConcepts: generatedGuidedAssessmentDraft.weakConcepts,
              formativeSummary: generatedGuidedAssessmentDraft.formativeSummary,
              sourceReferences: generatedGuidedAssessmentDraft.sourceReferences,
              questions: generatedGuidedAssessmentDraft.questions.map(
                (question) => ({
                  id: question.id,
                  type: question.type,
                  stem: question.stem,
                  explanation: question.explanation,
                  hint: question.hint,
                  reviewHint: question.reviewHint,
                  weakConceptTag: question.weakConceptTag,
                  sourceQuestionId: question.sourceQuestionId,
                  options: question.options,
                }),
              ),
            }
          : null,
      });
      setApprovedGeneratedContent(response);
      await load();
      Alert.alert(
        "Generated content approved",
        "The generated remedial content is ready for assignment.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to approve generated content",
        getErrorMessage(error),
      );
    } finally {
      setArtifactActionLoading(false);
    }
  };

  const handleRejectGeneratedContent = async () => {
    try {
      setArtifactActionLoading(true);
      await lxpApi.rejectGeneratedArtifacts(caseId, {
        generatedLessonDraft: generatedLessonDraft ?? null,
        generatedGuidedAssessmentDraft: generatedGuidedAssessmentDraft
          ? {
              ...generatedGuidedAssessmentDraft,
              questions: generatedGuidedAssessmentDraft.questions.map(
                (question) => ({
                  ...question,
                  options: question.options,
                }),
              ),
            }
          : null,
      });
      setApprovedGeneratedContent(null);
      const nextOutput = normalizeInterventionOutput(output, caseId);
      nextOutput.generatedLessonDraft = null;
      nextOutput.generatedGuidedAssessmentDraft = null;
      setOutput(nextOutput);
      await load();
      Alert.alert(
        "Generated content rejected",
        "The generated draft was removed from the assignment workflow.",
      );
    } catch (error) {
      Alert.alert("Unable to reject generated content", getErrorMessage(error));
    } finally {
      setArtifactActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!isCaseActive) {
      Alert.alert(
        "Activate first",
        "This intervention must be active before assigning a path.",
      );
      return;
    }
    if (hasStartedPath) {
      Alert.alert(
        "Path already started",
        "A student has already started this path, so it cannot be replaced from mobile.",
      );
      return;
    }
    if (!hasAssignableItems) {
      Alert.alert(
        "Nothing to assign",
        "Add at least one lesson, assessment, or approved generated artifact first.",
      );
      return;
    }
    if (needsGeneratedApproval) {
      Alert.alert(
        "Review generated content",
        "Approve or reject generated remedial drafts before assigning this intervention.",
      );
      return;
    }

    const teacherNote = note.trim();
    const aiSuggestedNote = output.suggestedAssignmentPayload.note?.trim();
    const assignmentNote =
      aiSuggestedNote && teacherNote && !aiSuggestedNote.includes(teacherNote)
        ? `${teacherNote}\n${aiSuggestedNote}`
        : aiSuggestedNote || teacherNote || undefined;

    try {
      setAssigning(true);
      await lxpApi.assignIntervention(caseId, {
        note: assignmentNote,
        lessonAssignments: visibleLessons.map((lesson) => ({
          lessonId: lesson.lessonId,
          label: `AI plan: ${lesson.title}`,
          xpAwarded: parseXp(lessonXp[lesson.lessonId], DEFAULT_LESSON_XP),
        })),
        assessmentAssignments:
          visibleAssessments.length > 0
            ? [
                {
                  assessmentId: visibleAssessments[0].assessmentId,
                  label: "AI plan: Replay Assessments",
                  xpAwarded: parseXp(
                    assessmentXp[visibleAssessments[0].assessmentId],
                    DEFAULT_ASSESSMENT_XP,
                  ),
                },
              ]
            : [],
      });
      await load();
      Alert.alert(
        "Intervention assigned",
        "The student can now see the intervention path in Learner's Path.",
      );
      if (onAssigned) {
        onAssigned(activeClassId);
      } else if (activeClassId) {
        navigation.navigate("TeacherInterventions", { classId: activeClassId });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Unable to assign intervention", getErrorMessage(error));
    } finally {
      setAssigning(false);
    }
  };

  const studentName = detail?.student
    ? formatName(detail.student)
    : formatName(caseRecord?.student ?? undefined);
  const sourceSubtitle =
    detail?.class?.subjectName ||
    caseRecord?.className ||
    "AI-assisted intervention workspace.";
  const jobStatus = job?.status || (result?.job ? result.job.status : "None");
  const manualLessonPool = manualLessons.filter(
    (lesson) => !visibleLessons.some((entry) => entry.lessonId === lesson.id),
  );
  const manualAssessmentPool = manualAssessments.filter(
    (assessment) =>
      !visibleAssessments.some((entry) => entry.assessmentId === assessment.id),
  );

  const workspaceContent = (
    <>
      <TeacherStats
        items={[
          {
            label: "Trigger",
            value: formatScoreValue(
              caseRecord?.triggerScore ?? detail?.triggerScore,
            ),
            tone: "red",
          },
          {
            label: "Threshold",
            value: formatScoreValue(
              caseRecord?.thresholdApplied ?? detail?.thresholdApplied,
            ),
            tone: "amber",
          },
          {
            label: "Progress",
            value: `${Math.round(completion.percent)}%`,
            tone: "green",
          },
          {
            label: "AI Job",
            value: jobStatus,
            tone: isInterventionJobFailed(jobStatus) ? "red" : "purple",
          },
        ]}
      />

      <TeacherPanel
        title="Workspace"
        subtitle="Plan with AI, review the generated path, then assign it when ready."
      >
        <View
          style={{
            paddingHorizontal: 14,
            paddingBottom: 14,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {(["plan", "generating", "assign"] as InterventionWorkspaceTab[]).map(
            (tab) => (
              <TeacherChip
                key={tab}
                label={
                  tab === "plan"
                    ? "Plan creator"
                    : tab === "generating"
                      ? "Generating"
                      : "Clean out & assign"
                }
                active={activeTab === tab}
                onPress={() => setActiveTab(tab)}
              />
            ),
          )}
        </View>
      </TeacherPanel>

      {statusWarning ? (
        <TeacherPanel title="Needs attention" subtitle={statusWarning}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherActionButton
              label="Retry result load"
              icon="refresh"
              tone="amber"
              disabled={!readJobId(job)}
              onPress={() => void loadInterventionJobResult(readJobId(job))}
            />
          </View>
        </TeacherPanel>
      ) : null}

      {activeTab === "plan" ? (
        <>
          <TeacherPanel
            title="Plan creator"
            subtitle="Generate a web-parity AI intervention plan, activate the case, or jump back into the class."
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <TeacherInlineField
                label="Teacher note for AI"
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Example: Focus on factoring errors and short guided practice."
              />
              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <TeacherActionButton
                  label={
                    creatingJob
                      ? "Generating..."
                      : hasExistingPath
                        ? "Regenerate AI plan"
                        : "Generate AI plan"
                  }
                  icon="robot-outline"
                  tone="green"
                  disabled={creatingJob || !hasCaseContext}
                  onPress={handleGenerate}
                />
                <TeacherActionButton
                  label="Activate"
                  icon="play-circle-outline"
                  tone="blue"
                  disabled={isCaseActive}
                  onPress={() => void runAction("activate")}
                />
                <TeacherActionButton
                  label="Refresh"
                  icon="refresh"
                  tone="neutral"
                  onPress={() => void load()}
                />
                <TeacherActionButton
                  label="Open class"
                  icon="google-classroom"
                  tone="purple"
                  disabled={!activeClassId}
                  onPress={() =>
                    navigation.navigate("TeacherClassDetail", {
                      classId: activeClassId,
                      initialTab: "students",
                    })
                  }
                />
              </View>
            </View>
          </TeacherPanel>

          <TeacherPanel
            title="Class AI policy"
            subtitle={
              policyLoading
                ? "Loading class guardrails."
                : "Matches the web controls for AI mentor and source behavior."
            }
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <TeacherChip
                  label={
                    policy?.mentorExplainEnabled
                      ? "Mentor replies on"
                      : "Mentor replies off"
                  }
                  active={Boolean(policy?.mentorExplainEnabled)}
                  onPress={() =>
                    void updatePolicy({
                      mentorExplainEnabled: !policy?.mentorExplainEnabled,
                    })
                  }
                />
                <TeacherChip
                  label={
                    policy?.strictGrounding
                      ? "Strict grounding"
                      : "Flexible grounding"
                  }
                  active={Boolean(policy?.strictGrounding)}
                  onPress={() =>
                    void updatePolicy({
                      strictGrounding: !policy?.strictGrounding,
                    })
                  }
                />
                <TeacherChip
                  label="Recommended only"
                  active={policy?.sourceScope === "recommended_only"}
                  onPress={() =>
                    void updatePolicy({ sourceScope: "recommended_only" })
                  }
                />
                <TeacherChip
                  label="Class materials"
                  active={policy?.sourceScope === "class_materials"}
                  onPress={() =>
                    void updatePolicy({ sourceScope: "class_materials" })
                  }
                />
              </View>
              <TeacherInlineField
                label="Max follow-up turns"
                value={policyCap}
                onChangeText={setPolicyCap}
              />
              <View style={{ marginTop: 12 }}>
                <TeacherActionButton
                  label={policySaving ? "Saving policy..." : "Save policy"}
                  icon="content-save-outline"
                  tone="blue"
                  disabled={policySaving || !activeClassId}
                  onPress={() =>
                    void updatePolicy({
                      maxFollowUpTurns: parseXp(
                        policyCap,
                        policy?.maxFollowUpTurns ?? 3,
                      ),
                    })
                  }
                />
              </View>
            </View>
          </TeacherPanel>

          <TeacherPanel
            title="Intervention basis"
            subtitle="Signals copied from the web review area so the teacher knows why this plan exists."
          >
            <TeacherRow
              title="Current standing"
              subtitle={`${formatScoreValue(detail?.latestSnapshot?.blendedScore)} vs threshold ${formatScoreValue(detail?.latestSnapshot?.thresholdApplied ?? caseRecord?.thresholdApplied)}`}
            />
            <TeacherRow
              title="Completion"
              subtitle={`${completion.completed}/${completion.total} checkpoints completed`}
            />
            {detail?.weakConcepts?.length ? (
              detail.weakConcepts
                .slice(0, 5)
                .map((concept, index) => (
                  <TeacherRow
                    key={`${concept.concept}-${index}`}
                    title={concept.concept || "Weak concept"}
                    subtitle={`Mastery ${formatScoreValue(concept.masteryScore)} | Errors ${concept.errorCount ?? 0}`}
                  />
                ))
            ) : (
              <TeacherEmpty
                title="No weak concepts yet"
                subtitle="AI output will list weak concepts after generation."
                icon="lightbulb-alert-outline"
              />
            )}
          </TeacherPanel>

          <TeacherPanel
            title="Add manual sources"
            subtitle={
              loadingManualSources
                ? "Loading class lessons and assessments."
                : "Add existing published class work to the intervention path."
            }
          >
            {manualLessonPool.slice(0, 5).map((lesson) => (
              <TeacherRow
                key={lesson.id}
                title={lesson.title}
                subtitle={stripRichText(
                  lesson.description || "Published lesson",
                )}
                onPress={() => handleAddManualLesson(lesson)}
              />
            ))}
            {manualAssessmentPool.slice(0, 5).map((assessment) => (
              <TeacherRow
                key={assessment.id}
                title={assessment.title}
                subtitle={`${assessment.type} | ${assessment.totalPoints ?? 0} pts`}
                onPress={() => handleAddManualAssessment(assessment)}
              />
            ))}
            {!manualLessonPool.length && !manualAssessmentPool.length ? (
              <TeacherEmpty
                title="No manual sources available"
                subtitle="Published class lessons and assessments that are not already selected will appear here."
                icon="playlist-plus"
              />
            ) : null}
          </TeacherPanel>
        </>
      ) : null}

      {activeTab === "generating" ? (
        <TeacherPanel
          title="AI generation"
          subtitle={
            job?.message ||
            job?.errorMessage ||
            "Generate a plan, then this panel will update live while the job runs."
          }
        >
          <TeacherRow
            title="Status"
            subtitle={job?.status || "No active AI job"}
          />
          <TeacherRow
            title="Progress"
            subtitle={`${job?.progressPercent ?? (isInterventionJobComplete(job?.status) ? 100 : 0)}%`}
          />
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 14,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <TeacherActionButton
              label="Generate plan"
              icon="robot-outline"
              tone="green"
              disabled={creatingJob}
              onPress={handleGenerate}
            />
            <TeacherActionButton
              label={loadingResult ? "Loading result..." : "Load result"}
              icon="file-search-outline"
              tone="blue"
              disabled={!readJobId(job)}
              onPress={() => void loadInterventionJobResult(readJobId(job))}
            />
            <TeacherActionButton
              label="Review plan"
              icon="clipboard-check-outline"
              tone="purple"
              disabled={!result?.result?.structuredOutput}
              onPress={() => setActiveTab("assign")}
            />
          </View>
        </TeacherPanel>
      ) : null}

      {activeTab === "assign" ? (
        <>
          <TeacherPanel title="AI summary" subtitle={output.aiSummary.summary}>
            {output.weakConcepts.length ? (
              output.weakConcepts.map((concept, index) => (
                <TeacherRow
                  key={`${concept}-${index}`}
                  title={concept}
                  subtitle="AI detected weak concept"
                />
              ))
            ) : (
              <TeacherEmpty
                title="No AI weak concepts"
                subtitle="Generate a plan or add class sources manually."
                icon="brain"
              />
            )}
            {output.aiSummary.teacherActions.map((action, index) => (
              <TeacherRow
                key={`teacher-action-${index}`}
                title={`Teacher action ${index + 1}`}
                subtitle={action}
              />
            ))}
          </TeacherPanel>

          <TeacherPanel
            title="Generated remedial content"
            subtitle="Approve generated lesson or guided assessment drafts before assignment, just like the web page."
          >
            {generatedLessonDraft ? (
              <TeacherRow
                title={generatedLessonDraft.title}
                subtitle={stripRichText(
                  generatedLessonDraft.summary ||
                    generatedLessonDraft.lessonBody,
                ).slice(0, 180)}
              />
            ) : null}
            {generatedGuidedAssessmentDraft ? (
              <>
                <TeacherRow
                  title={generatedGuidedAssessmentDraft.title}
                  subtitle={`${generatedGuidedAssessmentDraft.questions.length} guided questions`}
                />
                {generatedGuidedAssessmentDraft.questions
                  .slice(0, 3)
                  .map((question, index) => (
                    <TeacherRow
                      key={question.id || `${index}`}
                      title={`Question ${index + 1}`}
                      subtitle={stripRichText(question.stem)}
                    />
                  ))}
              </>
            ) : null}
            {!hasGeneratedDrafts && flatGeneratedArtifacts.length
              ? flatGeneratedArtifacts.map((artifact, index) => (
                  <TeacherRow
                    key={artifact.id || `${index}`}
                    title={
                      artifact.title || artifact.type || "Generated artifact"
                    }
                    subtitle={artifact.status || "pending"}
                  />
                ))
              : null}
            {!hasGeneratedDrafts && !flatGeneratedArtifacts.length ? (
              <TeacherEmpty
                title="No generated artifacts"
                subtitle="AI-generated remedial content will appear after a successful plan generation."
                icon="file-star-outline"
              />
            ) : null}
            {hasGeneratedDrafts ? (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingBottom: 14,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <TeacherActionButton
                  label="Approve generated"
                  icon="check-decagram-outline"
                  tone="green"
                  disabled={artifactActionLoading}
                  onPress={() => void handleApproveGeneratedContent()}
                />
                <TeacherActionButton
                  label="Reject generated"
                  icon="close-octagon-outline"
                  tone="red"
                  disabled={artifactActionLoading}
                  onPress={() => void handleRejectGeneratedContent()}
                />
              </View>
            ) : null}
          </TeacherPanel>

          <TeacherPanel
            title="Recommended lessons"
            subtitle="Adjust XP, open the lesson, or remove it before assigning."
          >
            {visibleLessons.length ? (
              visibleLessons.map((lesson) => (
                <View
                  key={lesson.lessonId}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: theme.text,
                    }}
                  >
                    {lesson.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      lineHeight: 17,
                      color: theme.subtext,
                    }}
                  >
                    {lesson.reason}
                  </Text>
                  <TeacherInlineField
                    label="XP awarded"
                    value={
                      lessonXp[lesson.lessonId] ?? String(DEFAULT_LESSON_XP)
                    }
                    onChangeText={(value) =>
                      setLessonXp((current) => ({
                        ...current,
                        [lesson.lessonId]: value,
                      }))
                    }
                  />
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <TeacherActionButton
                      label="Open lesson"
                      icon="book-open-page-variant-outline"
                      tone="blue"
                      onPress={() =>
                        navigation.navigate("TeacherLessonEditor", {
                          lessonId: lesson.lessonId,
                          classId: activeClassId,
                        })
                      }
                    />
                    <TeacherActionButton
                      label="Remove"
                      icon="trash-can-outline"
                      tone="red"
                      onPress={() => handleRemoveLesson(lesson.lessonId)}
                    />
                  </View>
                </View>
              ))
            ) : (
              <TeacherEmpty
                title="No lessons selected"
                subtitle="Generate an AI plan or add manual class lessons."
                icon="book-plus-outline"
              />
            )}
          </TeacherPanel>

          <TeacherPanel
            title="Recommended assessments"
            subtitle="Adjust XP, open the assessment, or remove it before assigning."
          >
            {visibleAssessments.length ? (
              visibleAssessments.map((assessment) => (
                <View
                  key={assessment.assessmentId}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: theme.text,
                    }}
                  >
                    {assessment.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      lineHeight: 17,
                      color: theme.subtext,
                    }}
                  >
                    {assessment.reason}
                  </Text>
                  <TeacherInlineField
                    label="XP awarded"
                    value={
                      assessmentXp[assessment.assessmentId] ??
                      String(DEFAULT_ASSESSMENT_XP)
                    }
                    onChangeText={(value) =>
                      setAssessmentXp((current) => ({
                        ...current,
                        [assessment.assessmentId]: value,
                      }))
                    }
                  />
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <TeacherActionButton
                      label="Open assessment"
                      icon="clipboard-edit-outline"
                      tone="blue"
                      onPress={() =>
                        navigation.navigate("TeacherAssessmentEditor", {
                          assessmentId: assessment.assessmentId,
                          classId: activeClassId,
                        })
                      }
                    />
                    <TeacherActionButton
                      label="Remove"
                      icon="trash-can-outline"
                      tone="red"
                      onPress={() =>
                        handleRemoveAssessment(assessment.assessmentId)
                      }
                    />
                  </View>
                </View>
              ))
            ) : (
              <TeacherEmpty
                title="No assessments selected"
                subtitle="Generate an AI plan or add manual published assessments."
                icon="clipboard-plus-outline"
              />
            )}
          </TeacherPanel>

          <TeacherPanel
            title="Assign intervention"
            subtitle={
              needsGeneratedApproval
                ? "Approve or reject generated drafts first."
                : hasStartedPath
                  ? "This path has student progress and cannot be replaced."
                  : "Assign the selected plan to the learner path."
            }
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingBottom: 14,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <TeacherActionButton
                label={assignButtonLabel}
                icon="send-check-outline"
                tone="green"
                disabled={assignDisabled}
                onPress={() => void handleAssign()}
              />
              <TeacherActionButton
                label="Back to planning"
                icon="arrow-left"
                tone="neutral"
                onPress={() => setActiveTab("plan")}
              />
            </View>
          </TeacherPanel>

          <TeacherPanel
            title="Currently assigned path"
            subtitle="Existing student-facing checkpoints for this intervention case."
          >
            {detail?.assignments?.length ? (
              detail.assignments.map((assignment, index) => {
                const generated =
                  assignment.generatedLesson ||
                  (assignment.guidedAssessment as
                    GuidedAssessmentContent | null | undefined);
                return (
                  <TeacherRow
                    key={assignment.assignmentId || assignment.id || `${index}`}
                    title={
                      assignment.label ||
                      assignment.lesson?.title ||
                      assignment.assessment?.title ||
                      generated?.title ||
                      "Intervention checkpoint"
                    }
                    subtitle={`${assignment.type || "checkpoint"} | ${assignment.status || "pending"} | XP ${assignment.xpAwarded ?? 0}`}
                  />
                );
              })
            ) : (
              <TeacherEmpty
                title="No assigned path yet"
                subtitle="Assign a reviewed AI or manual intervention path to publish it to the student."
                icon="playlist-plus"
              />
            )}
          </TeacherPanel>
        </>
      ) : null}
    </>
  );

  if (embedded) {
    return <View style={{ paddingBottom: 14 }}>{workspaceContent}</View>;
  }

  return (
    <TeacherScreen
      title={studentName || "Intervention detail"}
      subtitle={`${stringifyStatus(status)} | ${sourceSubtitle}`}
      icon="account-alert-outline"
      showBackButton
      onBackPress={onClose ?? (() => navigation.goBack())}
      refreshing={loading || creatingJob || assigning || loadingResult}
      onRefresh={() => void load()}
    >
      {workspaceContent}
    </TeacherScreen>
  );
}

export function TeacherInterventionDetailScreen({
  navigation,
  route,
}: InterventionDetailProps) {
  return (
    <TeacherInterventionWorkspaceContent
      navigation={navigation}
      caseId={route.params.caseId}
      classId={route.params.classId}
    />
  );
}
