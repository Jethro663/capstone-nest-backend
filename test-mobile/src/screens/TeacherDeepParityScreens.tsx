import { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { extractionsApi } from "../api/services/extractions";
import { fileUploadApi } from "../api/services/file-upload";
import { modulesApi } from "../api/services/modules";
import { lessonsApi } from "../api/services/lessons";
import { aiApi } from "../api/services/ai";
import { lxpApi } from "../api/services/lxp";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type { StudentMasterlistItem, TeacherClassStudentOverview } from "../types/class";
import type { Extraction, ExtractionSection } from "../types/extraction";
import type { ModuleItem } from "../types/module";
import { extractLessonBlockText } from "../utils/lessonBlocks";
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

type AssessmentAttemptProps = NativeStackScreenProps<RootStackParamList, "TeacherAssessmentAttemptResult">;
type ClassAddStudentsProps = NativeStackScreenProps<RootStackParamList, "TeacherClassAddStudents">;
type ClassStudentOverviewProps = NativeStackScreenProps<RootStackParamList, "TeacherClassStudentOverview">;
type SectionAddStudentsProps = NativeStackScreenProps<RootStackParamList, "TeacherSectionAddStudents">;
type SectionStudentProfileProps = NativeStackScreenProps<RootStackParamList, "TeacherSectionStudentProfile">;
type ExtractionDetailProps = NativeStackScreenProps<RootStackParamList, "TeacherExtractionDetail">;
type ModuleFileDetailProps = NativeStackScreenProps<RootStackParamList, "TeacherModuleFileDetail">;
type LessonEditorProps = NativeStackScreenProps<RootStackParamList, "TeacherLessonEditor">;
type AiDraftProps = NativeStackScreenProps<RootStackParamList, "TeacherAiDraft">;
type InterventionDetailProps = NativeStackScreenProps<RootStackParamList, "TeacherInterventionDetail">;

function formatName(value?: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  return [value?.firstName, value?.lastName].filter(Boolean).join(" ").trim() || value?.email || "Student";
}

function toPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

function stringifyStatus(value?: string | null) {
  return (value || "pending").replace(/_/g, " ");
}

function getErrorMessage(error: unknown) {
  return toAppError(error).message;
}

export function TeacherAssessmentAttemptResultScreen(props: AssessmentAttemptProps) {
  return (
    <TeacherAssessmentReviewScreen
      navigation={props.navigation as never}
      route={{
        key: props.route.key,
        name: "TeacherAssessmentReview",
        params: props.route.params,
      } as never}
    />
  );
}

export function TeacherClassStudentOverviewScreen({ navigation, route }: ClassStudentOverviewProps) {
  const { classId, studentId } = route.params;
  const [overview, setOverview] = useState<TeacherClassStudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOverview(await classesApi.getStudentOverviewForClass(classId, studentId));
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
      subtitle={overview?.classInfo.sectionLabel || "Class student profile, grades, and assessment history."}
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
              { label: "Overall", value: toPercent(overview.standing.overallGradePercent), tone: "blue" },
              { label: "Finished", value: history?.finished.length ?? 0, tone: "green" },
              { label: "Late", value: history?.late.length ?? 0, tone: "amber" },
              { label: "Pending", value: history?.pending.length ?? 0, tone: "red" },
            ]}
          />
          <TeacherPanel title="Standing" subtitle={overview.classInfo.subjectName || overview.classInfo.subjectCode || "Class standing"}>
            <TeacherRow title="Status" subtitle={stringifyStatus(overview.student.status)} />
            <TeacherRow title="LRN" subtitle={overview.student.profile?.lrn || "N/A"} />
            <TeacherRow title="Written work" subtitle={toPercent(overview.standing.components.writtenWorkPercent)} />
            <TeacherRow title="Performance task" subtitle={toPercent(overview.standing.components.performanceTaskPercent)} />
            <TeacherRow title="Quarterly exam" subtitle={toPercent(overview.standing.components.quarterlyExamPercent)} />
          </TeacherPanel>
          <TeacherPanel title="Assessment history" subtitle="Finished, late, and pending work are separated like the web overview.">
            {(["finished", "late", "pending"] as const).map((group) => (
              <View key={group} style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ paddingHorizontal: 14, paddingTop: 12, fontSize: 12, fontWeight: "800", color: theme.red, textTransform: "capitalize" }}>
                  {group}
                </Text>
                {(history?.[group] ?? []).length ? (
                  history?.[group].map((item) => (
                    <TeacherRow
                      key={`${group}-${item.assessmentId}`}
                      title={item.title}
                      subtitle={`${item.statusLabel} | ${item.score ?? "--"}/${item.totalPoints ?? "--"}`}
                    />
                  ))
                ) : (
                  <TeacherRow title="No records" subtitle={`No ${group} assessment records.`} />
                )}
              </View>
            ))}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title={error ? "Student overview unavailable" : "Loading"} subtitle={error || "Loading student overview."}>
          <TeacherEmpty title={error ? "Unable to load" : "Loading"} subtitle={error || "Pull to refresh if this takes too long."} />
        </TeacherPanel>
      )}
    </TeacherScreen>
  );
}

export function TeacherClassAddStudentsScreen({ navigation, route }: ClassAddStudentsProps) {
  const { classId } = route.params;
  const [gradeLevel, setGradeLevel] = useState("");
  const [search, setSearch] = useState("");
  const [eligibility, setEligibility] = useState<"all" | "eligible" | "mismatch">("eligible");
  const [students, setStudents] = useState<StudentMasterlistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [classLabel, setClassLabel] = useState("Class");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const classItem = await classesApi.getById(classId);
      const resolvedGrade = gradeLevel || classItem.section?.gradeLevel || classItem.subjectGradeLevel || "";
      setClassLabel(`${classItem.subjectCode} | ${classItem.subjectName}`);
      if (!gradeLevel && resolvedGrade) setGradeLevel(resolvedGrade);
      if (!resolvedGrade) {
        setStudents([]);
        return;
      }
      const response = await classesApi.getStudentsMasterlist(classId, {
        gradeLevel: resolvedGrade,
        search: search.trim() || undefined,
        eligibility,
        prioritizeEligible: true,
        page: 1,
        limit: 50,
      });
      setStudents(response.data);
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
    const eligibleIds = selectedIds.filter((id) => students.some((student) => student.id === id && student.isEligible));
    if (!eligibleIds.length) {
      Alert.alert("Select students", "Select at least one eligible student.");
      return;
    }
    try {
      setAdding(true);
      await Promise.all(eligibleIds.map((id) => classesApi.enrollStudent(classId, { studentId: id })));
      Alert.alert("Students added", `${eligibleIds.length} student(s) were added.`);
      navigation.navigate("TeacherClassDetail", { classId, initialTab: "students" });
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
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search masterlist" />
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["all", "eligible", "mismatch"] as const).map((value) => (
          <TeacherChip key={value} label={value} active={eligibility === value} onPress={() => setEligibility(value)} />
        ))}
      </View>
      <TeacherPanel
        title="Eligible students"
        subtitle={`Selected ${selectedIds.length}. This uses the same class masterlist and enrollment endpoint as web.`}
        action={<TeacherActionButton label={adding ? "Adding..." : "Add selected"} icon="account-plus-outline" tone="green" disabled={adding} onPress={() => void addSelected()} />}
      >
        {students.length ? (
          students.map((student) => {
            const selected = selectedIds.includes(student.id);
            return (
              <TeacherRow
                key={student.id}
                title={formatName(student)}
                subtitle={student.isEligible ? student.email || "Eligible" : student.disabledReason || "Not eligible"}
                onPress={() => navigation.navigate("TeacherClassStudentOverview", { classId, studentId: student.id })}
                right={
                  <Pressable
                    disabled={!student.isEligible}
                    onPress={() =>
                      setSelectedIds((current) =>
                        current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id],
                      )
                    }
                    style={{
                      opacity: student.isEligible ? 1 : 0.45,
                      borderRadius: 8,
                      backgroundColor: selected ? theme.greenSoft : theme.blueSoft,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: selected ? theme.green : theme.blue }}>
                      {selected ? "Selected" : "Select"}
                    </Text>
                  </Pressable>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty title="No students found" subtitle="Adjust search or eligibility filters, then refresh." icon="account-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherSectionAddStudentsScreen({ navigation, route }: SectionAddStudentsProps) {
  const { sectionId } = route.params;
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; firstName?: string; lastName?: string; email?: string; isEligible?: boolean; eligibilityReason?: string | null }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sectionName, setSectionName] = useState("Section");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [section, candidates] = await Promise.all([
        sectionsApi.getById(sectionId),
        sectionsApi.getCandidates(sectionId, search),
      ]);
      setSectionName(section.name);
      setStudents(candidates);
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
      await sectionsApi.addStudents(sectionId, selectedIds);
      Alert.alert("Students added", `${selectedIds.length} student(s) were added to the section.`);
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
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search section candidates" />
      <TeacherPanel
        title="Candidates"
        subtitle={`Selected ${selectedIds.length}. Section add uses the same roster endpoint as web.`}
        action={<TeacherActionButton label="Add selected" icon="account-multiple-plus-outline" tone="green" disabled={!selectedIds.length} onPress={() => void addSelected()} />}
      >
        {students.length ? (
          students.map((student) => {
            const selected = selectedIds.includes(student.id);
            const eligible = student.isEligible ?? !student.eligibilityReason;
            return (
              <TeacherRow
                key={student.id}
                title={formatName(student)}
                subtitle={eligible ? student.email || "Eligible" : student.eligibilityReason || "Not eligible"}
                right={
                  <TeacherChip
                    label={selected ? "Selected" : "Select"}
                    active={selected}
                    onPress={() => {
                      if (!eligible) return;
                      setSelectedIds((current) =>
                        current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id],
                      );
                    }}
                  />
                }
              />
            );
          })
        ) : (
          <TeacherEmpty title="No candidates" subtitle="No available student matches the current search." icon="account-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherSectionStudentProfileScreen({ navigation, route }: SectionStudentProfileProps) {
  const { sectionId, studentId } = route.params;
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof sectionsApi.getStudentProfileForSection>> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProfile(await sectionsApi.getStudentProfileForSection(sectionId, studentId));
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
          <TeacherPanel title="Profile" subtitle="Teacher-visible profile fields for this section.">
            <TeacherRow title="Email" subtitle={profile.student.email || "N/A"} />
            <TeacherRow title="LRN" subtitle={profile.student.profile?.lrn || "N/A"} />
            <TeacherRow title="Grade level" subtitle={profile.student.profile?.gradeLevel || profile.section.gradeLevel || "N/A"} />
            <TeacherRow title="Phone" subtitle={profile.student.profile?.phone || "N/A"} />
            <TeacherRow title="Address" subtitle={profile.student.profile?.address || "N/A"} />
          </TeacherPanel>
          <TeacherPanel title="Class enrollments" subtitle="Classes linked to this section student.">
            {profile.enrollments?.length ? (
              profile.enrollments.map((entry) => (
                <TeacherRow
                  key={entry.id}
                  title={entry.class?.subjectName || entry.class?.subjectCode || "Section enrollment"}
                  subtitle={`${stringifyStatus(entry.status)} | ${entry.enrolledAt || "No date"}`}
                />
              ))
            ) : (
              <TeacherEmpty title="No class enrollments" subtitle="Only the section enrollment is currently visible." />
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Profile unavailable" subtitle="Pull to refresh after the profile endpoint responds." />
      )}
    </TeacherScreen>
  );
}

export function TeacherExtractionDetailScreen({ navigation, route }: ExtractionDetailProps) {
  const { extractionId, classId } = route.params;
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await extractionsApi.getById(extractionId);
      setExtraction(data);
      setTitle(data.structuredContent?.title || data.originalName || "Extraction");
      setDescription(data.structuredContent?.description || "");
    } catch (error) {
      Alert.alert("Unable to load extraction", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!extraction?.structuredContent) return;
    try {
      setSaving(true);
      await extractionsApi.update(extraction.id, {
        title,
        description,
        sections: extraction.structuredContent.sections,
        mediaAssets: extraction.structuredContent.mediaAssets,
      });
      await load();
    } catch (error) {
      Alert.alert("Unable to save extraction", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const applyExtraction = async () => {
    if (!extraction) return;
    try {
      await extractionsApi.apply(extraction.id);
      Alert.alert("Extraction applied", "Generated lessons and assessments were applied.");
      if (classId || extraction.classId) {
        navigation.navigate("TeacherClassDetail", { classId: classId || extraction.classId, initialTab: "modules" });
      }
    } catch (error) {
      Alert.alert("Unable to apply extraction", getErrorMessage(error));
    }
  };

  const deleteExtraction = async () => {
    if (!extraction) return;
    try {
      await extractionsApi.delete(extraction.id);
      Alert.alert("Extraction deleted", "The extraction record was deleted.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Unable to delete extraction", getErrorMessage(error));
    }
  };

  const sections = extraction?.structuredContent?.sections ?? [];

  return (
    <TeacherScreen
      title={title || "Extraction detail"}
      subtitle={`${stringifyStatus(extraction?.extractionStatus)} | ${extraction?.progressPercent ?? 0}%`}
      icon="file-document-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherStats
        items={[
          { label: "Sections", value: sections.length, tone: "blue" },
          { label: "Progress", value: `${extraction?.progressPercent ?? 0}%`, tone: "amber" },
          { label: "Applied", value: extraction?.isApplied ? "Yes" : "No", tone: extraction?.isApplied ? "green" : "red" },
        ]}
      />
      <TeacherPanel title="Review fields" subtitle="Edit extraction title and summary before applying generated content.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label={saving ? "Saving..." : "Save"} icon="content-save-outline" tone="blue" disabled={saving || !extraction?.structuredContent} onPress={() => void save()} />
            <TeacherActionButton label="Apply extraction" icon="check-decagram-outline" tone="green" disabled={!extraction || extraction.qualityGate === "fail"} onPress={() => void applyExtraction()} />
            <TeacherActionButton label="Delete" icon="trash-can-outline" tone="red" disabled={!extraction} onPress={() => void deleteExtraction()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generated sections" subtitle="The mobile view keeps text-first review of generated lesson sections and assessment drafts.">
        {sections.length ? (
          sections.map((section: ExtractionSection, index) => (
            <TeacherRow
              key={`${section.title}-${index}`}
              title={section.title || `Section ${index + 1}`}
              subtitle={`${section.lessonBlocks?.length ?? 0} block(s) | ${section.assessmentDraft?.questions?.length ?? 0} question(s) | confidence ${section.confidence ?? "N/A"}`}
            />
          ))
        ) : (
          <TeacherEmpty title="No generated content" subtitle="Refresh after extraction processing completes." icon="file-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherModuleFileDetailScreen({ navigation, route }: ModuleFileDetailProps) {
  const { classId, moduleId, fileId, itemId } = route.params;
  const [fileName, setFileName] = useState("");
  const [fileRecord, setFileRecord] = useState<Awaited<ReturnType<typeof fileUploadApi.getById>> | null>(null);
  const [moduleItem, setModuleItem] = useState<ModuleItem | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [file, module] = await Promise.all([
        fileUploadApi.getById(fileId),
        modulesApi.getByClassAndModule(classId, moduleId),
      ]);
      const item = module.sections
        .flatMap((section) => section.items)
        .find((entry) => entry.id === itemId || entry.fileId === fileId) || null;
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
      Alert.alert("File block removed", "The file block was removed from this module.");
      navigation.navigate("TeacherModuleDetail", { classId, moduleId });
    } catch (error) {
      Alert.alert("Unable to remove block", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title={fileRecord?.originalName || "Module file"}
      subtitle={fileRecord?.mimeType || "File detail and mobile download controls."}
      icon="file-pdf-box"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherPanel title="File details" subtitle="Rename, open, download, or remove this file block from its module.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Display name" value={fileName} onChangeText={setFileName} />
          <TeacherRow title="Size" subtitle={fileRecord?.sizeBytes ? `${Math.round(fileRecord.sizeBytes / 1024)} KB` : "N/A"} />
          <TeacherRow title="Scope" subtitle={fileRecord?.scope || "private"} />
          <TeacherRow title="Visible in module" subtitle={moduleItem?.isVisible === false ? "Hidden" : "Visible"} />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label="Save name" icon="content-save-outline" tone="blue" onPress={() => void saveName()} />
            <TeacherActionButton label="Open" icon="open-in-new" tone="green" onPress={() => void fileUploadApi.open(fileId, fileName || "module-file")} />
            <TeacherActionButton label="Download" icon="download-outline" tone="neutral" onPress={() => void fileUploadApi.download(fileId, fileName || "module-file")} />
            <TeacherActionButton label="Remove block" icon="trash-can-outline" tone="red" disabled={!moduleItem} onPress={() => void removeBlock()} />
          </View>
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherLessonEditorScreen({ navigation, route }: LessonEditorProps) {
  const { lessonId, classId } = route.params;
  const [lesson, setLesson] = useState<Awaited<ReturnType<typeof lessonsApi.getById>> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newBlock, setNewBlock] = useState("");
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
      await lessonsApi.update(lessonId, { title: title.trim(), description: description.trim() });
      await load();
    } catch (error) {
      Alert.alert("Unable to save lesson", getErrorMessage(error));
    }
  };

  const addTextBlock = async () => {
    if (!lesson || !newBlock.trim()) return;
    try {
      await lessonsApi.createBlock(lesson.id, {
        type: "text",
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
        await lessonsApi.setDraftState(classId || lesson.classId, { lessonIds: [lesson.id], isDraft: true });
      }
      await load();
    } catch (error) {
      Alert.alert("Unable to change lesson status", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title={lesson?.title || "Lesson editor"}
      subtitle="Mobile lesson editing for details, publish state, and text blocks."
      icon="notebook-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherPanel title="Lesson details" subtitle="Edit the same title and description fields used on the web editor.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label="Save details" icon="content-save-outline" tone="blue" onPress={() => void saveDetails()} />
            <TeacherActionButton label={lesson?.isDraft ? "Publish" : "Move to draft"} icon="publish" tone={lesson?.isDraft ? "green" : "amber"} disabled={!lesson} onPress={() => void togglePublish()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Add text block" subtitle="Mobile authoring keeps the safest common block type available.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Text block" value={newBlock} onChangeText={setNewBlock} multiline />
          <View style={{ marginTop: 12 }}>
            <TeacherActionButton label="Add block" icon="plus" tone="green" disabled={!newBlock.trim()} onPress={() => void addTextBlock()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Content blocks" subtitle="Review, edit text-like blocks, or remove blocks.">
        {lesson?.contentBlocks?.length ? (
          lesson.contentBlocks.map((block, index) => {
            const text = extractLessonBlockText(block);
            return (
              <View key={block.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.red }}>
                  {block.type} | Block {index + 1}
                </Text>
                <TextInput
                  multiline
                  value={text}
                  onChangeText={(value) => {
                    setLesson((current) =>
                      current
                        ? {
                            ...current,
                            contentBlocks: current.contentBlocks?.map((entry) =>
                              entry.id === block.id ? { ...entry, content: value } : entry,
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
                <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <TeacherActionButton label="Save block" tone="blue" onPress={() => void saveBlockText(block.id, extractLessonBlockText(block))} />
                  <TeacherActionButton label="Delete" tone="red" onPress={() => void deleteBlock(block.id)} />
                </View>
              </View>
            );
          })
        ) : (
          <TeacherEmpty title="No content blocks" subtitle="Add a text block to start mobile authoring." />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherAiDraftScreen({ navigation, route }: AiDraftProps) {
  const { classId } = route.params;
  const [indexStatus, setIndexStatus] = useState<Awaited<ReturnType<typeof aiApi.getClassIndexStatus>> | null>(null);
  const [job, setJob] = useState<Awaited<ReturnType<typeof aiApi.createQuizDraftJob>> | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof aiApi.getQuizDraftJobResult>> | null>(null);
  const [title, setTitle] = useState("AI Draft Assessment");
  const [questionCount, setQuestionCount] = useState("10");
  const [teacherNote, setTeacherNote] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setIndexStatus(await aiApi.getClassIndexStatus(classId));
    } catch (error) {
      Alert.alert("Unable to load AI readiness", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const refreshJob = async () => {
    if (!job?.id) return;
    try {
      const nextJob = await aiApi.getTeacherJobStatus(job.id);
      setJob(nextJob);
      if (nextJob.status === "completed") {
        setResult(await aiApi.getQuizDraftJobResult(nextJob.id));
      }
    } catch (error) {
      Alert.alert("Unable to refresh job", getErrorMessage(error));
    }
  };

  const createJob = async () => {
    try {
      const created = await aiApi.createQuizDraftJob({
        classId,
        title: title.trim() || "AI Draft Assessment",
        questionCount: Number.parseInt(questionCount, 10) || 10,
        teacherNote: teacherNote.trim() || undefined,
        useAllReadySources: true,
      });
      setJob(created);
      setResult(null);
    } catch (error) {
      Alert.alert("Unable to create AI draft", getErrorMessage(error));
    }
  };

  const deleteJob = async () => {
    if (!job?.id) return;
    try {
      await aiApi.deleteTeacherJob(job.id);
      setJob(null);
      setResult(null);
    } catch (error) {
      Alert.alert("Unable to delete job", getErrorMessage(error));
    }
  };

  const outputId = job?.outputId || result?.result?.outputId;
  const questionTotal = result?.result?.structuredOutput?.questions?.length ?? 0;

  return (
    <TeacherScreen
      title="AI Draft"
      subtitle="Mobile source readiness, class reindexing, AI quiz draft jobs, and generated assessment handoff."
      icon="robot-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void loadStatus()}
    >
      <TeacherStats
        items={[
          { label: "Ready lessons", value: indexStatus?.sourceSummary?.lessons?.ready ?? 0, tone: "green" },
          { label: "Ready extracts", value: indexStatus?.sourceSummary?.extractions?.ready ?? 0, tone: "blue" },
          { label: "Job", value: job?.status || "None", tone: job?.status === "failed" ? "red" : "amber" },
          { label: "Questions", value: questionTotal, tone: "purple" },
        ]}
      />
      <TeacherPanel title="Sources" subtitle="Readiness uses the same class index status and reindex endpoint as the web AI draft page.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Refresh status" icon="refresh" tone="blue" onPress={() => void loadStatus()} />
          <TeacherActionButton label="Reindex class" icon="database-refresh-outline" tone="amber" onPress={() => void aiApi.reindexClass(classId).then(loadStatus).catch((error) => Alert.alert("Unable to reindex", getErrorMessage(error)))} />
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generate quiz draft" subtitle="Creates a teacher AI quiz draft job from ready class sources.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Question count" value={questionCount} onChangeText={setQuestionCount} />
          <TeacherInlineField label="Teacher note" value={teacherNote} onChangeText={setTeacherNote} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label="Generate" icon="auto-fix" tone="green" onPress={() => void createJob()} />
            <TeacherActionButton label="Refresh job" icon="refresh" tone="blue" disabled={!job} onPress={() => void refreshJob()} />
            <TeacherActionButton label="Delete job" icon="trash-can-outline" tone="red" disabled={!job} onPress={() => void deleteJob()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generated result" subtitle={job?.message || job?.errorMessage || "Refresh after the job completes."}>
        {result?.result?.structuredOutput ? (
          <>
            <TeacherRow title={result.result.structuredOutput.title || "AI draft"} subtitle={stripRichText(result.result.structuredOutput.description || "Generated quiz draft")} />
            {(result.result.structuredOutput.questions ?? []).slice(0, 8).map((question, index) => (
              <TeacherRow key={`${question.content}-${index}`} title={`Question ${index + 1}`} subtitle={stripRichText(question.content || "No question text")} />
            ))}
          </>
        ) : (
          <TeacherEmpty title="No result loaded" subtitle="Generate a job, then refresh until a result is available." icon="robot-confused-outline" />
        )}
        {outputId ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherActionButton
              label="Open generated assessment"
              icon="clipboard-edit-outline"
              tone="green"
              onPress={() => navigation.navigate("TeacherAssessmentEditor", { assessmentId: outputId, classId })}
            />
          </View>
        ) : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}

export function TeacherInterventionDetailScreen({ navigation, route }: InterventionDetailProps) {
  const { caseId, classId } = route.params;
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof lxpApi.getTeacherCaseDetail>> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDetail(await lxpApi.getTeacherCaseDetail(caseId));
    } catch (error) {
      Alert.alert("Unable to load intervention", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const caseRecord = detail?.case;

  const runAction = async (action: "activate" | "regenerate") => {
    try {
      if (action === "activate") await lxpApi.activateIntervention(caseId);
      if (action === "regenerate") await lxpApi.regenerateInterventionPath(caseId);
      await load();
    } catch (error) {
      Alert.alert("Unable to update intervention", getErrorMessage(error));
    }
  };

  return (
    <TeacherScreen
      title={detail?.student ? formatName(detail.student) : "Intervention detail"}
      subtitle={caseRecord?.status || "Teacher intervention case workspace."}
      icon="account-alert-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherStats
        items={[
          { label: "Trigger", value: caseRecord?.triggerScore ?? "N/A", tone: "red" },
          { label: "Threshold", value: caseRecord?.thresholdApplied ?? "N/A", tone: "amber" },
          { label: "Progress", value: `${detail?.progress?.completionPercent ?? 0}%`, tone: "green" },
        ]}
      />
      <TeacherPanel title="Case actions" subtitle="Mobile exposes the same detail action lane for activate/regenerate and class navigation.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Activate" icon="play-circle-outline" tone="green" onPress={() => void runAction("activate")} />
          <TeacherActionButton label="Regenerate path" icon="refresh" tone="amber" onPress={() => void runAction("regenerate")} />
          <TeacherActionButton
            label="Open class"
            icon="google-classroom"
            tone="blue"
            disabled={!classId && !caseRecord?.classId}
            onPress={() => navigation.navigate("TeacherClassDetail", { classId: classId || caseRecord?.classId || "", initialTab: "students" })}
          />
        </View>
      </TeacherPanel>
      <TeacherPanel title="Assigned path" subtitle="Teacher-visible lessons, assessments, and generated artifacts for this case.">
        {detail?.assignments?.length ? (
          detail.assignments.map((assignment, index) => (
            <TeacherRow
              key={assignment.assignmentId || assignment.id || `${index}`}
              title={assignment.label || assignment.lesson?.title || assignment.assessment?.title || "Intervention checkpoint"}
              subtitle={`${assignment.type || "checkpoint"} | ${assignment.status || "pending"} | XP ${assignment.xpAwarded ?? 0}`}
            />
          ))
        ) : (
          <TeacherEmpty title="No assigned path yet" subtitle="Use regenerate or web AI Plan when a full generated plan is needed." icon="playlist-plus" />
        )}
      </TeacherPanel>
      <TeacherPanel title="Generated artifacts" subtitle="Review generated lesson or guided assessment artifact status.">
        {detail?.generatedArtifacts?.length ? (
          detail.generatedArtifacts.map((artifact, index) => (
            <TeacherRow key={artifact.id || `${index}`} title={artifact.title || artifact.type || "Generated artifact"} subtitle={artifact.status || "pending"} />
          ))
        ) : (
          <TeacherEmpty title="No generated artifacts" subtitle="Generated remedial content will appear here when present." icon="file-star-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
